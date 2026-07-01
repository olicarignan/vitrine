"use client";

import { useRef, useState, useEffect } from "react";
import { IconMorph } from "metamorphosis/react";

// Maps the element under the pointer to the icon the cursor should morph into.
// Returns null when the pointer isn't over an interactive surface (the cursor
// hides but keeps its last icon, so it morphs — not pops — on re-entry).
// `lightboxOpen` selects the slider-vs-lightbox rule set.
function resolveIcon(target, lightboxOpen) {
  if (!target || typeof target.closest !== "function") return null;

  if (!lightboxOpen) {
    return target.closest(".slider__item") ? "plus" : null;
  }

  // The centered item and the overlay (backdrop / empty track runway) both
  // close the lightbox.
  if (target.closest(".lightbox__item--active")) return "close";

  const item = target.closest(".lightbox__item");
  if (item) {
    // Prev vs next is relational — compare the hovered item's index to the
    // active one (neighbors aren't otherwise distinguished in the DOM).
    const hovered = Number(item.dataset.index);
    const activeEl = document.querySelector(".lightbox__item--active");
    const active = activeEl ? Number(activeEl.dataset.index) : hovered;
    return hovered < active ? "arrow-left" : "arrow-right";
  }

  if (target.closest(".lightbox__backdrop, .lightbox__track")) return "close";

  return null;
}

// A pointer-following overlay that renders a morphing IconMorph glyph. Opt-in
// via the `morphCursor` prop on <Slider>; only active on precise pointers
// (touch keeps the native fallback cursors).
export function MorphCursor({ lightboxOpen }) {
  const wrapRef = useRef(null);
  const rafRef = useRef(0);
  const posRef = useRef({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);
  // `icon` is the last resolved icon and stays set once shown, so IconMorph
  // stays mounted and animates between values instead of popping in.
  const [icon, setIcon] = useState(null);
  const [visible, setVisible] = useState(false);

  // Only run where the pointer is precise; react to input-device changes.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return undefined;
    }

    const move = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      // Position via a direct ref write inside rAF — never through state — so
      // pointer moves don't re-render (mirrors the handleScroll batching).
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          const el = wrapRef.current;
          if (el) {
            const { x, y } = posRef.current;
            el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
          }
        });
      }

      const next = resolveIcon(e.target, lightboxOpen);
      if (next) {
        setIcon(next);
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    // Hide when the pointer leaves the document entirely.
    const out = (e) => {
      if (!e.relatedTarget) setVisible(false);
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", out, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", out);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [enabled, lightboxOpen]);

  if (!enabled) return null;

  return (
    <div
      ref={wrapRef}
      className={`morph-cursor${visible ? " morph-cursor--visible" : ""}`}
      aria-hidden="true"
    >
      {icon && (
        <IconMorph
          name={icon}
          size={20}
          strokeWidth={1.75}
          color="#fff"
          duration={250}
        />
      )}
    </div>
  );
}
