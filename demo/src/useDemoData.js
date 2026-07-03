import { useEffect, useState } from "react";
import { fetchRandomProjects } from "./demo-data.js";
import { fetchArtVideos } from "./video-data.js";

// The docs pages share one fetched set per session, so navigating between
// pages doesn't re-hit the Art Institute / Pexels APIs (and the demos stay
// visually consistent while browsing).
let projectsCache = null;
let projectsPromise = null;
let videosCache = null;
let videosPromise = null;

/**
 * Split a fetched set for the two-slider pages. The AIC fetch can return
 * fewer items than asked (thin search terms, unloadable images), so when
 * there aren't enough for two decent halves, both sliders show the full set.
 */
export function splitItems(items) {
  if (!items) return [null, null];
  if (items.length < 8) return [items, items];
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
}

/** Artworks from the Art Institute of Chicago; null while loading. */
export function useProjects() {
  const [items, setItems] = useState(projectsCache);

  useEffect(() => {
    if (projectsCache) return;
    projectsPromise ??= fetchRandomProjects(12, {
      minAspect: 0.7,
      maxAspect: 1.8,
    }).then((data) => {
      projectsCache = data;
      return data;
    });
    let cancelled = false;
    projectsPromise.then((data) => {
      if (!cancelled) setItems(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return items;
}

/**
 * Stock videos from the Pexels Video API; null while loading, [] when no
 * VITE_PEXELS_KEY is configured (callers show a hint instead of the demo).
 */
export function useVideos() {
  const [items, setItems] = useState(videosCache);

  useEffect(() => {
    if (videosCache) return;
    videosPromise ??= fetchArtVideos(6).then((data) => {
      videosCache = data;
      return data;
    });
    let cancelled = false;
    videosPromise.then((data) => {
      if (!cancelled) setItems(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return items;
}
