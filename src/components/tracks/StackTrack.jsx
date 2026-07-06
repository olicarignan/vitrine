"use client";

import {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
} from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { SliderItemMedia } from "../SliderItemMedia";

// How many back cards peek out behind the top one; deeper cards are hidden.
const VISIBLE_DEPTH = 3;
// Vertical peek (px) and scale falloff per depth step.
const PEEK = 12;
const SCALE_STEP = 0.04;
// Release past this throw distance (px, any direction) or fling speed (px/s)
// flips the top card to the back.
const SWIPE_OFFSET = 90;
const SWIPE_VELOCITY = 400;

// Deterministic per-card jitter — "chaotic but organized": each resting card
// leans a few degrees and shifts a few px, the same way every render.
const rand01 = (i, seed) => {
  const v = Math.sin((i + 1) * seed) * 10000;
  return v - Math.floor(v);
};
const tiltFor = (i) => (rand01(i, 12.9898) - 0.5) * 7; // ±3.5°
const shiftFor = (i) => (rand01(i, 78.233) - 0.5) * 18; // ±9px

/**
 * Deck-cycling track variant (`variant="stack"`): each card keeps its own
 * source aspect ratio, fit inside a shared bounding box and centered, then
 * stacked with a vertical peek, scale falloff, and a slight per-card lean — a
 * loose pile of differently-shaped photos. Pass `aspectRatio` to force uniform
 * cover-cropped cards instead. Throwing the top card past the threshold — in
 * any direction — flips it to the back; the deck only ever moves toward the
 * next item.
 *
 * Cards are rendered in item-array order and only ever move via transform +
 * z-index — the DOM order is the index→element mapping the orchestrator's
 * `getItemEls()` relies on.
 *
 * Videos are not rendered in this variant (poster image only), and the stack
 * has no lightbox.
 *
 * Same imperative contract as RowTrack: `goTo` (wrapping restack), `park`
 * (no-op — the top card is always in place), `getItemEls`.
 */
export const StackTrack = forwardRef(function StackTrack(
  {
    items,
    activeIndex,
    contentWidth,
    sideMargin,
    maxItemHeight,
    // Force uniform cover-cropped cards of this ratio (number, w/h). null keeps
    // each card at its own source aspect ratio (a pile of mixed shapes).
    aspectRatio,
    sizes,
    itemsClickable,
    itemCursor,
    onActiveIndexChange,
    onItemOpen,
    onLayoutChange,
    // Deck cycling wraps by default; loop={false} clamps at the ends and
    // cycled-away cards fade off the deck (arrow keys / `arrows` go back).
    loop = true,
  },
  ref,
) {
  const trackRef = useRef(null);
  // Motion can still fire onTap on the dragged card after a swipe; suppress
  // the tap for the frame the drag ends on (same intent as the row track's
  // dragDist < 5 click suppression).
  const wasDraggingRef = useRef(false);
  const [layout, setLayout] = useState({
    colLeft: 0,
    colWidth: 0,
    cardWidth: 0,
    cardHeight: 0,
    isMobile: false,
  });
  const n = items.length;

  useEffect(() => {
    const measure = () => {
      const vw = window.innerWidth;
      const isDesktop = window.matchMedia("(min-width: 700px)").matches;

      // Same column resolution as the row track: align to a host `.grid` /
      // `.subgrid` when present, else fall back to the prop-driven width.
      const subgrid = document.querySelector(".subgrid");
      const gridEl = subgrid?.closest(".grid") || document.querySelector(".grid");

      let colLeft, colWidth;
      if (isDesktop) {
        if (subgrid && gridEl) {
          const r = subgrid.getBoundingClientRect();
          colLeft = r.left;
          colWidth = r.width;
        } else {
          colWidth = Math.min(contentWidth, vw - 2 * sideMargin);
          colLeft = (vw - colWidth) / 2;
        }
      } else {
        const margin =
          subgrid && gridEl
            ? subgrid.getBoundingClientRect().left -
              gridEl.getBoundingClientRect().left
            : sideMargin;
        colWidth = vw - 2 * margin;
        colLeft = margin;
      }

      // Card box: by default the deck's bounding box (each card fits inside it
      // at its own aspect ratio, no crop, centered). With `aspectRatio` set the
      // cards become a uniform cover-cropped box of that ratio, still centered
      // in the column.
      let cardWidth = colWidth;
      let cardHeight = isDesktop ? maxItemHeight : Math.round(colWidth * 0.75);
      if (aspectRatio) {
        cardHeight = Math.round(cardWidth / aspectRatio);
        if (cardHeight > maxItemHeight) {
          cardHeight = maxItemHeight;
          cardWidth = Math.round(cardHeight * aspectRatio);
        }
      }

      setLayout({
        colLeft,
        colWidth,
        cardWidth,
        cardHeight,
        isMobile: !isDesktop,
        fixedAspect: Boolean(aspectRatio),
      });
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
  }, [contentWidth, sideMargin, maxItemHeight, aspectRatio]);

  useEffect(() => {
    onLayoutChange?.({
      metaInset: layout.colLeft,
      metaInsetRight: layout.colLeft,
      isMobile: layout.isMobile,
    });
  }, [layout, onLayoutChange]);

  const goTo = useCallback(
    (index) => {
      // Looping deck: any index wraps into range and simply restacks.
      // Non-looping: clamp at the ends.
      onActiveIndexChange(
        loop ? ((index % n) + n) % n : Math.max(0, Math.min(index, n - 1)),
      );
    },
    [n, onActiveIndexChange, loop],
  );

  useImperativeHandle(
    ref,
    () => ({
      goTo,
      // The top card sits untransformed in the active slot; nothing to park.
      park: () => ({ apply: () => {}, release: () => {} }),
      getItemEls: () =>
        trackRef.current?.querySelectorAll(".slider__item") ?? [],
    }),
    [goTo],
  );

  const handleDragEnd = useCallback(
    (_e, info) => {
      // Direction-agnostic: any decisive throw — left, right, up or down —
      // sends the top card to the back; the deck only moves forward.
      const dist = Math.hypot(info.offset.x, info.offset.y);
      const speed = Math.hypot(info.velocity.x, info.velocity.y);
      if (dist > SWIPE_OFFSET || speed > SWIPE_VELOCITY) {
        goTo(activeIndex + 1);
      }
      // Release the tap suppression after the tap (if any) has fired.
      requestAnimationFrame(() => {
        wasDraggingRef.current = false;
      });
    },
    [activeIndex, goTo],
  );

  return (
    <div
      className={`slider__track slider__track--stack${
        layout.fixedAspect ? " slider__track--stack-fixed" : ""
      }`}
      ref={trackRef}
      style={{ height: `${layout.cardHeight}px` }}
    >
      {/* The stage spans the content column; cards center inside it and cap
          their size to the card box via these vars — natural ratio by default,
          or a uniform cover-cropped box when aspectRatio is forced. */}
      <div
        className="slider__stack-stage"
        style={{
          left: `${layout.colLeft}px`,
          width: `${layout.colWidth}px`,
          height: `${layout.cardHeight}px`,
          "--stack-w": `${layout.cardWidth}px`,
          "--stack-h": `${layout.cardHeight}px`,
        }}
      >
        {items.map((item, i) => {
          // Looping: cycled cards rejoin the back of the deck. Non-looping:
          // cards before the active one are "gone" (negative depth) — they lift
          // off the deck and fade until arrows/keys retrieve them.
          const depth = loop ? (i - activeIndex + n) % n : i - activeIndex;
          return (
            <StackCard
              key={item.id ?? i}
              item={item}
              index={i}
              depth={depth}
              n={n}
              sizes={sizes}
              itemsClickable={itemsClickable}
              itemCursor={itemCursor}
              wasDraggingRef={wasDraggingRef}
              onDragEnd={handleDragEnd}
              onItemOpen={onItemOpen}
              onActiveIndexChange={onActiveIndexChange}
            />
          );
        })}
      </div>
    </div>
  );
});

/**
 * One card of the deck. A separate component so each card owns its drag `x`
 * motion value: the swipe tilt derives from it (and springs back with it),
 * and it survives the card's trip to the back of the deck.
 */
function StackCard({
  item,
  index,
  depth,
  n,
  sizes,
  itemsClickable,
  itemCursor,
  wasDraggingRef,
  onDragEnd,
  onItemOpen,
  onActiveIndexChange,
}) {
  const gone = depth < 0;
  const clamped = Math.min(Math.max(depth, 0), VISIBLE_DEPTH);
  const isTop = depth === 0;

  // The drag writes to this x; the tilt follows it and springs back with it.
  const x = useMotionValue(0);
  // Tinder-style tilt while swiping, applied to the inner so it stacks on top
  // of the card's own resting lean (animated separately via `animate.rotate`).
  const dragTilt = useTransform(x, [-360, 0, 360], [-14, 0, 14], {
    clamp: true,
  });

  return (
    <motion.div
      className={`slider__item${isTop ? " slider__item--active" : ""}`}
      role={itemsClickable ? "button" : undefined}
      tabIndex={itemsClickable && isTop ? 0 : undefined}
      aria-label={itemsClickable ? item.title : undefined}
      aria-hidden={isTop ? undefined : true}
      style={{
        // Gone cards float above the deck while they fade out.
        zIndex: gone ? n + 1 : n - depth,
        // The draggable top card gets the grab/grabbing hand (from CSS); back
        // cards keep the click cursor.
        cursor: isTop ? undefined : itemCursor,
        // Fan the pile from each card's own center (size + rotate + peek).
        transformOrigin: "center",
        pointerEvents: gone ? "none" : undefined,
        x,
      }}
      initial={false}
      animate={
        gone
          ? { y: 24, rotate: 0, scale: 1.04, opacity: 0 }
          : {
              // Resting pose: back cards lean and shift a touch — organized
              // chaos; the top card straightens out.
              x: isTop ? 0 : shiftFor(index),
              y: -PEEK * clamped,
              rotate: isTop ? 0 : tiltFor(index),
              scale: 1 - SCALE_STEP * clamped,
              opacity: depth > VISIBLE_DEPTH ? 0 : 1,
            }
      }
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      // Free drag: the card stays pinned under the cursor on both axes.
      drag={isTop}
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={isTop ? () => (wasDraggingRef.current = true) : undefined}
      onDragEnd={isTop ? onDragEnd : undefined}
      onTap={() => {
        if (wasDraggingRef.current) return;
        if (isTop) onItemOpen?.(index);
        else onActiveIndexChange(index);
      }}
      onKeyDown={
        itemsClickable && isTop
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onItemOpen?.(index);
              }
            }
          : undefined
      }
    >
      <motion.div className="slider__item-inner" style={{ rotate: dragTilt }}>
        <SliderItemMedia item={item} index={index} sizes={sizes} video={false} />
      </motion.div>
    </motion.div>
  );
}
