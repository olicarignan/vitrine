"use client";

import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { motion } from "motion/react";

/**
 * Fullscreen, draggable lightbox. Rendered by <Slider> during the shared-element
 * zoom; not usually used on its own.
 *
 * @param {object}   props
 * @param {Array}    props.items                Same item array passed to <Slider>.
 * @param {number}   props.activeIndex          Index to open on.
 * @param {string}   [props.sizes="84vw"]       `sizes` hint for the images.
 * @param {Function} props.onActiveIndexChange  Called with the new index as the user scrolls.
 * @param {Function} props.onClose              Called to dismiss the lightbox.
 */
export function Lightbox({
  items,
  activeIndex: initialIndex,
  sizes = "84vw",
  onActiveIndexChange,
  onClose,
}) {
  const trackRef = useRef(null);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [, setIsDragging] = useState(false);
  const dragDistRef = useRef(0);
  // The index to open on, captured once at mount. The `activeIndex` prop tracks
  // the slider and changes as the user scrolls the lightbox, so we can't use it
  // to (re)position — that would fight the user's scrolling.
  const openIndexRef = useRef(initialIndex);
  const [neighborsRevealed, setNeighborsRevealed] = useState(false);
  const revealedRef = useRef(false);
  const scrollRafTicking = useRef(false);
  const lastActiveRef = useRef(initialIndex);

  // Reveal neighbors after view transition finishes
  useEffect(() => {
    const timer = setTimeout(() => {
      setNeighborsRevealed(true);
      revealedRef.current = true;
      // Set initial dim state
      const track = trackRef.current;
      if (track) {
        const itemEls = track.querySelectorAll(".lightbox__item");
        const center = window.innerWidth / 2;
        itemEls.forEach((item) => {
          const rect = item.getBoundingClientRect();
          const itemCenter = rect.left + rect.width / 2;
          const dist = Math.abs(itemCenter - center);
          const halfItem = rect.width / 2;
          const edgeDist = Math.max(0, dist - halfItem);
          const norm = Math.min(edgeDist / (window.innerWidth * 0.3), 1);
          item.style.filter = `blur(0px) brightness(${1 - norm * 0.4})`;
          item.style.transform = `scale(${1 - norm * 0.01})`;
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Center the active item before the first paint, so the lightbox opens
  // already in sync with the slider rather than mounting at the first item and
  // scrolling into place afterwards (which iOS Safari would also snap back).
  // The slider's image is already loaded, so the item has its width here.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const el = track.querySelectorAll(".lightbox__item")[openIndexRef.current];
    if (!el) return;
    track.scrollLeft = el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2;
  }, []);

  // Scroll handler — rAF-batched. Only updates inline styles on items within ±2 of the active.
  const handleScroll = useCallback(() => {
    if (scrollRafTicking.current) return;
    scrollRafTicking.current = true;
    requestAnimationFrame(() => {
      scrollRafTicking.current = false;
      const track = trackRef.current;
      if (!track) return;

      const itemEls = track.querySelectorAll(".lightbox__item");
      const center = window.innerWidth / 2;

      const rects = new Array(itemEls.length);
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < itemEls.length; i++) {
        const rect = itemEls[i].getBoundingClientRect();
        rects[i] = rect;
        const itemCenter = rect.left + rect.width / 2;
        const dist = Math.abs(itemCenter - center);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }

      if (revealedRef.current) {
        const vw = window.innerWidth;
        const last = lastActiveRef.current;
        const lo = Math.min(closest, last) - 2;
        const hi = Math.max(closest, last) + 2;
        for (
          let i = Math.max(0, lo);
          i <= Math.min(itemEls.length - 1, hi);
          i++
        ) {
          const rect = rects[i];
          const itemCenter = rect.left + rect.width / 2;
          const dist = Math.abs(itemCenter - center);
          const halfItem = rect.width / 2;
          const edgeDist = Math.max(0, dist - halfItem);
          const norm = Math.min(edgeDist / (vw * 0.3), 1);
          itemEls[i].style.filter = `blur(0px) brightness(${1 - norm * 0.4})`;
          itemEls[i].style.transform = `scale(${1 - norm * 0.01})`;
        }
      }

      lastActiveRef.current = closest;
      onActiveIndexChange(closest);
      setActiveIndex(closest);
    });
  }, [onActiveIndexChange]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToIndex = useCallback((index) => {
    const track = trackRef.current;
    if (!track) return;
    const itemEls = track.querySelectorAll(".lightbox__item");
    if (!itemEls[index]) return;
    itemEls[index].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        const next = Math.min(activeIndex + 1, items.length - 1);
        if (next !== activeIndex) scrollToIndex(next);
      } else if (e.key === "ArrowLeft") {
        const prev = Math.max(activeIndex - 1, 0);
        if (prev !== activeIndex) scrollToIndex(prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, items.length, onClose, scrollToIndex]);

  // Desktop drag handling
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
    setIsDragging(true);
    track.style.scrollSnapType = "none";
    track.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    const ds = dragState.current;
    if (!ds.isDragging) return;
    const now = Date.now();
    const dt = now - ds.prevTime;
    const dx = e.clientX - ds.prevX;
    if (dt > 0) ds.velocity = dx / dt;
    ds.prevX = e.clientX;
    ds.prevTime = now;
    dragDistRef.current = Math.abs(e.clientX - ds.startX);
    const track = trackRef.current;
    const newScroll = ds.scrollLeft - (e.clientX - ds.startX);

    // Rubber-band at boundaries
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (newScroll < 0) {
      track.scrollLeft = newScroll * 0.2;
    } else if (newScroll > maxScroll) {
      track.scrollLeft = maxScroll + (newScroll - maxScroll) * 0.2;
    } else {
      track.scrollLeft = newScroll;
    }
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
        setIsDragging(false);
        const el = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest(".lightbox__item");
        if (el) {
          const itemEls = Array.from(
            track.querySelectorAll(".lightbox__item"),
          );
          const index = itemEls.indexOf(el);
          if (index >= 0) {
            if (index === activeIndex) onClose();
            else scrollToIndex(index);
          }
        }
        return;
      }

      // Inertia scroll
      let velocity = -ds.velocity * 1000;
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
          const itemEls = track.querySelectorAll(".lightbox__item");
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
          });

          const onScrollEnd = () => {
            clearTimeout(fallback);
            track.style.scrollSnapType = "x mandatory";
            setIsDragging(false);
            track.removeEventListener("scrollend", onScrollEnd);
          };
          const fallback = setTimeout(onScrollEnd, 300);
          track.addEventListener("scrollend", onScrollEnd, { once: true });
          itemEls[closest].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      };

      requestAnimationFrame(step);
    },
    [activeIndex, onClose, scrollToIndex],
  );

  // Video autoplay
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const itemEls = track.querySelectorAll(".lightbox__item");
    const cleanups = [];
    itemEls.forEach((item, i) => {
      const video = item.querySelector("video");
      if (!video) return;
      if (i === activeIndex) {
        const startVideo = () => {
          video.currentTime = 0;
          video.play();
          const onReady = () =>
            item.classList.add("lightbox__item--video-ready");
          if (video.readyState >= 2) {
            onReady();
          } else {
            video.addEventListener("canplay", onReady, { once: true });
            cleanups.push(() =>
              video.removeEventListener("canplay", onReady),
            );
          }
        };
        const timer = setTimeout(startVideo, 300);
        cleanups.push(() => clearTimeout(timer));
      } else {
        video.pause();
      }
    });
    return () => cleanups.forEach((fn) => fn());
  }, [activeIndex]);

  // Click handler for touch (pointer capture skips touch)
  const handleItemClick = useCallback(
    (index) => {
      if (dragDistRef.current >= 5) return;
      if (index === activeIndex) onClose();
      else scrollToIndex(index);
    },
    [activeIndex, onClose, scrollToIndex],
  );

  return (
    <div className={`lightbox${neighborsRevealed ? " lightbox--revealed" : ""}`}>
      <motion.div
        className="lightbox__backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
      <div
        className="lightbox__track"
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(e) => {
          if (dragDistRef.current >= 5) return;
          const el = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest(".lightbox__item");
          if (!el) onClose();
        }}
        style={{
          touchAction: "pan-x",
        }}
      >
        {items.map((item, i) => (
          <LightboxItem
            key={item.id ?? i}
            item={item}
            index={i}
            activeIndex={activeIndex}
            sizes={sizes}
            onClick={handleItemClick}
          />
        ))}
      </div>
      <div className="lightbox__controls">
        <button
          className="lightbox__nav"
          onClick={() => scrollToIndex(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 1L3 7L9 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="lightbox__close" onClick={onClose} aria-label="Close">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L13 13M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          className="lightbox__nav"
          onClick={() => scrollToIndex(activeIndex + 1)}
          disabled={activeIndex === items.length - 1}
          aria-label="Next"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 1L11 7L5 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function LightboxItem({ item, index, activeIndex, sizes, onClick }) {
  const hasHighRes = Boolean(item.highResSrc);
  const videoUrl = item.video;
  const isActive = index === activeIndex;
  const dist = Math.abs(index - activeIndex);
  const [highResLoaded, setHighResLoaded] = useState(false);

  return (
    <div
      className={`lightbox__item${isActive ? " lightbox__item--active" : ""}`}
      style={!isActive ? { transitionDelay: `${dist * 0.06}s` } : undefined}
      onClick={() => onClick(index)}
    >
      {/* Base layer — gives the item its height and paints immediately.
          When no hi-res is supplied this is the only image shown. */}
      <picture className="lightbox__img lightbox__img--low">
        {item.webpSrcSet && (
          <source srcSet={item.webpSrcSet} sizes={sizes} type="image/webp" />
        )}
        <img
          src={item.src}
          srcSet={item.srcSet}
          sizes={sizes}
          alt={item.alt || item.title}
          draggable={false}
          loading={dist <= 1 ? "eager" : "lazy"}
          decoding="async"
        />
      </picture>
      {/* Hi-res layer fades in over the base once loaded. */}
      {hasHighRes && (
        <picture
          className={`lightbox__img lightbox__img--high${highResLoaded ? " lightbox__img--ready" : ""}`}
        >
          {item.highResWebpSrcSet && (
            <source
              srcSet={item.highResWebpSrcSet}
              sizes={sizes}
              type="image/webp"
            />
          )}
          <img
            src={item.highResSrc}
            srcSet={item.highResSrcSet}
            sizes={sizes}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading={dist <= 1 ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setHighResLoaded(true)}
          />
        </picture>
      )}
      {videoUrl && (
        <video
          src={videoUrl}
          muted
          playsInline
          loop
          preload="none"
          draggable={false}
        />
      )}
    </div>
  );
}
