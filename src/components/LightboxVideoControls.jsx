"use client";

import { useEffect, useRef, useState } from "react";
import { VolumeIcon, MuteIcon, PipIcon, FullscreenIcon } from "./icons";
import { VideoPlayToggle } from "./VideoPlayToggle";

function formatTime(s) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Lightbox playback UI for a video item: a centered play/pause toggle and a
 * bottom progress bar. The progress fill is driven by rAF (not `timeupdate`) so
 * it glides instead of stepping, and hovering the bar shows a translucent
 * seek-ahead indicator up to the cursor.
 *
 * `minimal` strips the bar down to just play/pause + progress; otherwise the
 * bar also carries the timestamp and mute / picture-in-picture / fullscreen
 * buttons (revealed on hover). Never owns playback — it observes the <video>.
 */
export function LightboxVideoControls({ videoRef, minimal = false }) {
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [pip, setPip] = useState(false);
  const fillRef = useRef(null);
  const previewRef = useRef(null);
  const scrubbingRef = useRef(false);

  // Timestamp text + button state track the coarse media events; the fill
  // itself is animated per-frame below.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onVolume = () => setMuted(video.muted);
    const onTime = () => {
      if (!scrubbingRef.current) setTime(video.currentTime);
    };
    const onMeta = () => setDuration(video.duration || 0);
    const onEnterPip = () => setPip(true);
    const onLeavePip = () => setPip(false);

    setMuted(video.muted);
    setDuration(video.duration || 0);
    setTime(video.currentTime);
    setPip(document.pictureInPictureElement === video);

    video.addEventListener("volumechange", onVolume);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("enterpictureinpicture", onEnterPip);
    video.addEventListener("leavepictureinpicture", onLeavePip);
    return () => {
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("enterpictureinpicture", onEnterPip);
      video.removeEventListener("leavepictureinpicture", onLeavePip);
    };
  }, [videoRef]);

  // Smooth progress: write the fill width every frame from the live
  // currentTime, so it never jumps between the ~4/s `timeupdate` events.
  useEffect(() => {
    let raf;
    const tick = () => {
      const video = videoRef.current;
      const fill = fillRef.current;
      if (video && fill && video.duration) {
        fill.style.width = `${Math.min(video.currentTime / video.duration, 1) * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoRef]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      /* user gesture / support issues — no-op */
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (video.requestFullscreen) video.requestFullscreen();
    // iOS Safari only fullscreens the <video> itself, and only via this call.
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  };

  const fracFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
  };

  const seekToFrac = (frac) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = frac * duration;
    setTime(frac * duration);
    if (fillRef.current) fillRef.current.style.width = `${frac * 100}%`;
  };

  // Hover: the translucent bar tracks the cursor to preview the seek target.
  const onProgressMove = (e) => {
    if (previewRef.current) {
      previewRef.current.style.width = `${fracFromEvent(e) * 100}%`;
    }
    if (scrubbingRef.current) seekToFrac(fracFromEvent(e));
  };

  const stop = (e) => e.stopPropagation();
  const pipSupported =
    typeof document !== "undefined" && document.pictureInPictureEnabled;

  return (
    <>
      <VideoPlayToggle videoRef={videoRef} size={60} />
      <div
        className={`vitrine-lb-video${minimal ? " vitrine-lb-video--minimal" : ""}`}
        onPointerDown={stop}
        onPointerMove={stop}
        onPointerUp={stop}
        onClick={stop}
        onKeyDown={stop}
      >
        {!minimal && (
          <div className="vitrine-lb-video__bar">
            <span className="vitrine-lb-video__time">
              {formatTime(time)} / {formatTime(duration)}
            </span>
            <div className="vitrine-lb-video__actions">
              <button
                type="button"
                className="vitrine-lb-video__btn"
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MuteIcon /> : <VolumeIcon />}
              </button>
              {pipSupported && (
                <button
                  type="button"
                  className="vitrine-lb-video__btn"
                  onClick={togglePip}
                  aria-label={
                    pip ? "Exit picture in picture" : "Picture in picture"
                  }
                >
                  <PipIcon />
                </button>
              )}
              <button
                type="button"
                className="vitrine-lb-video__btn"
                onClick={toggleFullscreen}
                aria-label="Fullscreen"
              >
                <FullscreenIcon />
              </button>
            </div>
          </div>
        )}
        <div
          className="vitrine-lb-video__progress"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration) || 0}
          aria-valuenow={Math.round(time)}
          tabIndex={0}
          onPointerDown={(e) => {
            scrubbingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            seekToFrac(fracFromEvent(e));
            stop(e);
          }}
          onPointerMove={onProgressMove}
          onPointerUp={(e) => {
            scrubbingRef.current = false;
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              /* pointer already released */
            }
            stop(e);
          }}
        >
          <div className="vitrine-lb-video__preview" ref={previewRef} />
          <div className="vitrine-lb-video__progress-fill" ref={fillRef} />
        </div>
      </div>
    </>
  );
}
