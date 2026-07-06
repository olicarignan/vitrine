"use client";

import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { motion } from "motion/react";
import { TextMorph } from "metamorphosis/react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "./icons";
import { LightboxVideoControls } from "./LightboxVideoControls";

// Mobile drag-down-to-dismiss: release past this drop distance (px) or flick
// velocity (px per ms) dismisses; otherwise the image springs back.
const DISMISS_THRESHOLD = 110;
const DISMISS_VELOCITY = 0.55;

// Coverflow lightbox projection: neighbors rotate toward the vanishing point,
// recede and shrink — a larger-scale echo of the track's own projector.
const COVERFLOW_MAX_ROTATE = 35;
const COVERFLOW_MAX_DEPTH = 160;
const COVERFLOW_PERSPECTIVE = 1400;

/**
 * Per-item projection, shared by the reveal effect and the scroll handler.
 * Row mode keeps the original dim + hairline scale; coverflow mode adds the
 * 3D rotation and a z-order falloff. The active (centered) item stays flat so
 * drag-dismiss transforms and the view-transition snapshot are unaffected.
 *
 * The 3D transform goes on the item's inner wrapper, never the item itself:
 * the item is the scroll-snap target, and snap positions are computed from
 * the *transformed* bounding box — rotating the item shrinks/shifts its box
 * each frame and the snap chases a moving target instead of settling. (Same
 * reason the slider's coverflow track projects onto `.slider__item-inner`.)
 * The untransitioned inner also tracks the scroll 1:1, where the item's own
 * 0.4s transform transition would drag the rotation behind it.
 *
 * The perspective is local (inside the inner's transform) rather than a
 * shared one on the track: the item carries filter/opacity through the
 * reveal, close, and dim choreography, and those are grouping properties
 * that force `transform-style: flat` — a track perspective + preserve-3d
 * chain silently degrades into an orthographic squash whose rotation
 * direction the eye reads backwards.
 */
function projectItem(el, rect, center, coverflow) {
  const itemCenter = rect.left + rect.width / 2;
  const dist = Math.abs(itemCenter - center);
  const edgeDist = Math.max(0, dist - rect.width / 2);
  const norm = Math.min(edgeDist / (window.innerWidth * 0.3), 1);
  el.style.filter = `blur(0px) brightness(${1 - norm * 0.4})`;
  if (coverflow) {
    const t = Math.max(-2, Math.min(2, (itemCenter - center) / rect.width));
    const a = Math.min(Math.abs(t), 1);
    const inner = el.firstElementChild; // .lightbox__item-inner
    inner.style.transform =
      `perspective(${COVERFLOW_PERSPECTIVE}px) ` +
      `rotateY(${(-Math.sign(t) * a * COVERFLOW_MAX_ROTATE).toFixed(2)}deg) ` +
      `translateZ(${(-Math.abs(t) * COVERFLOW_MAX_DEPTH).toFixed(1)}px) ` +
      `scale(${(1 - Math.abs(t) * 0.06).toFixed(4)})`;
    el.style.zIndex = String(100 - Math.round(Math.abs(t) * 10));
  } else {
    el.style.transform = `scale(${1 - norm * 0.01})`;
  }
}

/**
 * Fullscreen, draggable lightbox. Rendered by <Slider> during the shared-element
 * zoom; not usually used on its own.
 *
 * @param {object}   props
 * @param {Array}    props.items                Same item array passed to <Slider>.
 * @param {number}   props.activeIndex          Index to open on.
 * @param {string}   [props.sizes="84vw"]       `sizes` hint for the images.
 * @param {React.ElementType} [props.Caption]   Caption renderer (takes `as` + `children`); defaults to metamorphosis's morphing `<TextMorph>`, matching the slider.
 * @param {boolean}  [props.controls=false]     Render the prev/close/next buttons (on all breakpoints).
 * @param {boolean}  [props.videoControls=false] Show play/pause + mute + scrubber over the active video item.
 * @param {string}   [props.transitionName="slider-active"] Shared-element view-transition name; `<Slider>` passes its per-instance name.
 * @param {boolean}  [props.coverflow=false]     Mirror the coverflow track: items become uniform cover-cropped boxes and neighbors carry the 3D rotation.
 * @param {number}   [props.itemAspect]          Box ratio (w/h) for coverflow items; `<Slider>` captures it from the active card at open time.
 * @param {boolean}  [props.loop=false]          Endless scroll, mirroring the slider's loop state: the item array loops and arrow keys / controls wrap.
 * @param {Function} props.onActiveIndexChange  Called with the new index as the user scrolls.
 * @param {Function} props.onClose              Called to dismiss the lightbox.
 */
export function Lightbox({
  items,
  activeIndex: initialIndex,
  sizes = "84vw",
  Caption = TextMorph,
  controls = false,
  videoControls = false,
  transitionName = "slider-active",
  coverflow = false,
  itemAspect,
  loop = false,
  onActiveIndexChange,
  onClose,
}) {
  const trackRef = useRef(null);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [, setIsDragging] = useState(false);
  const dragDistRef = useRef(0);
  // Pointer type of the in-flight gesture, so a touch tap can be told apart from
  // a mouse click (touch taps on a video reveal its controls instead of closing).
  const lastPointerTypeRef = useRef("mouse");
  // Touch only: whether the active video's controls are revealed. Toggled by a
  // tap on the video; reset whenever the active item changes.
  const [videoControlsShown, setVideoControlsShown] = useState(false);
  // Tracks a possible touch drag-down-to-dismiss gesture (null when idle).
  const dismissRef = useRef(null);
  // While a dismiss drag is active we switch the track to overflow:visible so the
  // dragged image isn't clipped; this holds the captured scrollLeft to restore.
  const freezeRef = useRef({ frozen: false, scrollLeft: 0 });
  const restoreTimerRef = useRef(null);
  // The index to open on, captured once at mount. The `activeIndex` prop tracks
  // the slider and changes as the user scrolls the lightbox, so we can't use it
  // to (re)position — that would fight the user's scrolling.
  const openIndexRef = useRef(initialIndex);
  const [neighborsRevealed, setNeighborsRevealed] = useState(false);
  // The reveal staggers each neighbor's sharpen-in by distance (a per-item
  // transition-delay). Once revealed we drop that delay, so navigating between
  // items dims the outgoing one and brightens the incoming one in lockstep
  // rather than delaying the outgoing item's darkening.
  const [staggerDone, setStaggerDone] = useState(false);
  const revealedRef = useRef(false);
  const scrollRafTicking = useRef(false);

  /* Endless scroll (`loop`) — the slider track's clone-set machinery, mirrored
     (see RowTrack.jsx): whole clone sets on both sides of the real set, an
     invisible one-span teleport when the scroll drifts past the padded window,
     and a re-seat onto the real set whenever scrolling settles. `activeIndex`
     stays a REAL item index throughout; only the internal geometry works in
     positions across clones + real. */
  const n = items.length;
  const copies = loop && n > 0 ? Math.max(2, Math.ceil(8 / n)) : 0;
  const sets = 2 * copies + 1;
  const smoothRef = useRef(false);
  const smoothTimer = useRef(null);
  const idleTimer = useRef(null);

  // Positional index of the closest-to-center element (clones included).
  const lastActiveRef = useRef(copies * n + initialIndex);

  // The scrollLeft that centers an element in the track.
  const centerTargetFor = useCallback(
    (track, el) =>
      el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2,
    [],
  );

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
    if (!track || !copies) return;
    if (dragState.current.isDragging || freezeRef.current.frozen) return;
    const itemEls = track.querySelectorAll(".lightbox__item");
    if (n === 0 || itemEls.length !== sets * n) return;
    const span = itemEls[n].offsetLeft - itemEls[0].offsetLeft;
    if (!span) return;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < itemEls.length; i++) {
      const d = Math.abs(centerTargetFor(track, itemEls[i]) - track.scrollLeft);
      if (d < closestDist) {
        closestDist = d;
        closest = i;
      }
    }
    const set = Math.floor(closest / n);
    if (set !== copies) track.scrollLeft += (copies - set) * span;
    smoothRef.current = false;
  }, [copies, sets, n, centerTargetFor]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !copies) return;
    const onEnd = () => normalize();
    track.addEventListener("scrollend", onEnd);
    return () => track.removeEventListener("scrollend", onEnd);
  }, [copies, normalize]);

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
          projectItem(item, item.getBoundingClientRect(), center, coverflow);
        });
      }
    }, 500);
    // Reveal fires at 500ms; the staggered filter/transform transitions (0.4s +
    // up to ~0.12s of stagger for the near neighbours) finish shortly after.
    // Drop the per-item delay once they have, so subsequent navigation is synced.
    const staggerTimer = setTimeout(() => setStaggerDone(true), 1100);
    return () => {
      clearTimeout(staggerTimer);
      clearTimeout(timer);
    };
  }, [coverflow]);

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
    const itemEls = track.querySelectorAll(".lightbox__item");
    // With loop, the real set sits behind `copies` sets of clone runway.
    const el = itemEls[copies * n + openIndexRef.current];
    if (!el) return;
    track.scrollLeft = el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2;
    // Coverflow: project every item before first paint. The inner transform
    // has no transition (it must track the scroll 1:1), so without this the
    // neighbors would pop from flat to rotated when the reveal kicks in.
    if (coverflow) {
      const center = window.innerWidth / 2;
      itemEls.forEach((item) =>
        projectItem(item, item.getBoundingClientRect(), center, true),
      );
    }
  }, [coverflow, copies, n]);

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

      if (copies && !smoothRef.current && !freezeRef.current.frozen) {
        // Loop: teleport by one set-span when the scroll drifts past the
        // window around the real set — same pixels, so invisible. Never under
        // a native smooth scroll (it would visibly rewind); those re-seat on
        // settle. The window pads the real set's span by ¾ span each side so
        // normalize()'s re-seat never lands on a boundary (no ping-pong).
        if (n > 0 && itemEls.length === sets * n) {
          const span = itemEls[n].offsetLeft - itemEls[0].offsetLeft;
          const home = centerTargetFor(track, itemEls[copies * n]);
          const s = track.scrollLeft;
          let shift = 0;
          if (span && s < home - span * 0.75) shift = span;
          else if (span && s > home + span * 1.75) shift = -span;
          if (shift) {
            track.scrollLeft = s + shift;
            // Keep an in-flight drag's absolute base in the same frame.
            if (dragState.current.isDragging)
              dragState.current.scrollLeft += shift;
          }
        }
      }
      if (copies) {
        // Settle fallback for browsers without `scrollend`.
        clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(normalize, 200);
      }

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
        const last = lastActiveRef.current;
        const lo = Math.min(closest, last) - 2;
        const hi = Math.max(closest, last) + 2;
        for (
          let i = Math.max(0, lo);
          i <= Math.min(itemEls.length - 1, hi);
          i++
        ) {
          projectItem(itemEls[i], rects[i], center, coverflow);
        }
      }

      lastActiveRef.current = closest;
      // Report the REAL item index; `closest` is positional across clones.
      const real = copies ? closest % n : closest;
      onActiveIndexChange(real);
      setActiveIndex(real);
    });
  }, [onActiveIndexChange, coverflow, copies, sets, n, centerTargetFor, normalize]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToIndex = useCallback(
    (index) => {
      const track = trackRef.current;
      if (!track) return;
      const itemEls = track.querySelectorAll(".lightbox__item");
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
          const d = Math.abs(centerTargetFor(track, cand) - track.scrollLeft);
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
        inline: "center",
      });
    },
    [copies, sets, n, centerTargetFor, beginSmooth],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        const next = loop
          ? activeIndex + 1
          : Math.min(activeIndex + 1, items.length - 1);
        if (next !== activeIndex) scrollToIndex(next);
      } else if (e.key === "ArrowLeft") {
        const prev = loop ? activeIndex - 1 : Math.max(activeIndex - 1, 0);
        if (prev !== activeIndex) scrollToIndex(prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, items.length, loop, onClose, scrollToIndex]);

  // Undo the dismiss-drag scroll freeze: re-enable the track's clip/scroll and
  // restore the horizontal position in one synchronous block (no intermediate
  // paint), so it lands exactly where it was.
  const restoreTrack = useCallback(() => {
    const track = trackRef.current;
    const f = freezeRef.current;
    if (!track || !f.frozen) return;
    track.style.overflow = "";
    track.scrollLeft = f.scrollLeft;
    track.style.transform = "";
    track.style.zIndex = "";
    freezeRef.current = { frozen: false, scrollLeft: 0 };
  }, []);

  // Clear a pending restore if the component unmounts mid-spring.
  useEffect(() => () => clearTimeout(restoreTimerRef.current), []);

  // Desktop drag handling (mouse). Touch horizontal panning is native
  // (touch-action: pan-x); a touch *down*-drag is captured here to dismiss.
  const handlePointerDown = useCallback((e) => {
    lastPointerTypeRef.current = e.pointerType;
    if (e.pointerType === "touch") {
      // Cancel any pending restore so a quick re-drag keeps the frozen position.
      clearTimeout(restoreTimerRef.current);
      dragDistRef.current = 0;
      dismissRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        locked: null,
        dy: 0,
        startTime: Date.now(),
      };
      return;
    }
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
    if (e.pointerType === "touch") {
      const d = dismissRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      // Lock the axis once out of a small deadzone. Horizontal is left to native
      // scroll; only a downward drag becomes a dismiss.
      if (d.locked === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        d.locked = Math.abs(dy) > Math.abs(dx) && dy > 0 ? "v" : "h";
      }
      if (d.locked !== "v") return;
      d.dy = Math.max(0, dy);
      dragDistRef.current = d.dy; // suppress the post-drag click

      const track = trackRef.current;
      if (!track) return;

      // First vertical move: drop the track's vertical clip so the dragged image
      // isn't cropped. overflow-x:auto forces overflow-y to clip, so switch the
      // track to overflow:visible and translate it by -scrollLeft to preserve the
      // on-screen position. Only the active image then moves; neighbours stay put.
      if (!freezeRef.current.frozen) {
        freezeRef.current = { frozen: true, scrollLeft: track.scrollLeft };
        track.style.overflow = "visible";
        track.style.transform = `translateX(${-freezeRef.current.scrollLeft}px)`;
        track.style.zIndex = "5";
      }

      const scale = Math.max(0.85, 1 - d.dy / 1400);
      const fade = Math.max(0, 1 - d.dy / 300);
      const backdrop = document.querySelector(".lightbox__backdrop");
      const meta = document.querySelector(".lightbox__meta");
      // Only the active image displaces (down + scale); neighbours hold position
      // and fade out, along with the backdrop and caption.
      track.querySelectorAll(".lightbox__item").forEach((item) => {
        if (item.classList.contains("lightbox__item--active")) {
          item.style.transition = "none";
          item.style.transform = `translateY(${d.dy}px) scale(${scale})`;
        } else {
          item.style.transition = "none";
          item.style.opacity = String(fade);
        }
      });
      if (backdrop) {
        backdrop.style.transition = "none";
        backdrop.style.opacity = String(fade);
      }
      if (meta) {
        meta.style.transition = "none";
        meta.style.opacity = String(fade);
      }
      return;
    }
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
      if (e.pointerType === "touch") {
        const d = dismissRef.current;
        dismissRef.current = null;
        if (!d || d.locked !== "v") return;
        const track = trackRef.current;
        const activeEl = track?.querySelector(".lightbox__item--active");
        const backdrop = document.querySelector(".lightbox__backdrop");
        const meta = document.querySelector(".lightbox__meta");
        const velocity = d.dy / Math.max(Date.now() - d.startTime, 1);

        if (d.dy > DISMISS_THRESHOLD || velocity > DISMISS_VELOCITY) {
          // Leave the drag transform in place so the shared-element transition
          // starts from where the finger released (accounts for displacement).
          onClose({ fromDrag: true });
          return;
        }

        // Below threshold — spring the image back and fade neighbours back in.
        const spring = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        if (activeEl) {
          activeEl.style.transition = spring;
          activeEl.style.transform = "";
        }
        if (track) {
          track.querySelectorAll(".lightbox__item").forEach((item) => {
            if (!item.classList.contains("lightbox__item--active")) {
              item.style.transition = "opacity 0.3s";
              item.style.opacity = "";
            }
          });
        }
        if (backdrop) {
          backdrop.style.transition = "opacity 0.3s";
          backdrop.style.opacity = "";
        }
        if (meta) {
          meta.style.transition = "opacity 0.3s";
          meta.style.opacity = "";
        }
        // Restore the track's scroll/clip once the image has sprung back (kept
        // unclipped through the spring so it isn't cropped on the way up).
        clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = setTimeout(() => {
          if (activeEl) activeEl.style.transition = "";
          restoreTrack();
        }, 300);
        return;
      }
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
          const itemEls = Array.from(track.querySelectorAll(".lightbox__item"));
          const pos = itemEls.indexOf(el);
          if (pos >= 0) {
            // At rest the track is normalized, so the active element sits at
            // its real position — a visible clone of the active item is a
            // different element and scrolls into place instead of closing.
            const activePos = copies ? copies * n + activeIndex : activeIndex;
            if (pos === activePos) onClose();
            else if (copies) {
              beginSmooth();
              el.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
              });
            } else scrollToIndex(pos);
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
          // The final snap may land on a clone; the settle normalizes it away.
          if (copies) beginSmooth();
          itemEls[closest].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      };

      requestAnimationFrame(step);
    },
    [activeIndex, onClose, scrollToIndex, copies, n, beginSmooth],
  );

  // Collapse any revealed video controls when the active item changes (e.g. the
  // user scrolls to the next clip) — the reveal is per-video.
  useEffect(() => {
    setVideoControlsShown(false);
  }, [activeIndex]);

  // Video autoplay — real items only (clones never render a <video>).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const itemEls = track.querySelectorAll(
      ".lightbox__item:not([data-clone])",
    );
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
            cleanups.push(() => video.removeEventListener("canplay", onReady));
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

  // Click handler for touch (pointer capture skips touch). `pos` is the
  // element's position across clones + real set.
  const handleItemClick = useCallback(
    (pos) => {
      if (dragDistRef.current >= 5) return;
      const activePos = copies ? copies * n + activeIndex : activeIndex;
      if (pos === activePos) {
        // Touch: tapping the active *video* reveals its controls rather than
        // dismissing — on mobile the lightbox only closes via the drag-down
        // gesture, the backdrop, or the lightbox chrome. Images (and pointer
        // devices, which reveal controls on hover) close on tap as before.
        const isVideo = videoControls && Boolean(items[activeIndex]?.video);
        if (isVideo && lastPointerTypeRef.current === "touch") {
          setVideoControlsShown((v) => !v);
          return;
        }
        onClose();
      } else if (copies) {
        const el = trackRef.current?.querySelectorAll(".lightbox__item")[pos];
        if (el) {
          beginSmooth();
          el.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      } else scrollToIndex(pos);
    },
    [activeIndex, onClose, scrollToIndex, copies, n, beginSmooth, items, videoControls],
  );

  return (
    <div
      className={`lightbox${neighborsRevealed ? " lightbox--revealed" : ""}${
        controls ? " lightbox--controls" : ""
      }${coverflow ? " lightbox--coverflow" : ""}`}
      // The item box ratio only drives sizing in coverflow mode.
      style={
        coverflow && itemAspect ? { "--lb-item-aspect": itemAspect } : undefined
      }
    >
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
        {Array.from({ length: sets * n }, (_, pos) => {
          const i = pos % n;
          return (
            <LightboxItem
              key={`${Math.floor(pos / n)}:${items[i].id ?? i}`}
              item={items[i]}
              index={i}
              pos={pos}
              // Clones only exist when looping; the real set is the middle one.
              clone={copies > 0 && Math.floor(pos / n) !== copies}
              activeIndex={activeIndex}
              sizes={sizes}
              staggerDone={staggerDone}
              transitionName={transitionName}
              videoControls={videoControls}
              showControls={videoControlsShown}
              onClick={handleItemClick}
            />
          );
        })}
      </div>
      <div className="lightbox__meta" aria-live="polite">
        <Caption as="h2">{items[activeIndex]?.title}</Caption>
        <Caption as="p">{items[activeIndex]?.meta}</Caption>
      </div>
      {controls && (
        <div className="lightbox__controls">
          <button
            className="lightbox__nav"
            onClick={() => scrollToIndex(activeIndex - 1)}
            disabled={!loop && activeIndex === 0}
            aria-label="Previous"
          >
            <ChevronLeftIcon />
          </button>
          <button
            className="lightbox__close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
          <button
            className="lightbox__nav"
            onClick={() => scrollToIndex(activeIndex + 1)}
            disabled={!loop && activeIndex === items.length - 1}
            aria-label="Next"
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  );
}

function LightboxItem({
  item,
  index,
  pos = index,
  clone = false,
  activeIndex,
  sizes,
  staggerDone,
  transitionName,
  videoControls,
  showControls = false,
  onClick,
}) {
  const hasHighRes = Boolean(item.highResSrc);
  // Clones never render a <video> — one autoplaying element per item.
  const videoUrl = clone ? undefined : item.video;
  const videoRef = useRef(null);
  // Never on a clone: the --active class and the shared-element name must
  // stay unique (closeLightbox targets `.lightbox__item--active`).
  const isActive = !clone && index === activeIndex;
  const dist = Math.abs(index - activeIndex);
  const [highResLoaded, setHighResLoaded] = useState(false);

  return (
    <div
      className={`lightbox__item${isActive ? " lightbox__item--active" : ""}${
        isActive && showControls ? " lightbox__item--show-controls" : ""
      }`}
      data-index={index}
      data-clone={clone ? "" : undefined}
      aria-hidden={clone ? true : undefined}
      // The active item carries the per-instance shared-element name (inline —
      // the name is dynamic, so it can't live in the stylesheet). The stagger
      // delay is only for the initial reveal; once that's done we drop it so
      // navigation dims the outgoing item and brightens the incoming one on
      // identical timing.
      style={
        isActive
          ? {
              viewTransitionName: transitionName,
              viewTransitionClass: "vitrine-shared",
            }
          : !staggerDone
            ? { transitionDelay: `${dist * 0.06}s` }
            : undefined
      }
      onClick={() => onClick(pos)}
    >
      {/* Inner wrapper: the coverflow projector's 3D transform target. Must
          stay the first child (projectItem reaches it via firstElementChild)
          and layout-neutral in row mode. */}
      <div className="lightbox__item-inner">
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
            ref={videoRef}
            src={videoUrl}
            muted
            playsInline
            loop
            // The scrubber needs the duration up front; without controls stay lazy.
            preload={videoControls ? "metadata" : "none"}
            draggable={false}
          />
        )}
        {videoUrl && videoControls && isActive && (
          <LightboxVideoControls
            videoRef={videoRef}
            minimal={videoControls === "minimal"}
          />
        )}
      </div>
    </div>
  );
}
