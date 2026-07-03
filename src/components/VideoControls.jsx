"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon, PauseIcon, VolumeIcon, MuteIcon } from "./icons";

/**
 * Opt-in playback controls (play/pause, mute, scrubber) for a video panel.
 * Rendered over the active video when `videoControls` is set on <Slider>.
 *
 * The component never owns playback — the slider/lightbox autoplay effects do —
 * it only observes the <video> element's events and issues commands, so the
 * autoplay-while-active behavior is untouched.
 *
 * Every pointer/click/key event is stopped at this root: the same gestures
 * otherwise start a track drag, open the lightbox, or (on mobile) begin the
 * drag-down dismiss.
 */
export function VideoControls({ videoRef }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  // While the user holds the scrubber, timeupdate must not fight the thumb.
  const scrubbingRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVolume = () => setMuted(video.muted);
    const onTime = () => {
      if (!scrubbingRef.current) setTime(video.currentTime);
    };
    const onMeta = () => setDuration(video.duration || 0);

    // Sync to wherever the autoplay effect already put the video.
    setPlaying(!video.paused);
    setMuted(video.muted);
    setDuration(video.duration || 0);
    setTime(video.currentTime);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
    };
  }, [videoRef]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const seek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Number(e.target.value);
    video.currentTime = next;
    setTime(next);
  };

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="vitrine-video-controls"
      onPointerDown={stop}
      onPointerMove={stop}
      onPointerUp={stop}
      onClick={stop}
      onKeyDown={stop}
    >
      <button
        type="button"
        className="vitrine-video-controls__btn"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <input
        type="range"
        className="vitrine-video-controls__scrubber"
        min={0}
        max={duration || 0}
        step="any"
        value={Math.min(time, duration || 0)}
        disabled={!duration}
        onChange={seek}
        onPointerDown={(e) => {
          scrubbingRef.current = true;
          stop(e);
        }}
        onPointerUp={(e) => {
          scrubbingRef.current = false;
          stop(e);
        }}
        aria-label="Seek"
      />
      <button
        type="button"
        className="vitrine-video-controls__btn"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <MuteIcon /> : <VolumeIcon />}
      </button>
    </div>
  );
}
