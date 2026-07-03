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

// How many back cards peek out behind the top one; deeper cards are hidden.
const VISIBLE_DEPTH = 3;
// Vertical peek (px) and scale falloff per depth step.
const PEEK = 12;
const SCALE_STEP = 0.04;
// Release past this drag distance (px) or fling velocity (px/s) cycles the deck.
const SWIPE_OFFSET = 90;
const SWIPE_VELOCITY = 400;

/**
 * Deck-cycling track variant (`variant="stack"`): uniform cards stacked with a
 * vertical peek and scale falloff; dragging the top card past the threshold
 * sends it to the back (left = forward, right = backward), cycling infinitely.
 *
 * Cards are rendered in item-array order and only ever move via transform +
 * z-index — the DOM order is the index→element mapping the lightbox's view
 * transition and the orchestrator's `getItemEls()` rely on.
 *
 * Videos are not rendered in this variant (poster image only); a video item
 * still plays inside the lightbox.
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
    sizes,
    itemsClickable,
    itemCursor,
    onActiveIndexChange,
    onItemOpen,
    onLayoutChange,
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

      setLayout({
        colLeft,
        cardWidth: colWidth,
        // Uniform card box: images cover-crop into it so the deck edges align.
        cardHeight: isDesktop ? maxItemHeight : Math.round(colWidth * 0.75),
        isMobile: !isDesktop,
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
  }, [contentWidth, sideMargin, maxItemHeight]);

  useEffect(() => {
    onLayoutChange?.({
      metaInset: layout.colLeft,
      metaInsetRight: layout.colLeft,
      isMobile: layout.isMobile,
    });
  }, [layout, onLayoutChange]);

  const goTo = useCallback(
    (index) => {
      // The deck cycles: any index wraps into range and simply restacks.
      onActiveIndexChange(((index % n) + n) % n);
    },
    [n, onActiveIndexChange],
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
      if (info.offset.x < -SWIPE_OFFSET || info.velocity.x < -SWIPE_VELOCITY) {
        goTo(activeIndex + 1);
      } else if (
        info.offset.x > SWIPE_OFFSET ||
        info.velocity.x > SWIPE_VELOCITY
      ) {
        goTo(activeIndex - 1);
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
      className="slider__track slider__track--stack"
      ref={trackRef}
      style={{ height: `${layout.cardHeight}px` }}
    >
      {items.map((item, i) => {
        const depth = (i - activeIndex + n) % n;
        const clamped = Math.min(depth, VISIBLE_DEPTH);
        const isTop = depth === 0;
        return (
          <motion.div
            key={item.id ?? i}
            className={`slider__item${isTop ? " slider__item--active" : ""}`}
            role={itemsClickable ? "button" : undefined}
            tabIndex={itemsClickable && isTop ? 0 : undefined}
            aria-label={itemsClickable ? item.title : undefined}
            aria-hidden={isTop ? undefined : true}
            style={{
              left: `${layout.colLeft}px`,
              width: `${layout.cardWidth}px`,
              height: `${layout.cardHeight}px`,
              zIndex: n - depth,
              cursor: itemCursor,
              transformOrigin: "center top",
            }}
            initial={false}
            animate={{
              y: -PEEK * clamped,
              scale: 1 - SCALE_STEP * clamped,
              opacity: depth > VISIBLE_DEPTH ? 0 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag={isTop ? "x" : false}
            dragSnapToOrigin
            dragElastic={0.6}
            onDragStart={
              isTop ? () => (wasDraggingRef.current = true) : undefined
            }
            onDragEnd={isTop ? handleDragEnd : undefined}
            onTap={() => {
              if (wasDraggingRef.current) return;
              if (isTop) onItemOpen?.(i);
              else onActiveIndexChange(i);
            }}
            onKeyDown={
              itemsClickable && isTop
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onItemOpen?.(i);
                    }
                  }
                : undefined
            }
          >
            <div className="slider__item-inner">
              <SliderItemMedia item={item} index={i} sizes={sizes} video={false} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});
