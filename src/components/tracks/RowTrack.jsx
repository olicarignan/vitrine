"use client";

import {
  forwardRef,
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
    // Coverflow only: writes the 3D transforms. Called with
    // ({ itemEls, rects, center, vw, lo, hi }) inside the scroll rAF.
    projector,
    // Extra modifier class on the track element (e.g. "slider__track--coverflow").
    trackClassName,
    // Coverflow only: no videos in the track, posters only.
    video = true,
  },
  ref,
) {
  const trackRef = useRef(null);
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
        const boxW = isDesktop
          ? Math.round(Math.min(contentWidth * 0.62, vw - 2 * sideMargin))
          : vw - 2 * margin;
        const boxH = isDesktop ? maxItemHeight : Math.round(boxW * 0.75);
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
        setLayout({
          inset,
          itemWidth: colWidth + 24,
          itemHeight: 0,
          // Caption aligns to the active panel's left edge, plus an optional indent.
          metaInset: inset + metaOffsetColumns * (oneCol + colGap),
          metaInsetRight: inset,
          // Trailing room so the last panel can scroll fully to the left edge.
          endPad: vw - inset,
          isMobile: false,
          centered: false,
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
        setLayout({
          inset: margin,
          itemWidth: vw - 2 * margin,
          itemHeight: 0,
          metaInset: margin,
          metaInsetRight: margin,
          endPad: margin,
          isMobile: true,
          centered: false,
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
  }, [contentWidth, gap, columns, metaOffsetColumns, sideMargin, maxItemHeight, centered]);

  // The meta caption (rendered by the orchestrator) aligns to this layout.
  useEffect(() => {
    onLayoutChange?.(layout);
  }, [layout, onLayoutChange]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = 0;
  }, [layout.inset]);

  // Centered modes (mobile, coverflow) snap items to the viewport center;
  // desktop row snaps their left edge to the content column.
  const snapInline = layout.centered || layout.isMobile ? "center" : "start";

  const scrollToIndex = useCallback(
    (index) => {
      const track = trackRef.current;
      if (!track || !layout.itemWidth) return;
      const itemEls = track.querySelectorAll(".slider__item");
      if (!itemEls[index]) return;
      itemEls[index].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: snapInline,
      });
    },
    [layout.itemWidth, snapInline],
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
      const itemEls = track.querySelectorAll(".slider__item");
      const vw = window.innerWidth;
      const center = vw / 2;

      const rects = new Array(itemEls.length);
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < itemEls.length; i++) {
        rects[i] = itemEls[i].getBoundingClientRect();
        const dist = Math.abs(rects[i].left + rects[i].width / 2 - center);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }

      if (projector) {
        const lo = Math.max(0, Math.min(closest, lastActiveRef.current) - 3);
        const hi = Math.min(
          itemEls.length - 1,
          Math.max(closest, lastActiveRef.current) + 3,
        );
        projector({ itemEls, rects, center, vw, lo, hi });
      }
      lastActiveRef.current = closest;
      return closest;
    },
    [projector],
  );

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    // Skip detection when scroll was triggered by lightbox sync
    if (externalScroll.current) return;

    if (layout.centered) {
      if (scrollRafTicking.current) return;
      scrollRafTicking.current = true;
      requestAnimationFrame(() => {
        scrollRafTicking.current = false;
        const t = trackRef.current;
        if (!t) return;
        onActiveIndexChange(updateProjection(t));
        clearTimeout(scrollTimer.current);
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
        onActiveIndexChange(closest);
        clearTimeout(scrollTimer.current);
      });
      return;
    }

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

      const itemEls = t.querySelectorAll(".slider__item");
      const slotLeft = layout.inset;

      let bestIndex = 0;
      let bestDist = Infinity;
      itemEls.forEach((item, i) => {
        const dist = Math.abs(item.getBoundingClientRect().left - slotLeft);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      });

      onActiveIndexChange(bestIndex);
    });
  }, [layout.inset, layout.isMobile, updateMobileScales, onActiveIndexChange]);

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

  const handleItemClick = useCallback(
    (index) => {
      if (index === activeIndex) {
        onItemOpen?.(index);
        return;
      }
      // Non-active item: scroll it into the active position first, then open it
      // once the scroll animation finishes — so the lightbox opens already in
      // sync with the slider. Without a lightbox, centering is the interaction.
      const track = trackRef.current;
      scrollToIndex(index);
      if (!openOnSettle) return;
      const open = () => {
        clearTimeout(fallback);
        track?.removeEventListener("scrollend", open);
        onItemOpen?.(index);
      };
      const fallback = setTimeout(open, 600);
      track?.addEventListener("scrollend", open, { once: true });
    },
    [activeIndex, onItemOpen, openOnSettle, scrollToIndex],
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

      const step = (now) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        velocity *= friction;
        track.scrollLeft += velocity * dt;

        if (Math.abs(velocity) > 50) {
          requestAnimationFrame(step);
        } else {
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
          itemEls[closest].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: snapInline,
          });
        }
      };

      requestAnimationFrame(step);
    },
    [layout.inset, snapInline, handleItemClick],
  );

  useImperativeHandle(
    ref,
    () => ({
      goTo,
      park: (index) => {
        const track = trackRef.current;
        const el = track?.querySelectorAll(".slider__item")[index];
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
      getItemEls: () => trackRef.current?.querySelectorAll(".slider__item") ?? [],
    }),
    [goTo, snapInline, layout.inset],
  );

  return (
    <motion.div
      className={`slider__track${trackClassName ? ` ${trackClassName}` : ""}`}
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
      {items.map((item, i) => {
        const itemKey = item.id ?? i;
        return (
          <motion.div
            key={itemKey}
            className={`slider__item${i === activeIndex ? " slider__item--active" : ""}`}
            variants={itemFadeIn}
            role={itemsClickable ? "button" : undefined}
            tabIndex={itemsClickable ? 0 : undefined}
            aria-label={itemsClickable ? item.title : undefined}
            style={{
              "--item-max-w": `${layout.itemWidth}px`,
              "--item-max-h": `${layout.itemHeight || maxItemHeight}px`,
              cursor: itemCursor,
            }}
            onClick={() => {
              // Touch clicks (pointer capture doesn't apply to touch)
              if (dragDistRef.current < 5) handleItemClick(i);
            }}
            onKeyDown={
              itemsClickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleItemClick(i);
                    }
                  }
                : undefined
            }
          >
            <div className="slider__item-inner">
              <SliderItemMedia
                item={item}
                index={i}
                sizes={sizes}
                video={video}
                videoControls={videoControls}
                isActive={i === activeIndex}
              />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
});
