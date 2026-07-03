"use client";

import { forwardRef, useCallback } from "react";
import { RowTrack } from "./RowTrack";

/**
 * Coverflow track variant (`variant="coverflow"`): the row engine in centered
 * mode plus a scroll-driven 3D projector — the centered item lies flat, its
 * neighbors rotate toward the vanishing point, recede and shrink.
 *
 * Videos are not rendered in this variant (poster image only); a video item
 * still plays inside the lightbox.
 */
export const CoverflowTrack = forwardRef(function CoverflowTrack(props, ref) {
  // Writes the per-item 3D transform inside the scroll rAF. `t` is the item's
  // signed distance from the viewport center in item-widths, clamped so far
  // items stop rotating/receding and just line up.
  const projector = useCallback(({ itemEls, rects, center, vw, lo, hi }) => {
    const isMobile = vw < 700;
    const maxRotate = isMobile ? 30 : 45;
    const maxDepth = isMobile ? 60 : 120;

    for (let i = lo; i <= hi; i++) {
      const rect = rects[i];
      const t = Math.max(
        -2,
        Math.min(2, (rect.left + rect.width / 2 - center) / rect.width),
      );
      const a = Math.min(Math.abs(t), 1);
      const inner = itemEls[i].querySelector(".slider__item-inner");
      if (inner) {
        inner.style.transform =
          `rotateY(${-Math.sign(t) * a * maxRotate}deg) ` +
          `translateZ(${-Math.abs(t) * maxDepth}px) ` +
          `scale(${1 - Math.abs(t) * 0.08})`;
      }
      // The flat center item stacks above its receding neighbors.
      itemEls[i].style.zIndex = String(100 - Math.round(Math.abs(t) * 10));
    }
  }, []);

  return (
    <RowTrack
      {...props}
      ref={ref}
      mode="coverflow"
      projector={projector}
      trackClassName="slider__track--coverflow"
      video={false}
    />
  );
});
