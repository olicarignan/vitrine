"use client";

import { useRef, useState, useEffect, useCallback, useId } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { TextMorph } from "metamorphosis/react";
import { Lightbox } from "./Lightbox";
import { MorphCursor } from "./MorphCursor";
import { RowTrack } from "./tracks/RowTrack";
import { StackTrack } from "./tracks/StackTrack";
import { CoverflowTrack } from "./tracks/CoverflowTrack";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { staggerItems, itemFadeIn } from "./animation";

// Plain caption renderer: a bare element with no animation. Pass it (or any
// component taking `as` + `children`) as the `Caption` prop to opt out of the
// default morphing caption.
export const PlainCaption = ({ as: Tag = "span", children }) => (
  <Tag>{children}</Tag>
);

// View transitions are document-global, so the in-flight guard is too: with
// several sliders on a page, none may start a transition while one is running.
let activeViewTransition = null;

/**
 * Draggable project slider with a shared-element zoom into a fullscreen lightbox.
 *
 * Self-contained: it sizes itself from props + the viewport, so it does not
 * depend on any host grid system.
 *
 * @param {object}   props
 * @param {Array}    props.items              Project items (see item shape below).
 * @param {"row"|"stack"|"coverflow"} [props.variant="row"] Track layout: the scroll-snap carousel (default), a deck-cycling card stack, or a 3D coverflow. Stack and coverflow ignore `item.video` in the track (poster only — the lightbox still plays it).
 * @param {number}   [props.contentWidth=628] Desktop width (px) of the active panel's content column.
 * @param {number}   [props.gap=32]           Desktop gap (px) between panels.
 * @param {number}   [props.columns=4]        Notional grid columns, used only to align the meta text.
 * @param {number}   [props.metaOffsetColumns=0] Shift the meta text right by N columns on desktop (0 = flush with the slide).
 * @param {number}   [props.sideMargin=24]    Minimum viewport margin (px per side) the content column keeps.
 * @param {number}   [props.maxItemHeight=520] Max height (px) of a panel; taller images scale down (keeping ratio).
 * @param {string}   [props.sizes]            `sizes` hint for the panel <img>.
 * @param {string}   [props.lightboxSizes]    `sizes` hint forwarded to the lightbox images.
 * @param {React.ElementType} [props.Caption]  Caption renderer (takes `as` + `children`). Defaults to metamorphosis's morphing `<TextMorph>`; pass `PlainCaption` (or your own) to opt out.
 * @param {boolean}  [props.lightboxControls=false] Show prev/close/next buttons in the lightbox (on all breakpoints). Off by default — the caption carries the context and swipe/keys navigate.
 * @param {string}   [props.transitionName]   Override the auto-generated per-instance shared-element view-transition name.
 * @param {boolean}  [props.lightbox=true]    Set false to disable the lightbox entirely: clicking a panel no longer zooms; the active panel's click instead fires `onItemClick` (if given).
 * @param {Function} [props.onItemClick]      Called with `(item, index)` when the active panel is clicked and `lightbox` is false.
 * @param {boolean}  [props.arrows=false]     Show prev/next buttons beside the caption.
 * @param {boolean}  [props.pagination=false] Show one dot per panel beside the caption; the active dot tracks scrolling and clicking a dot navigates.
 * @param {boolean}  [props.videoControls=false] Show play/pause + mute + scrubber over the active video panel (slider and lightbox). Videos still autoplay muted.
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
  variant = "row",
  contentWidth = 628,
  gap = 32,
  columns = 4,
  metaOffsetColumns = 0,
  sideMargin = 24,
  maxItemHeight = 520,
  sizes = "(min-width: 700px) 628px, 82vw",
  lightboxSizes = "84vw",
  Caption = TextMorph,
  lightbox = true,
  lightboxControls = false,
  onItemClick,
  arrows = false,
  pagination = false,
  videoControls = false,
  morphCursor = false,
  transitionName,
}) {
  const rootRef = useRef(null);
  const hoveredRef = useRef(false);
  // The active track variant's imperative API: goTo / park / getItemEls.
  const trackApiRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Mirror of activeIndex for callbacks that must read the latest value without
  // being re-created (openLightbox runs after an async scroll settles).
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sliderVideosHidden, setSliderVideosHidden] = useState(false);
  // Reported up by the track so the caption aligns to the active panel.
  const [metaLayout, setMetaLayout] = useState({
    metaInset: 0,
    metaInsetRight: 0,
  });

  // Per-instance shared-element name so several sliders can coexist on a page.
  // useId is stable across renders; React 19 ids contain «», which is not a
  // valid CSS custom-ident, so strip anything unsafe.
  const reactId = useId();
  const vtName =
    transitionName ?? `vitrine-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const handleLayoutChange = useCallback((layout) => {
    setMetaLayout((prev) =>
      prev.metaInset === layout.metaInset &&
      prev.metaInsetRight === layout.metaInsetRight
        ? prev
        : { metaInset: layout.metaInset, metaInsetRight: layout.metaInsetRight },
    );
  }, []);

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

      // The stack cycles infinitely (its goTo wraps); the scroll tracks clamp.
      const wraps = variant === "stack";
      if (e.key === "ArrowRight") {
        const next = wraps
          ? activeIndex + 1
          : Math.min(activeIndex + 1, items.length - 1);
        if (next !== activeIndex) {
          e.preventDefault();
          trackApiRef.current?.goTo(next);
        }
      } else {
        const prev = wraps ? activeIndex - 1 : Math.max(activeIndex - 1, 0);
        if (prev !== activeIndex) {
          e.preventDefault();
          trackApiRef.current?.goTo(prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, items.length, lightboxOpen, variant]);

  // Always opens on the slider's current active item — the single source of
  // truth shared with the lightbox — so the two stay in sync.
  const openLightbox = useCallback(() => {
    const index = activeIndexRef.current;
    const sliderItems = trackApiRef.current?.getItemEls();
    if (!sliderItems?.[index]) return;
    if (activeViewTransition) return;

    if (document.startViewTransition) {
      // Fade out shadow before snapshot
      sliderItems[index].classList.add("slider__item--transitioning");

      // Old snapshot: slider item has the name
      sliderItems[index].style.viewTransitionName = vtName;
      sliderItems[index].style.viewTransitionClass = "vitrine-shared";
      document.documentElement.style.viewTransitionName = "none";

      const transition = document.startViewTransition(() => {
        // Remove from slider item so lightbox active item (inline style) becomes the new snapshot
        sliderItems[index].style.viewTransitionName = "";
        flushSync(() => setLightboxOpen(true));
      });
      activeViewTransition = transition;

      // finally, not then — `finished` rejects when a transition is skipped
      // (e.g. hidden tab), and the guard must clear either way.
      transition.finished.finally(() => {
        activeViewTransition = null;
        sliderItems[index].classList.remove("slider__item--transitioning");
        sliderItems[index].style.viewTransitionClass = "";
        document.documentElement.style.viewTransitionName = "";
      });
    } else {
      setLightboxOpen(true);
    }
  }, [vtName]);

  // The track reports an "open" on the active item: zoom into the lightbox, or
  // with the lightbox disabled, hand the click to the consumer.
  const handleItemOpen = useCallback(
    (index) => {
      if (lightbox) openLightbox();
      else onItemClick?.(items[index], index);
    },
    [lightbox, onItemClick, items, openLightbox],
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
    const itemEls = trackApiRef.current?.getItemEls();
    if (!itemEls?.length) return;
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

  const closeLightbox = useCallback(
    (opts) => {
      // A drag-dismiss has already displaced/scaled the image and faded the
      // backdrop, so we skip the neighbor/backdrop fade and run the shared-element
      // transition immediately — from wherever the finger released.
      const fromDrag = opts?.fromDrag === true;
      if (activeViewTransition) return;
      const api = trackApiRef.current;
      const sliderItems = api?.getItemEls();
      if (!sliderItems?.[activeIndex]) {
        setLightboxOpen(false);
        return;
      }

      // Step 1: Fade out neighbors and backdrop
      const lightboxEl = document.querySelector(".lightbox");
      if (lightboxEl && !fromDrag) lightboxEl.classList.add("lightbox--closing");

      // Park the slider on the active item and hold it there for the whole
      // close (the track keeps re-parking on any spurious scroll until released).
      const hold = api.park(activeIndex);

      const runViewTransition = () => {
        if (activeViewTransition) {
          hold.release();
          return;
        }
        if (document.startViewTransition) {
          // Restore slider videos before snapshot so they appear in the capture
          sliderItems.forEach((item) => {
            const video = item.querySelector("video");
            if (video) video.style.visibility = "";
          });

          // Old snapshot: lightbox active item has the name via inline style
          document.documentElement.style.viewTransitionName = "none";

          const transition = document.startViewTransition(() => {
            // Remove name from lightbox item so it doesn't conflict
            const lbActive = document.querySelector(".lightbox__item--active");
            if (lbActive) lbActive.style.viewTransitionName = "none";

            // Hide lightbox immediately so its exit animation doesn't interfere
            const lightboxRoot = document.querySelector(".lightbox");
            if (lightboxRoot) lightboxRoot.style.display = "none";

            // Position the slider on the active item before the new snapshot.
            hold.apply();

            // New snapshot: slider item gets the name
            sliderItems[activeIndex].style.viewTransitionName = vtName;
            sliderItems[activeIndex].style.viewTransitionClass =
              "vitrine-shared";
            flushSync(() => setLightboxOpen(false));
          });
          activeViewTransition = transition;

          transition.finished.finally(() => {
            activeViewTransition = null;
            sliderItems[activeIndex].style.viewTransitionName = "";
            sliderItems[activeIndex].style.viewTransitionClass = "";
            document.documentElement.style.viewTransitionName = "";
            hold.release();
          });
        } else {
          // No View Transitions: still park, and release the hold shortly after.
          hold.apply();
          setLightboxOpen(false);
          setTimeout(() => hold.release(), 400);
        }
      };

      // Step 2: Run the transition — after the neighbor/backdrop fade normally, or
      // on the next frame for a drag dismiss so the touch gesture settles and the
      // slider parks correctly before the snapshot.
      if (fromDrag) {
        requestAnimationFrame(runViewTransition);
      } else if (lightboxEl) {
        setTimeout(runViewTransition, 350);
      } else {
        runViewTransition();
      }
    },
    [activeIndex, vtName],
  );

  const handleLightboxActiveChange = useCallback((index) => {
    setActiveIndex(index);
    trackApiRef.current?.goTo(index, { external: true });
  }, []);

  const active = items[activeIndex];
  // With the lightbox off and no click callback, panels are display-only:
  // no button semantics, no action cursor, and the morph cursor stays hidden.
  const itemsClickable = lightbox || typeof onItemClick === "function";
  // Inline style beats CSS specificity: with the morph cursor on, hide the
  // native cursor (unless the panel isn't clickable, where the inline value
  // must also beat the morph-cursor CSS `none`).
  const itemCursor = morphCursor
    ? itemsClickable
      ? "none"
      : "default"
    : lightbox
      ? "zoom-in"
      : itemsClickable
        ? "pointer"
        : "default";

  const Track =
    variant === "stack"
      ? StackTrack
      : variant === "coverflow"
        ? CoverflowTrack
        : RowTrack;

  return (
    <motion.div
      className={`slider slider--${variant}${morphCursor ? " slider--morph-cursor" : ""}`}
      ref={rootRef}
      variants={staggerItems}
      onPointerEnter={() => (hoveredRef.current = true)}
      onPointerLeave={() => (hoveredRef.current = false)}
    >
      <Track
        ref={trackApiRef}
        items={items}
        activeIndex={activeIndex}
        contentWidth={contentWidth}
        gap={gap}
        columns={columns}
        metaOffsetColumns={metaOffsetColumns}
        sideMargin={sideMargin}
        maxItemHeight={maxItemHeight}
        sizes={sizes}
        videoControls={videoControls}
        itemsClickable={itemsClickable}
        itemCursor={itemCursor}
        onActiveIndexChange={setActiveIndex}
        onItemOpen={handleItemOpen}
        openOnSettle={lightbox}
        onLayoutChange={handleLayoutChange}
      />
      <motion.div
        className="slider__meta"
        style={{
          paddingLeft: `${metaLayout.metaInset}px`,
          paddingRight: `${metaLayout.metaInsetRight}px`,
        }}
        variants={itemFadeIn}
      >
        <div className="slider__meta-inner">
          <Caption as="h3">{active?.title}</Caption>
          <br />
          <Caption as="p">{active?.meta}</Caption>
        </div>
        {(arrows || pagination) && (
          <div className="slider__controls">
            {arrows && (
              <button
                type="button"
                className="slider__nav"
                onClick={() => trackApiRef.current?.goTo(activeIndex - 1)}
                disabled={variant !== "stack" && activeIndex === 0}
                aria-label="Previous"
              >
                <ChevronLeftIcon />
              </button>
            )}
            {pagination && (
              <div className="slider__dots">
                {items.map((item, i) => (
                  <button
                    key={item.id ?? i}
                    type="button"
                    className={`slider__dot${i === activeIndex ? " slider__dot--active" : ""}`}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === activeIndex ? "true" : undefined}
                    onClick={() => trackApiRef.current?.goTo(i)}
                  />
                ))}
              </div>
            )}
            {arrows && (
              <button
                type="button"
                className="slider__nav"
                onClick={() => trackApiRef.current?.goTo(activeIndex + 1)}
                disabled={variant !== "stack" && activeIndex === items.length - 1}
                aria-label="Next"
              >
                <ChevronRightIcon />
              </button>
            )}
          </div>
        )}
      </motion.div>
      <AnimatePresence>
        {lightbox && lightboxOpen && (
          <Lightbox
            items={items}
            activeIndex={activeIndex}
            sizes={lightboxSizes}
            Caption={Caption}
            controls={lightboxControls}
            videoControls={videoControls}
            transitionName={vtName}
            onActiveIndexChange={handleLightboxActiveChange}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>
      {morphCursor && (
        <MorphCursor
          lightboxOpen={lightboxOpen}
          itemsClickable={itemsClickable}
        />
      )}
    </motion.div>
  );
}
