"use client";

import { useEffect, useState } from "react";
import { PlayPauseMorph } from "./PlayPauseMorph";

/**
 * Centered morphing play/pause toggle for a video panel, shared by the slider
 * and the lightbox. Chromeless — just the glyph (a drop-shadow from CSS gives
 * it contrast). Shown on hover (CSS); clicking toggles playback. The click and
 * pointer-down are stopped so the gesture neither opens/closes the lightbox nor
 * starts a track drag. Never owns playback — it mirrors the video's own events.
 */
export function VideoPlayToggle({ videoRef, size = 44 }) {
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    setPlaying(!video.paused);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoRef]);

  const toggle = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const stop = (e) => e.stopPropagation();

  return (
    <button
      type="button"
      className="vitrine-video-toggle"
      onClick={toggle}
      onPointerDown={stop}
      onPointerUp={stop}
      aria-label={playing ? "Pause" : "Play"}
    >
      <PlayPauseMorph playing={playing} size={size} strokeWidth={1.8} />
    </button>
  );
}
