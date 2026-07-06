"use client";

import { useRef } from "react";
import { VideoPlayToggle } from "./VideoPlayToggle";

/**
 * The media block of a slider panel: responsive <picture> plus the optional
 * looping <video> overlay. Shared by the track variants; the stack and
 * coverflow variants pass `video={false}` so their panels stay poster-only
 * (the lightbox still plays the video).
 *
 * @param {object}  props
 * @param {object}  props.item                 The slider item.
 * @param {number}  props.index                Item index (drives eager-loading hints).
 * @param {string}  [props.sizes]              `sizes` hint for the <img>.
 * @param {boolean} [props.video=true]         Render the item's video overlay at all.
 * @param {boolean} [props.videoControls=false] Show playback controls over the active video.
 * @param {boolean} [props.isActive=false]     Whether this panel is the active one.
 */
export function SliderItemMedia({
  item,
  index,
  sizes,
  video = true,
  videoControls = false,
  isActive = false,
}) {
  const videoRef = useRef(null);
  const showVideo = video && Boolean(item.video);

  return (
    <>
      <picture>
        {item.webpSrcSet && (
          <source srcSet={item.webpSrcSet} sizes={sizes} type="image/webp" />
        )}
        <img
          src={item.src}
          srcSet={item.srcSet}
          sizes={sizes}
          alt={item.alt || item.title}
          draggable={false}
          fetchPriority={index === 0 ? "high" : undefined}
          loading={index <= 1 ? "eager" : "lazy"}
          decoding={index <= 1 ? "sync" : "async"}
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
      {showVideo && (
        <video
          ref={videoRef}
          src={item.video}
          muted
          playsInline
          loop
          // The scrubber needs the duration up front; without controls stay lazy.
          preload={videoControls ? "metadata" : "none"}
          draggable={false}
        />
      )}
      {showVideo && videoControls && isActive && (
        <VideoPlayToggle videoRef={videoRef} size={40} />
      )}
    </>
  );
}
