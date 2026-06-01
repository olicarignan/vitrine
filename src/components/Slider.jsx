"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { TextMorph } from "torph/react";
import { Lightbox } from "./Lightbox";

const staggerItems = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemFadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: [0, 0.55, 0.45, 1] },
  },
};

/**
 * Draggable project slider with a shared-element zoom into a fullscreen lightbox.
 *
 * Self-contained: it sizes itself from props + the viewport, so it does not
 * depend on any host grid system.
 *
 * @param {object}   props
 * @param {Array}    props.items              Project items (see item shape below).
 * @param {number}   [props.contentWidth=628] Desktop width (px) of the active panel's content column.
 * @param {number}   [props.gap=32]           Desktop gap (px) between panels.
 * @param {number}   [props.columns=4]        Notional grid columns, used only to align the meta text.
 * @param {number}   [props.metaOffsetColumns=0] Shift the meta text right by N columns on desktop (0 = flush with the slide).
 * @param {number}   [props.sideMargin=24]    Minimum viewport margin (px per side) the content column keeps.
 * @param {number}   [props.maxItemHeight=520] Max height (px) of a panel; taller images scale down (keeping ratio).
 * @param {string}   [props.sizes]            `sizes` hint for the panel <img>.
 * @param {string}   [props.lightboxSizes]    `sizes` hint forwarded to the lightbox images.
 *
 * Item shape (all image fields are plain strings — bring your own CMS/transform):
 * {
 *   id,                  // unique key (falls back to array index)
 *   title,               // shown in the meta line
 *   meta,                // secondary meta line (e.g. "Brand · 2024")
 *   src,                 // required: featured image URL
 *   srcSet,              // optional: responsive srcset
 *   webpSrcSet,          // optional: webp <source> srcset
 *   blurDataURL,         // optional: low-quality placeholder (data URI)
 *   alt,                 // optional: alt text (defaults to title)
 *   highResSrc,          // optional: hi-res image for the lightbox (falls back to src)
 *   highResSrcSet,       // optional
 *   highResWebpSrcSet,   // optional
 *   video,               // optional: looping muted video URL, autoplays when active
 * }
 */
export function Slider({
  items,
  contentWidth = 628,
  gap = 32,
  columns = 4,
  metaOffsetColumns = 0,
  sideMargin = 24,
  maxItemHeight = 520,
  sizes = "(min-width: 700px) 628px, 82vw",
  lightboxSizes = "84vw",
}) {
  const trackRef = useRef(null);
  const rootRef = useRef(null);
  const hoveredRef = useRef(false);
  const scrollTimer = useRef(null);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  // Mirror of activeIndex for callbacks that must read the latest value without
  // being re-created (openLightbox runs after an async scroll settles).
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;
  const [layout, setLayout] = useState({
    inset: 0,
    itemWidth: 0,
    metaInset: 0,
    metaInsetRight: 0,
    endPad: 0,
    isMobile: false,
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sliderVideosHidden, setSliderVideosHidden] = useState(false);
  const dragDistRef = useRef(0);
  const externalScroll = useRef(false);
  const activeTransition = useRef(null);
  const scrollRafTicking = useRef(false);

  useEffect(() => {
    const measure = () => {
      const vw = window.innerWidth;
      const isDesktop = window.matchMedia("(min-width: 700px)").matches;

      // Align to the host grid's content column when present (a `.subgrid` inside
      // a `.grid`); otherwise fall back to the prop-driven content width so the
      // component still works standalone.
      const subgrid = document.querySelector(".subgrid");
      const gridEl = subgrid?.closest(".grid") || document.querySelector(".grid");

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
          // Caption aligns to the active panel's left edge, plus an optional indent.
          metaInset: inset + metaOffsetColumns * (oneCol + colGap),
          metaInsetRight: inset,
          // Trailing room so the last panel can scroll fully to the left edge.
          endPad: vw - inset,
          isMobile: false,
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
          metaInset: margin,
          metaInsetRight: margin,
          endPad: margin,
          isMobile: true,
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
  }, [contentWidth, gap, columns, metaOffsetColumns, sideMargin]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = 0;
  }, [layout.inset]);

  const scrollToIndex = useCallback(
    (index) => {
      const track = trackRef.current;
      if (!track || !layout.itemWidth) return;
      const itemEls = track.querySelectorAll(".slider__item");
      if (!itemEls[index]) return;
      itemEls[index].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: layout.isMobile ? "center" : "start",
      });
    },
    [layout.itemWidth, layout.isMobile],
  );

  // Arrow-key navigation — only while the slider is hovered or holds focus, so
  // arrow keys still scroll the page normally elsewhere. The lightbox owns the
  // keys while it is open.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (lightboxOpen) return;
      const active =
        hoveredRef.current ||
        (rootRef.current && rootRef.current.contains(document.activeElement));
      if (!active) return;

      if (e.key === "ArrowRight") {
        const next = Math.min(activeIndex + 1, items.length - 1);
        if (next !== activeIndex) {
          e.preventDefault();
          scrollToIndex(next);
        }
      } else {
        const prev = Math.max(activeIndex - 1, 0);
        if (prev !== activeIndex) {
          e.preventDefault();
          scrollToIndex(prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, items.length, lightboxOpen, scrollToIndex]);

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

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    // Skip detection when scroll was triggered by lightbox sync
    if (externalScroll.current) return;

    if (layout.isMobile) {
      if (scrollRafTicking.current) return;
      scrollRafTicking.current = true;
      requestAnimationFrame(() => {
        scrollRafTicking.current = false;
        const t = trackRef.current;
        if (!t) return;
        const closest = updateMobileScales(t);
        setActiveIndex(closest);
        clearTimeout(scrollTimer.current);
      });
      return;
    }

    // Desktop: activate the project as soon as it overlaps the active slot by >50%
    if (scrollRafTicking.current) return;
    scrollRafTicking.current = true;
    requestAnimationFrame(() => {
      scrollRafTicking.current = false;
      const t = trackRef.current;
      if (!t) return;

      const itemEls = t.querySelectorAll(".slider__item");
      const slotLeft = layout.inset;
      const slotRight = layout.inset + layout.itemWidth;

      let bestIndex = -1;
      let bestOverlap = 0;
      let bestWidth = layout.itemWidth;
      itemEls.forEach((item, i) => {
        const rect = item.getBoundingClientRect();
        const overlap = Math.max(
          0,
          Math.min(rect.right, slotRight) - Math.max(rect.left, slotLeft),
        );
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestIndex = i;
          bestWidth = rect.width;
        }
      });

      // Activate once the panel fills more than half the active slot. Narrow
      // (portrait) panels are measured against their own width so they still trip.
      if (
        bestIndex >= 0 &&
        bestOverlap / Math.min(bestWidth, layout.itemWidth) > 0.5
      ) {
        setActiveIndex(bestIndex);
      }
    });
  }, [layout.inset, layout.itemWidth, layout.isMobile, updateMobileScales]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Apply/clean mobile scales
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (layout.isMobile) {
      requestAnimationFrame(() => updateMobileScales(track));
    } else {
      track.querySelectorAll(".slider__item-inner").forEach((inner) => {
        inner.style.transform = "";
        inner.style.filter = "";
        inner.style.transformOrigin = "";
      });
    }
  }, [layout.isMobile, updateMobileScales]);

  // Always opens on the slider's current active item — the single source of
  // truth shared with the lightbox — so the two stay in sync.
  const openLightbox = useCallback(() => {
    const index = activeIndexRef.current;
    const sliderItems = trackRef.current?.querySelectorAll(".slider__item");
    if (!sliderItems?.[index]) return;
    if (activeTransition.current) return;

    if (document.startViewTransition) {
      // Fade out shadow before snapshot
      sliderItems[index].classList.add("slider__item--transitioning");

      // Old snapshot: slider item has the name
      sliderItems[index].style.viewTransitionName = "slider-active";
      document.documentElement.style.viewTransitionName = "none";

      const transition = document.startViewTransition(() => {
        // Remove from slider item so lightbox active item (via CSS) becomes the new snapshot
        sliderItems[index].style.viewTransitionName = "";
        flushSync(() => setLightboxOpen(true));
      });
      activeTransition.current = transition;

      transition.finished.then(() => {
        activeTransition.current = null;
        sliderItems[index].classList.remove("slider__item--transitioning");
        document.documentElement.style.viewTransitionName = "";
      });
    } else {
      setLightboxOpen(true);
    }
  }, []);

  const handleItemClick = useCallback(
    (index) => {
      if (index === activeIndex) {
        openLightbox();
        return;
      }
      // Non-active item: scroll it into the active position first, then open the
      // lightbox once the scroll animation finishes — so the lightbox opens
      // already in sync with the slider.
      const track = trackRef.current;
      scrollToIndex(index);
      const open = () => {
        clearTimeout(fallback);
        track?.removeEventListener("scrollend", open);
        openLightbox();
      };
      const fallback = setTimeout(open, 600);
      track?.addEventListener("scrollend", open, { once: true });
    },
    [activeIndex, openLightbox, scrollToIndex],
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
          // Snap to nearest item
          const itemEls = track.querySelectorAll(".slider__item");
          let closest = 0;
          let closestDist = Infinity;
          itemEls.forEach((item, i) => {
            const dist = Math.abs(
              item.getBoundingClientRect().left - layout.inset,
            );
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
            inline: "start",
          });
        }
      };

      requestAnimationFrame(step);
    },
    [layout.inset, handleItemClick],
  );

  // Hide slider videos after backdrop fades in, restore on close
  useEffect(() => {
    if (lightboxOpen) {
      const timer = setTimeout(() => setSliderVideosHidden(true), 300);
      return () => clearTimeout(timer);
    } else {
      setSliderVideosHidden(false);
    }
  }, [lightboxOpen]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const itemEls = track.querySelectorAll(".slider__item");
    const cleanups = [];
    itemEls.forEach((item, i) => {
      const video = item.querySelector("video");
      if (!video) return;
      if (sliderVideosHidden) {
        video.pause();
        video.style.visibility = "hidden";
        item.classList.remove("slider__item--video-ready");
      } else {
        video.style.visibility = "";
        if (i === activeIndex) {
          video.currentTime = 0;
          video.play();
          const onReady = () => item.classList.add("slider__item--video-ready");
          if (video.readyState >= 2) {
            onReady();
          } else {
            video.addEventListener("canplay", onReady, { once: true });
            cleanups.push(() => video.removeEventListener("canplay", onReady));
          }
        } else {
          video.pause();
          item.classList.remove("slider__item--video-ready");
        }
      }
    });
    return () => cleanups.forEach((fn) => fn());
  }, [activeIndex, sliderVideosHidden]);

  const closeLightbox = useCallback(() => {
    if (activeTransition.current) return;
    const sliderItems = trackRef.current?.querySelectorAll(".slider__item");
    if (!sliderItems?.[activeIndex]) {
      setLightboxOpen(false);
      return;
    }

    // Step 1: Fade out neighbors and backdrop
    const lightboxEl = document.querySelector(".lightbox");
    if (lightboxEl) lightboxEl.classList.add("lightbox--closing");

    const runViewTransition = () => {
      if (activeTransition.current) return;
      if (document.startViewTransition) {
        // Restore slider videos before snapshot so they appear in the capture
        sliderItems.forEach((item) => {
          const video = item.querySelector("video");
          if (video) video.style.visibility = "";
        });

        // Old snapshot: lightbox active item has the name via CSS
        document.documentElement.style.viewTransitionName = "none";

        const transition = document.startViewTransition(() => {
          // Remove name from lightbox item so it doesn't conflict
          const lbActive = document.querySelector(".lightbox__item--active");
          if (lbActive) lbActive.style.viewTransitionName = "none";

          // Hide lightbox immediately so its exit animation doesn't interfere
          const lightboxRoot = document.querySelector(".lightbox");
          if (lightboxRoot) lightboxRoot.style.display = "none";

          // New snapshot: slider item gets the name
          sliderItems[activeIndex].style.viewTransitionName = "slider-active";
          flushSync(() => setLightboxOpen(false));
        });
        activeTransition.current = transition;

        transition.finished.then(() => {
          activeTransition.current = null;
          sliderItems[activeIndex].style.viewTransitionName = "";
          document.documentElement.style.viewTransitionName = "";
        });
      } else {
        setLightboxOpen(false);
      }
    };

    // Step 2: Wait for fade-out to finish, then run view transition
    if (lightboxEl) {
      setTimeout(runViewTransition, 350);
    } else {
      runViewTransition();
    }
  }, [activeIndex]);

  const handleLightboxActiveChange = useCallback(
    (index) => {
      setActiveIndex(index);
      externalScroll.current = true;
      scrollToIndex(index);
      // Clear flag after scroll settles
      clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        externalScroll.current = false;
      }, 300);
    },
    [scrollToIndex],
  );

  const active = items[activeIndex];

  return (
    <motion.div
      className="slider"
      ref={rootRef}
      variants={staggerItems}
      onPointerEnter={() => (hoveredRef.current = true)}
      onPointerLeave={() => (hoveredRef.current = false)}
    >
      <motion.div
        className="slider__track"
        ref={trackRef}
        tabIndex={-1}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          paddingLeft: `${layout.inset}px`,
          paddingRight: `${layout.endPad}px`,
          scrollPaddingLeft: layout.isMobile ? undefined : `${layout.inset}px`,
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
              role="button"
              tabIndex={0}
              aria-label={item.title}
              style={{
                "--item-max-w": `${layout.itemWidth}px`,
                "--item-max-h": `${maxItemHeight}px`,
                cursor: "zoom-in",
              }}
              onClick={() => {
                // Touch clicks (pointer capture doesn't apply to touch)
                if (dragDistRef.current < 5) handleItemClick(i);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleItemClick(i);
                }
              }}
            >
              <div className="slider__item-inner">
                <picture>
                  {item.webpSrcSet && (
                    <source
                      srcSet={item.webpSrcSet}
                      sizes={sizes}
                      type="image/webp"
                    />
                  )}
                  <img
                    src={item.src}
                    srcSet={item.srcSet}
                    sizes={sizes}
                    alt={item.alt || item.title}
                    draggable={false}
                    fetchPriority={i === 0 ? "high" : undefined}
                    loading={i <= 1 ? "eager" : "lazy"}
                    decoding={i <= 1 ? "sync" : "async"}
                    style={
                      item.blurDataURL
                        ? {
                            backgroundImage: `url(${item.blurDataURL})`,
                            backgroundSize: "cover",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  />
                </picture>
                {item.video && (
                  <video
                    src={item.video}
                    muted
                    playsInline
                    loop
                    preload="none"
                    draggable={false}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      <motion.div
        className="slider__meta"
        style={{
          paddingLeft: `${layout.metaInset}px`,
          paddingRight: `${layout.metaInsetRight}px`,
        }}
        variants={itemFadeIn}
      >
        <div className="slider__meta-inner">
          <TextMorph as="h3">{active?.title}</TextMorph>
          <br />
          <TextMorph as="p">{active?.meta}</TextMorph>
        </div>
      </motion.div>
      <AnimatePresence>
        {lightboxOpen && (
          <Lightbox
            items={items}
            activeIndex={activeIndex}
            sizes={lightboxSizes}
            onActiveIndexChange={handleLightboxActiveChange}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
