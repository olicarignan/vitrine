"use client";

import {
  forwardRef,
  memo,
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
} from "react";
import { motion } from "motion/react";
import { SliderItemMedia } from "../SliderItemMedia";
import { itemFadeIn } from "../animation";

/**
 * One track panel. Memoised on purpose: the active index changes on nearly
 * every frame of a scroll, and without this each change re-renders all
 * `sets * n` panels through Motion — 50 of them at the looping coverflow
 * default. That is enough main-thread work per frame to starve the scroll
 * handler during a fling. Only the two panels whose `isActive` actually
 * flipped re-render now.
 */
const TrackItem = memo(function TrackItem({
  item,
  pos,
  index,
  clone,
  isActive,
  interactive,
  itemCursor,
  itemWidth,
  itemHeight,
  sizes,
  video,
  videoControls,
  onActivate,
}) {
  return (
    <motion.div
      data-clone={clone ? "" : undefined}
      className={`slider__item${isActive ? " slider__item--active" : ""}`}
      // Clones skip the mount stagger (they'd push the real items' fade
      // far down the stagger order) and stay out of the a11y tree.
      variants={clone ? undefined : itemFadeIn}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? item.title : undefined}
      aria-hidden={clone ? true : undefined}
      style={{
        "--item-max-w": `${itemWidth}px`,
        "--item-max-h": `${itemHeight}px`,
        cursor: itemCursor,
      }}
      onClick={() => onActivate(pos, false)}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate(pos, true);
              }
            }
          : undefined
      }
    >
      <div className="slider__item-inner">
        <SliderItemMedia
          item={item}
          index={index}
          sizes={sizes}
          // No <video> on clones — one autoplaying element per item.
          video={video && !clone}
          videoControls={videoControls}
          isActive={isActive}
        />
      </div>
    </motion.div>
  );
});

/**
 * The default track engine: a horizontal scroll-snap row with pointer drag,
 * JS inertia, and (on mobile) centered snap with depth scaling. This is the
 * original <Slider> carousel, extracted behind the track contract so the stack
 * and coverflow variants can swap in.
 *
 * Imperative contract (via ref), shared by all track variants:
 * - `goTo(index, { external })` — navigate to an item; `external` suppresses
 *   active-index detection while the scroll settles (lightbox sync).
 * - `park(index)` — instant positioning for the lightbox close: returns
 *   `{ apply, release }` where `apply()` snaps the item into the active slot
 *   and a scroll listener holds it there until `release()`.
 * - `getItemEls()` — the `.slider__item` elements in item-array order.
 *
 * Coverflow reuses this engine via `mode="coverflow"`: uniform cover-cropped
 * boxes, center-aligned snap/detection at all breakpoints, and a `projector`
 * callback that writes the per-item 3D transforms inside the same rAF the
 * scroll handler already batches into.
 */
export const RowTrack = forwardRef(function RowTrack(
  {
    items,
    activeIndex,
    contentWidth,
    gap,
    columns,
    metaOffsetColumns,
    sideMargin,
    maxItemHeight,
    // Force a fixed cover-cropped box of this width/height ratio (number, w/h).
    // null → natural height (row) or the coverflow default box.
    aspectRatio,
    sizes,
    videoControls,
    itemsClickable,
    itemCursor,
    onActiveIndexChange,
    onItemOpen,
    // When true (the lightbox is enabled) a click on a non-active item scrolls
    // it into the active slot and then opens it; when false, centering the
    // clicked panel is the whole interaction.
    openOnSettle,
    onLayoutChange,
    // "row" (default) or "coverflow" (uniform centered boxes + projector).
    mode = "row",
    // Coverflow only: writes the 3D transforms. Called inside the scroll rAF
    // with ({ itemEls, slotTargets, widths, scroll, vw, lo, hi }); an item's
    // signed offset from the slot centre is `slotTargets[i] - scroll`.
    projector,
    // Extra modifier class on the track element (e.g. "slider__track--coverflow").
    trackClassName,
    // Coverflow only: no videos in the track, posters only.
    video = true,
    // Endless scroll: the array loops. Resolved by <Slider> (coverflow
    // defaults on, row off).
    loop = false,
  },
  ref,
) {
  const trackRef = useRef(null);
  // Mirror of the prop, so the per-panel callbacks can stay referentially
  // stable across active-index changes (see handleItemClick).
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });
  const dragDistRef = useRef(0);
  const externalScroll = useRef(false);
  const scrollTimer = useRef(null);
  const scrollRafTicking = useRef(false);
  const [layout, setLayout] = useState({
    inset: 0,
    itemWidth: 0,
    itemHeight: 0,
    metaInset: 0,
    metaInsetRight: 0,
    endPad: 0,
    isMobile: false,
    centered: false,
  });
  const centered = mode === "coverflow";

  /* Endless scroll (`loop`): whole sets of the items are cloned on both sides
     of the real set. While scrolling, the position teleports by one set-span
     whenever it drifts past the window around the real set — the sets are
     pixel-identical, so the jump is invisible. Whenever scrolling settles the
     position is normalized back onto the real set, so at rest the centered
     element is always a real item and clicks, shared-element zooms, and
     `park()` never target a clone. */
  const n = items.length;
  /* Three sets per side, not two. Under wheel/momentum scrolling the compositor
     owns the scroll offset and reverts our teleports (see handleScroll), so
     between settles it is the runway — not the teleport — that has to absorb a
     fling. Two sets left barely a span of headroom past the teleport window and
     a hard flick could reach the end and stop dead; small arrays get more. */
  const copies = loop && n > 0 ? Math.max(3, Math.ceil(12 / n)) : 0;
  const sets = 2 * copies + 1;
  // True while a native smooth scroll (scrollIntoView) is in flight: the
  // browser animates toward an absolute position, so teleporting the scroll
  // under it would make it visibly rewind. Jumps wait; the settle normalizes.
  const smoothRef = useRef(false);
  const smoothTimer = useRef(null);
  const idleTimer = useRef(null);
  /* True while the browser owns the scroll position. Under a wheel/momentum
     sequence the compositor holds the authoritative offset: a teleport written
     from the main thread lands (the getter even reports it back, snapped to the
     nearest snap point) and is then reverted on the very next frame. The
     position is outside the loop window again, so we teleport again, every
     frame, for the whole tail of the fling — the track renders at offsets a
     whole set apart frame to frame, which is the flicker, and the caption
     cannot keep up.

     Rather than guess at engine behaviour we check whether the write survived,
     one frame later (see handleScroll), and back off until the scroll stops. */
  const browserDrivenRef = useRef(false);
  // True once we have observed the compositor revert a teleport written under a
  // wheel/momentum scroll. It is a platform trait, not a transient state, so it
  // is never cleared: after the first probe we simply stop writing under wheel
  // scrolling and let the clone runway carry the fling to its settle.
  const wheelRejectedRef = useRef(false);
  const lastTeleportAtRef = useRef(0);
  // True while our own JS inertia is driving the scroll frame by frame.
  const inertiaRef = useRef(false);

  useEffect(() => {
    const measure = () => {
      const vw = window.innerWidth;
      const isDesktop = window.matchMedia("(min-width: 700px)").matches;

      // Align to the host grid's content column when present (a `.subgrid` inside
      // a `.grid`); otherwise fall back to the prop-driven content width so the
      // component still works standalone.
      const subgrid = document.querySelector(".subgrid");
      const gridEl = subgrid?.closest(".grid") || document.querySelector(".grid");

      if (centered) {
        // Coverflow: a uniform cover-cropped box, centered in the viewport with
        // equal runway both sides so every item — including first and last —
        // can snap to the center. The caption still aligns to the content
        // column like the row layout.
        let colLeft, colWidth, margin;
        if (subgrid && gridEl) {
          const r = subgrid.getBoundingClientRect();
          colLeft = r.left;
          colWidth = r.width;
          margin = isDesktop
            ? colLeft
            : r.left - gridEl.getBoundingClientRect().left;
        } else {
          colWidth = Math.min(contentWidth, vw - 2 * sideMargin);
          colLeft = (vw - colWidth) / 2;
          margin = isDesktop ? colLeft : sideMargin;
        }
        let boxW = isDesktop
          ? Math.round(Math.min(contentWidth * 0.62, vw - 2 * sideMargin))
          : vw - 2 * margin;
        // Coverflow always uses a fixed box. Default ≈ 3:4 (height =
        // maxItemHeight on desktop); `aspectRatio` overrides it, shrinking the
        // width for tall ratios so the box keeps the requested ratio exactly.
        let boxH = isDesktop ? maxItemHeight : Math.round(boxW * 0.75);
        if (aspectRatio) {
          boxH = Math.round(boxW / aspectRatio);
          if (boxH > maxItemHeight) {
            boxH = maxItemHeight;
            boxW = Math.round(boxH * aspectRatio);
          }
        }
        const pad = Math.max((vw - boxW) / 2, 0);
        setLayout({
          inset: pad,
          itemWidth: boxW,
          itemHeight: boxH,
          metaInset: isDesktop ? colLeft : margin,
          metaInsetRight: isDesktop ? colLeft : margin,
          endPad: pad,
          isMobile: !isDesktop,
          centered: true,
        });
        return;
      }

      if (isDesktop) {
        let colLeft, colWidth, cols, colGap;
        if (subgrid && gridEl) {
          const r = subgrid.getBoundingClientRect();
          colLeft = r.left;
          colWidth = r.width;
          cols =
            parseInt(getComputedStyle(gridEl).getPropertyValue("--columns"), 10) ||
            columns;
          colGap = parseFloat(getComputedStyle(subgrid).columnGap) || gap;
        } else {
          colWidth = Math.min(contentWidth, vw - 2 * sideMargin);
          colLeft = (vw - colWidth) / 2;
          cols = columns;
          colGap = gap;
        }
        const oneCol = (colWidth - (cols - 1) * colGap) / cols;
        // 12px overhang each side so the active panel breathes past the column.
        const inset = colLeft - 12;
        // Natural height by default; `aspectRatio` forces a cover-cropped box
        // sized to the ratio, bounded by maxItemHeight (width shrinks to keep
        // the ratio when the height would exceed it).
        let boxW = colWidth + 24;
        let boxH = 0;
        if (aspectRatio) {
          boxW = colWidth;
          boxH = Math.round(boxW / aspectRatio);
          if (boxH > maxItemHeight) {
            boxH = maxItemHeight;
            boxW = Math.round(boxH * aspectRatio);
          }
        }
        // Trailing room so the last panel can scroll to the slot — and no
        // further. Panels are `fit-content`, so the width that matters is the
        // last one's actual laid-out width; `boxW` (its cap) is the best guess
        // before the first paint, and the observer below corrects it after.
        const lastEl = trackRef.current?.querySelector(
          ".slider__item:last-child",
        );
        setLayout({
          inset,
          itemWidth: boxW,
          itemHeight: boxH,
          // Caption aligns to the active panel's left edge, plus an optional indent.
          metaInset: inset + metaOffsetColumns * (oneCol + colGap),
          metaInsetRight: inset,
          endPad: Math.max(0, vw - inset - (lastEl?.offsetWidth || boxW)),
          isMobile: false,
          centered: false,
          fixedAspect: Boolean(aspectRatio),
        });
      } else {
        // Mobile: the panel spans the full content width (viewport minus the grid's
        // edge gutter), whatever the aspect ratio; the caption pins to its left.
        let margin;
        if (subgrid && gridEl) {
          margin =
            subgrid.getBoundingClientRect().left -
            gridEl.getBoundingClientRect().left;
        } else {
          margin = sideMargin;
        }
        let boxW = vw - 2 * margin;
        let boxH = 0;
        if (aspectRatio) {
          boxH = Math.round(boxW / aspectRatio);
          if (boxH > maxItemHeight) {
            boxH = maxItemHeight;
            boxW = Math.round(boxH * aspectRatio);
          }
        }
        setLayout({
          inset: margin,
          itemWidth: boxW,
          itemHeight: boxH,
          metaInset: margin,
          metaInsetRight: margin,
          endPad: margin,
          isMobile: true,
          centered: false,
          fixedAspect: Boolean(aspectRatio),
        });
      }
    };

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 100);
    };

    measure();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
  }, [contentWidth, gap, columns, metaOffsetColumns, sideMargin, maxItemHeight, aspectRatio, centered]);

  /* Desktop row only: keep the trailing pad at exactly the room the last panel
     needs to reach the slot. Too much and the track scrolls past it into empty
     space — a phantom slot after the last item. The panel is `fit-content`, so
     its width lands late (image decode, font/layout settle) and can change
     without a resize event; the observer re-syncs when it does. The centered
     modes (mobile, coverflow) pad by half the leftover viewport instead, which
     is exact by construction, so they skip this. */
  useEffect(() => {
    if (layout.centered || layout.isMobile) return;
    const track = trackRef.current;
    const itemEls = track?.querySelectorAll(".slider__item");
    const last = itemEls?.[itemEls.length - 1];
    if (!last) return;

    const sync = () => {
      const endPad = Math.max(
        0,
        window.innerWidth - layout.inset - last.offsetWidth,
      );
      setLayout((prev) =>
        prev.endPad === endPad || prev.centered || prev.isMobile
          ? prev
          : { ...prev, endPad },
      );
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(last);
    return () => ro.disconnect();
  }, [
    layout.centered,
    layout.isMobile,
    layout.inset,
    layout.itemWidth,
    layout.itemHeight,
    sets,
    n,
  ]);

  // The meta caption (rendered by the orchestrator) aligns to this layout.
  useEffect(() => {
    onLayoutChange?.(layout);
  }, [layout, onLayoutChange]);

  // Centered modes (mobile, coverflow) snap items to the viewport center;
  // desktop row snaps their left edge to the content column.
  const snapInline = layout.centered || layout.isMobile ? "center" : "start";

  // The scrollLeft that puts an element in the active slot.
  const slotTargetFor = useCallback(
    (track, el) =>
      el.offsetLeft -
      (snapInline === "center"
        ? (track.clientWidth - el.offsetWidth) / 2
        : layout.inset),
    [snapInline, layout.inset],
  );

  /* Cached track geometry — `slotTargets[i]` is the scrollLeft that parks item
     i in the active slot, so an item's signed distance from the slot is just
     `slotTargets[i] - scrollLeft`. Every scroll-driven read (active item, loop
     teleport, normalize, the coverflow projector) reduces to that one
     subtraction: no getBoundingClientRect, no layout flush, no DOM query.

     This matters at fling speed. The scroll runs on the compositor, so it
     keeps moving at full rate while the main thread measures every box each
     frame and re-renders. Once the main thread falls behind, the caption
     freezes while the track visibly keeps going and the loop teleport starts
     firing against stale positions — the "stuck in a loop" glitch.

     The cache is rebuilt on any layout change and re-validated on every read,
     so a late-settling panel can't leave it stale. */
  const geomRef = useRef(null);

  const measureGeometry = useCallback(() => {
    const track = trackRef.current;
    if (!track) return null;
    const els = track.querySelectorAll(".slider__item");
    if (!els.length) return null;
    const count = els.length;
    const slotTargets = new Float64Array(count);
    const widths = new Float64Array(count);
    const half = track.clientWidth / 2;
    for (let i = 0; i < count; i++) {
      const w = els[i].offsetWidth;
      widths[i] = w;
      slotTargets[i] =
        snapInline === "center"
          ? els[i].offsetLeft + w / 2 - half
          : els[i].offsetLeft - layout.inset;
    }
    return { els, widths, slotTargets, count, scrollWidth: track.scrollWidth };
  }, [snapInline, layout.inset]);

  // Stamp the cache with the measure that produced it. `measureGeometry`'s
  // identity changes with `snapInline` and `layout.inset`, so a breakpoint
  // crossing invalidates on the next read instead of waiting for the
  // re-measure effect to commit.
  const remeasure = useCallback(() => {
    const fresh = measureGeometry();
    if (fresh) fresh.key = measureGeometry;
    geomRef.current = fresh;
    return fresh;
  }, [measureGeometry]);

  const getGeometry = useCallback(() => {
    const track = trackRef.current;
    if (!track) return null;
    const cached = geomRef.current;
    // Centered panels are a fixed `--item-max-w`, so count + key is enough to
    // know the cache still holds. Row panels are `fit-content` and settle late
    // (image decode, fonts), so those are validated against the track's own
    // scroll extent too — one read that moves whenever a panel's width does.
    if (
      cached &&
      cached.count === sets * n &&
      cached.key === measureGeometry &&
      (layout.centered || cached.scrollWidth === track.scrollWidth)
    ) {
      return cached;
    }
    return remeasure();
  }, [layout.centered, measureGeometry, remeasure, sets, n]);

  // Re-measure whenever the panels move: a layout pass, a resize, or a change
  // to the item set. Declared above the projector effect so the cache is warm
  // before the first projection runs.
  useEffect(() => {
    remeasure();
  }, [remeasure, layout, items, sets, n]);

  // The scroll geometry of one cloned set, for the loop teleport.
  const getLoopGeom = useCallback(() => {
    if (n === 0) return null;
    const geom = getGeometry();
    if (!geom || geom.count !== sets * n) return null;
    const span = geom.slotTargets[n] - geom.slotTargets[0];
    return span ? { geom, span, home: geom.slotTargets[copies * n] } : null;
  }, [getGeometry, sets, n, copies]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (!copies) {
      track.scrollLeft = 0;
      return;
    }
    // Loop: start on the real set (everything before it is clone runway).
    const el = track.querySelectorAll(".slider__item")[copies * n];
    if (el) track.scrollLeft = slotTargetFor(track, el);
  }, [layout.inset, copies, n, slotTargetFor]);

  const beginSmooth = useCallback(() => {
    smoothRef.current = true;
    clearTimeout(smoothTimer.current);
    smoothTimer.current = setTimeout(() => {
      smoothRef.current = false;
    }, 800);
  }, []);

  // Instantly re-seat the scroll on the real set — the shift is a multiple of
  // the set span, so the pixels don't change. Runs whenever scrolling settles.
  const normalize = useCallback(() => {
    const track = trackRef.current;
    if (!track || !copies || dragState.current.isDragging) return;
    const lg = getLoopGeom();
    if (!lg) return;
    const { geom, span } = lg;
    const s = track.scrollLeft;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < geom.count; i++) {
      const d = Math.abs(geom.slotTargets[i] - s);
      if (d < closestDist) {
        closestDist = d;
        closest = i;
      }
    }
    const set = Math.floor(closest / n);
    if (set !== copies) track.scrollLeft += (copies - set) * span;
    smoothRef.current = false;
  }, [copies, n, getLoopGeom]);

  /* No `scrollend` listener here on purpose. It fires for programmatic writes
     too, so re-seating on it meant every teleport triggered a normalize, which
     wrote the scroll again, which fired another scrollend. The settle timer in
     handleScroll (a gap in scroll events) is the only signal that the scroll
     has genuinely stopped. */

  /* A user gesture cancels any in-flight programmatic smooth scroll, so the
     teleport lockout has to lift with it. Without this, a fling started inside
     the 800ms `beginSmooth` window (right after a click, an arrow key, or the
     drag-inertia snap) runs with looping disabled: it eats the whole clone
     runway, slams into the hard end of the track, and then jumps when the
     lockout finally expires and the first teleport lands. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const interrupt = () => {
      // A user gesture cancels any in-flight programmatic smooth scroll, so
      // the teleport lockout has to lift with it.
      smoothRef.current = false;
      clearTimeout(smoothTimer.current);
    };
    track.addEventListener("wheel", interrupt, { passive: true });
    track.addEventListener("touchmove", interrupt, { passive: true });
    return () => {
      track.removeEventListener("wheel", interrupt);
      track.removeEventListener("touchmove", interrupt);
    };
  }, []);

  const scrollToIndex = useCallback(
    (index) => {
      const track = trackRef.current;
      if (!track || !layout.itemWidth) return;
      const itemEls = track.querySelectorAll(".slider__item");
      let el;
      if (copies) {
        // Loop: several copies of the target exist — travel to the nearest
        // one, so wrapping forward from the last item reaches the adjacent
        // clone of the first instead of rewinding a whole set.
        const real = ((index % n) + n) % n;
        let bestDist = Infinity;
        for (let s = 0; s < sets; s++) {
          const cand = itemEls[s * n + real];
          if (!cand) continue;
          const d = Math.abs(slotTargetFor(track, cand) - track.scrollLeft);
          if (d < bestDist) {
            bestDist = d;
            el = cand;
          }
        }
        if (el) beginSmooth();
      } else {
        el = itemEls[index];
      }
      if (!el) return;
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: snapInline,
      });
    },
    [layout.itemWidth, snapInline, copies, sets, n, slotTargetFor, beginSmooth],
  );

  const goTo = useCallback(
    (index, opts) => {
      // External navigation (lightbox sync): suppress active-index detection
      // until the smooth scroll settles, so the two don't fight.
      if (opts?.external) {
        externalScroll.current = true;
        clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => {
          externalScroll.current = false;
        }, 300);
      }
      scrollToIndex(index);
    },
    [scrollToIndex],
  );

  const updateMobileScales = useCallback((track) => {
    const itemEls = track.querySelectorAll(".slider__item");
    const center = window.innerWidth / 2;
    let closest = 0;
    let closestDist = Infinity;

    itemEls.forEach((item, i) => {
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.left + rect.width / 2;
      const dist = Math.abs(itemCenter - center);

      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }

      const halfItem = rect.width / 2;
      const edgeDist = Math.max(0, dist - halfItem);
      const norm = Math.min(edgeDist / (window.innerWidth * 0.3), 1);
      const inner = item.querySelector(".slider__item-inner");
      if (inner) {
        // Anchor the scale to the edge facing the viewport centre so a neighbour
        // keeps peeking by the same amount even as it shrinks.
        inner.style.transformOrigin =
          itemCenter < center ? "right center" : "left center";
        inner.style.transform = `scale(${1 - norm * 0.05})`;
        inner.style.filter = `brightness(${1 - norm * 0.15})`;
      }
    });

    return closest;
  }, []);

  // Coverflow: find the item nearest the viewport center and let the projector
  // write the 3D transforms — same rAF, transforms limited to the moving window
  // around the active item (the lightbox neighbor-dim pattern).
  const lastActiveRef = useRef(0);
  const updateProjection = useCallback(
    (track) => {
      const geom = getGeometry();
      if (!geom) return lastActiveRef.current;
      const { els, widths, slotTargets, count } = geom;
      const scroll = track.scrollLeft;

      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < count; i++) {
        const dist = Math.abs(slotTargets[i] - scroll);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }

      if (projector) {
        const lo = Math.max(0, Math.min(closest, lastActiveRef.current) - 3);
        const hi = Math.min(
          count - 1,
          Math.max(closest, lastActiveRef.current) + 3,
        );
        // `slotTargets[i] - scroll` is the item's signed distance from the
        // slot centre in px — the same number the old rect-based measure
        // produced, minus the per-frame layout flush. (It centres on the
        // scrollport rather than the window, which also matches where snap
        // and `park()` actually place items when the track isn't full-bleed.)
        projector({
          itemEls: els,
          slotTargets,
          widths,
          scroll,
          vw: window.innerWidth,
          lo,
          hi,
        });
      }
      lastActiveRef.current = closest;
      return closest;
    },
    [projector, getGeometry],
  );

  /* Only push a genuinely new index up. `onActiveIndexChange` is `setActiveIndex`
     in the orchestrator, and at fling speed the same panel stays nearest the
     slot for several frames — re-reporting it every frame is pure re-render
     churn on the main thread that the scroll is already competing with.
     Kept in sync with the committed prop below so external navigation
     (lightbox, arrows) can't leave this ref stale. */
  const reportedIndexRef = useRef(activeIndex);
  reportedIndexRef.current = activeIndex;
  const reportActive = useCallback(
    (index) => {
      if (reportedIndexRef.current === index) return;
      reportedIndexRef.current = index;
      onActiveIndexChange(index);
    },
    [onActiveIndexChange],
  );

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    if (copies) {
      // Loop: teleport by one set-span when the scroll drifts past the window
      // around the real set — same pixels, so invisible. Never under a native
      // smooth scroll (the browser animates toward an absolute position and
      // would visibly rewind); those re-seat on settle instead.
      const lg = getLoopGeom();
      if (lg) {
        const { span, home } = lg;
        const s = track.scrollLeft;

        /* The scroll is only ours to write when we are the one driving it: a
           pointer drag, or our own inertia, where every frame is a JS write
           anyway. Under a wheel/momentum sequence the compositor owns the
           offset — the write lands (the getter even reports it back, snapped)
           and is then reverted on the very next frame. That is what made the
           teleport re-fire every frame and the track flicker.
           `wheelRejectedRef` remembers that platform trait after one probe, so
           it costs a single frame once per session rather than once per fling. */
        const ownScroll = dragState.current.isDragging || inertiaRef.current;
        const mayWrite =
          !smoothRef.current &&
          !browserDrivenRef.current &&
          (ownScroll || !wheelRejectedRef.current);

        if (mayWrite) {
          let shift = 0;
          // The window spans the whole real set (scroll ∈ [home, home+span])
          // padded by ¾ span each side, so normalize()'s re-seat — anywhere
          // within the real set — never lands on a boundary and the two can't
          // ping-pong. A one-span jump from either edge lands back inside.
          if (s < home - span * 0.75) shift = span;
          else if (s > home + span * 1.75) shift = -span;
          if (shift) {
            /* Two teleports inside 200ms is not real travel: crossing a whole
               span takes far longer than that even at flick speed, so the
               position is being put back under us between frames. Latching on
               the interval catches that on the second attempt — the frame-later
               check below only notices once consecutive targets diverge enough
               to clear the tolerance, which took nine frames of flicker. */
            const at = Date.now();
            const burst = !ownScroll && at - lastTeleportAtRef.current < 200;
            lastTeleportAtRef.current = at;

            if (burst) {
              browserDrivenRef.current = true;
              wheelRejectedRef.current = true;
            } else {
              const target = s + shift;
              track.scrollLeft = target;
              // Keep an in-flight drag's absolute base in the same frame.
              if (dragState.current.isDragging)
                dragState.current.scrollLeft += shift;
              /* Verify a frame later, not on the next scroll event. The write
                 fires a scroll event of its own carrying the written value, so
                 checking there always looked like success — while the
                 compositor put its own offset back immediately afterwards. */
              requestAnimationFrame(() => {
                const t = trackRef.current;
                if (!t) return;
                if (Math.abs(t.scrollLeft - target) > span * 0.5) {
                  browserDrivenRef.current = true;
                  if (!ownScroll) wheelRejectedRef.current = true;
                }
              });
            }
          }
        }
      }

      /* Settle detection. `scrollend` is not usable here: our own writes fire
         it while the browser's animation is still running, which is how
         normalize() ended up re-seating the track every frame. A gap in scroll
         events is the only honest signal that the scroll has stopped. */
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        browserDrivenRef.current = false;
        normalize();
      }, 150);
    }

    // Note on `externalScroll` (lightbox sync): only the active-index
    // *detection* is suppressed, so the slider and lightbox don't fight over
    // the index. The per-frame visual writers (coverflow projection, mobile
    // depth scales) must keep running — an externally driven scroll moves the
    // panels all the same, and skipping them leaves stale transforms behind:
    // the lightbox would close onto a centered panel still wearing its
    // off-center rotation.

    // Positional index (over clones + real) → item index.
    const toReal = (p) => (copies ? p % n : p);

    if (layout.centered) {
      if (scrollRafTicking.current) return;
      scrollRafTicking.current = true;
      requestAnimationFrame(() => {
        scrollRafTicking.current = false;
        const t = trackRef.current;
        if (!t) return;
        const closest = updateProjection(t);
        if (externalScroll.current) return;
        reportActive(toReal(closest));
      });
      return;
    }

    if (layout.isMobile) {
      if (scrollRafTicking.current) return;
      scrollRafTicking.current = true;
      requestAnimationFrame(() => {
        scrollRafTicking.current = false;
        const t = trackRef.current;
        if (!t) return;
        const closest = updateMobileScales(t);
        if (externalScroll.current) return;
        reportActive(toReal(closest));
      });
      return;
    }

    // Skip detection when scroll was triggered by lightbox sync
    if (externalScroll.current) return;

    // Desktop: panels snap start-aligned to the slot's left edge, so the active
    // panel is the one whose left edge is nearest that edge. (Overlap-based
    // detection favoured a wide neighbour over a narrow start-aligned panel, so a
    // narrow portrait would read as inactive and clicking it opened the next
    // slide.) This matches the left-edge snap used by the drag inertia.
    if (scrollRafTicking.current) return;
    scrollRafTicking.current = true;
    requestAnimationFrame(() => {
      scrollRafTicking.current = false;
      const t = trackRef.current;
      if (!t) return;

      // `slotTargets[i] - scrollLeft` is exactly `rect.left - slotLeft` for a
      // start-aligned panel, without a rect read per panel.
      const geom = getGeometry();
      if (!geom) return;
      const s = t.scrollLeft;
      let bestIndex = 0;
      let bestDist = Infinity;
      for (let i = 0; i < geom.count; i++) {
        const dist = Math.abs(geom.slotTargets[i] - s);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      }

      reportActive(toReal(bestIndex));
    });
  }, [
    layout.inset,
    layout.centered,
    layout.isMobile,
    updateMobileScales,
    updateProjection,
    reportActive,
    copies,
    n,
    getGeometry,
    getLoopGeom,
    normalize,
  ]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Apply/clean mobile scales (or run the coverflow projector once on layout)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (layout.centered) {
      requestAnimationFrame(() => updateProjection(track));
    } else if (layout.isMobile) {
      requestAnimationFrame(() => updateMobileScales(track));
    } else {
      track.querySelectorAll(".slider__item-inner").forEach((inner) => {
        inner.style.transform = "";
        inner.style.filter = "";
        inner.style.transformOrigin = "";
      });
    }
  }, [layout.centered, layout.isMobile, updateMobileScales, updateProjection]);

  // `pos` is the element's position across clones + real set.
  const handleItemClick = useCallback(
    (pos) => {
      const real = copies ? pos % n : pos;
      // Read through the ref, not the prop: this callback is handed to the
      // memoised panels, so re-creating it on every active-index change would
      // re-render all of them and undo the memo.
      const active = activeIndexRef.current;
      const activePos = copies ? copies * n + active : active;
      if (pos === activePos) {
        onItemOpen?.(real);
        return;
      }
      // Non-active item: scroll it into the active position first, then open it
      // once the scroll animation finishes — so the lightbox opens already in
      // sync with the slider. Without a lightbox, centering is the interaction.
      const track = trackRef.current;
      if (copies) {
        // Scroll the clicked element itself into the slot (it may be a clone).
        const el = track?.querySelectorAll(".slider__item")[pos];
        if (el) {
          beginSmooth();
          el.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: snapInline,
          });
        }
      } else {
        scrollToIndex(pos);
      }
      if (!openOnSettle) return;
      const open = () => {
        clearTimeout(fallback);
        track?.removeEventListener("scrollend", open);
        // Re-seat on the real set first, so the shared-element zoom targets
        // the real element, not an identical clone.
        normalize();
        onItemOpen?.(real);
      };
      const fallback = setTimeout(open, 600);
      track?.addEventListener("scrollend", open, { once: true });
    },
    [
      onItemOpen,
      openOnSettle,
      scrollToIndex,
      copies,
      n,
      snapInline,
      beginSmooth,
      normalize,
    ],
  );

  const handleActivate = useCallback(
    (pos, viaKey) => {
      // Pointer capture doesn't apply to touch, so a touch drag still
      // synthesises a click on release — ignore it once it has travelled.
      if (!viaKey && dragDistRef.current >= 5) return;
      handleItemClick(pos);
    },
    [handleItemClick],
  );

  const handlePointerDown = useCallback((e) => {
    if (e.pointerType === "touch") return;
    const track = trackRef.current;
    if (!track) return;
    dragDistRef.current = 0;
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      scrollLeft: track.scrollLeft,
      prevX: e.clientX,
      prevTime: Date.now(),
      velocity: 0,
    };
    track.style.scrollSnapType = "none";
    track.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    const ds = dragState.current;
    if (!ds.isDragging) return;
    const now = Date.now();
    const dt = now - ds.prevTime;
    const dx = e.clientX - ds.prevX;
    if (dt > 0) {
      ds.velocity = dx / dt;
    }
    ds.prevX = e.clientX;
    ds.prevTime = now;
    dragDistRef.current = Math.abs(e.clientX - ds.startX);
    trackRef.current.scrollLeft = ds.scrollLeft - (e.clientX - ds.startX);
  }, []);

  const handlePointerUp = useCallback(
    (e) => {
      const ds = dragState.current;
      if (!ds.isDragging) return;
      ds.isDragging = false;
      const track = trackRef.current;
      track.releasePointerCapture(e.pointerId);

      // If barely moved, treat as click
      if (dragDistRef.current < 5) {
        track.style.scrollSnapType = "x mandatory";
        const el = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest(".slider__item");
        if (el) {
          const itemEls = Array.from(track.querySelectorAll(".slider__item"));
          const index = itemEls.indexOf(el);
          if (index >= 0) handleItemClick(index);
        }
        return;
      }

      // Inertia scroll
      let velocity = -ds.velocity * 1000; // px per second
      const friction = 0.92;
      let lastTime = performance.now();

      // We drive this scroll frame by frame, so teleports are safe under it:
      // the shift moves the base and the next `+=` continues from there.
      inertiaRef.current = true;

      const step = (now) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        velocity *= friction;
        track.scrollLeft += velocity * dt;

        if (Math.abs(velocity) > 50) {
          requestAnimationFrame(step);
        } else {
          inertiaRef.current = false;
          // Snap to nearest item — by center in centered modes, left edge otherwise
          const itemEls = track.querySelectorAll(".slider__item");
          const center = window.innerWidth / 2;
          let closest = 0;
          let closestDist = Infinity;
          itemEls.forEach((item, i) => {
            const rect = item.getBoundingClientRect();
            const dist =
              snapInline === "center"
                ? Math.abs(rect.left + rect.width / 2 - center)
                : Math.abs(rect.left - layout.inset);
            if (dist < closestDist) {
              closestDist = dist;
              closest = i;
            }
          });

          const onScrollEnd = () => {
            clearTimeout(fallback);
            track.style.scrollSnapType = "x mandatory";
            track.removeEventListener("scrollend", onScrollEnd);
          };
          const fallback = setTimeout(onScrollEnd, 300);
          track.addEventListener("scrollend", onScrollEnd, { once: true });
          // The final snap may land on a clone; the settle normalizes it away.
          if (copies) beginSmooth();
          itemEls[closest].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: snapInline,
          });
        }
      };

      requestAnimationFrame(step);
    },
    [layout.inset, snapInline, handleItemClick, copies, beginSmooth],
  );

  useImperativeHandle(
    ref,
    () => ({
      goTo,
      park: (index) => {
        const track = trackRef.current;
        // Always the real element — the view transition's name lives on it.
        const el = track?.querySelectorAll(
          ".slider__item:not([data-clone])",
        )[index];
        if (!track || !el) {
          return { apply: () => {}, release: () => {} };
        }
        // Park the slider on the item and hold it there for the whole lightbox
        // close. On mobile the drag-dismiss path can trigger a spurious
        // re-measure/sync that resets the slider to the first item
        // mid-transition; the scroll listener snaps it right back (guarded
        // against sub-pixel loops) so there's no visible bounce.
        const parkInline = snapInline;
        const apply = () => {
          // Loop: re-seat on the real set (pixel-identical) before measuring.
          normalize();
          const rect = el.getBoundingClientRect();
          const target =
            parkInline === "center" ? window.innerWidth / 2 : layout.inset;
          const pos =
            parkInline === "center" ? rect.left + rect.width / 2 : rect.left;
          if (Math.abs(pos - target) < 4) return; // already in place — avoid a loop
          el.scrollIntoView({
            behavior: "instant",
            block: "nearest",
            inline: parkInline,
          });
        };
        track.addEventListener("scroll", apply);
        return {
          apply,
          release: () => track.removeEventListener("scroll", apply),
        };
      },
      getItemEls: () =>
        trackRef.current?.querySelectorAll(
          ".slider__item:not([data-clone])",
        ) ?? [],
    }),
    [goTo, snapInline, layout.inset, normalize],
  );

  return (
    <motion.div
      className={`slider__track${trackClassName ? ` ${trackClassName}` : ""}${
        layout.fixedAspect ? " slider__track--fixed" : ""
      }`}
      ref={trackRef}
      tabIndex={-1}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        paddingLeft: `${layout.inset}px`,
        paddingRight: `${layout.endPad}px`,
        // Left-edge snap needs the snapport inset to the content column;
        // centered modes snap to the true scrollport center, so no padding.
        scrollPaddingLeft:
          layout.isMobile || layout.centered ? undefined : `${layout.inset}px`,
        touchAction: "pan-x pan-y",
      }}
    >
      {Array.from({ length: sets * n }, (_, pos) => {
        const i = pos % n;
        const item = items[i];
        // Clones only exist when looping; the real set sits in the middle.
        const clone = copies > 0 && Math.floor(pos / n) !== copies;
        const isActive = !clone && i === activeIndex;
        const interactive = !clone && itemsClickable;
        return (
          <TrackItem
            key={`${Math.floor(pos / n)}:${item.id ?? i}`}
            item={item}
            pos={pos}
            index={i}
            clone={clone}
            isActive={isActive}
            interactive={interactive}
            itemCursor={itemCursor}
            itemWidth={layout.itemWidth}
            itemHeight={layout.itemHeight || maxItemHeight}
            sizes={sizes}
            video={video}
            videoControls={videoControls}
            onActivate={handleActivate}
          />
        );
      })}
    </motion.div>
  );
});
