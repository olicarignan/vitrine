// Video demo data sourced live from the Pexels Video API.
//
// No key-less art-museum API serves playable video, so the video slider draws
// from Pexels instead: a large library of free, no-attribution-required stock
// clips served as CORS-open MP4 (which — unlike Wikimedia's webm/ogv — autoplays
// on Safari/iOS too). We search a random art-leaning term each load, pick a
// sensibly-sized rendition, and map results into the flat item shape the slider
// expects, using the poster `image` as `src` and the MP4 as the looping `video`.
//
// Auth: Pexels needs a free API key. This is a client-side demo, so the key ends
// up in the bundle — that's expected for Pexels (read-only, rate-limited). We
// read it from `VITE_PEXELS_KEY` (see demo/.env.example); set it in demo/.env.local
// locally, or as an env var on your host. If it's missing the section is skipped.

const ENDPOINT = "https://api.pexels.com/videos/search";

// Read the key from Vite's env at build time. Guarded so this module can also be
// imported in plain Node (tests) where `import.meta.env` doesn't exist — there
// the key is passed explicitly to `fetchArtVideos`.
const ENV_KEY =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_PEXELS_KEY
    : undefined;

// Target rendition width (px). We pick the largest MP4 at or below this so the
// six looping panels stay light while still looking crisp.
const TARGET_WIDTH = 1280;

// Art-leaning search terms; a fresh random one each load keeps the set varied.
const QUERY_TERMS = [
  "art gallery",
  "oil painting",
  "painter painting",
  "art studio",
  "sculptor sculpting",
  "pottery wheel",
  "watercolor painting",
  "museum art",
  "graffiti mural artist",
  "ink calligraphy",
];

// "https://www.pexels.com/video/oil-painting-and-spatulas-7037886/"
//   -> "Oil painting and spatulas"
function titleFromUrl(url) {
  if (!url) return "Untitled";
  const slug = url
    .replace(/\/$/, "")
    .split("/")
    .pop() // "oil-painting-and-spatulas-7037886"
    .replace(/-\d+$/, ""); // drop the trailing numeric id
  if (!slug) return "Untitled";
  const words = slug.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Choose the largest MP4 rendition at or below TARGET_WIDTH; fall back to the
// smallest available if every file is larger.
function pickFile(files) {
  const mp4s = (files || [])
    .filter((f) => f.file_type === "video/mp4" && f.width)
    .sort((a, b) => a.width - b.width);
  if (!mp4s.length) return null;
  const underTarget = mp4s.filter((f) => f.width <= TARGET_WIDTH);
  return underTarget.length ? underTarget[underTarget.length - 1] : mp4s[0];
}

function toItem(v) {
  const file = pickFile(v.video_files);
  if (!file || !v.image) return null; // need both a poster and a playable file
  const title = titleFromUrl(v.url);
  return {
    id: v.id,
    title,
    meta: `${v.user?.name || "Pexels"} · Pexels`,
    alt: title,
    src: v.image, // poster frame
    video: file.link, // MP4
  };
}

/**
 * Fetch `count` art-leaning stock videos from Pexels for the video slider.
 * Returns an empty array if no key is configured or the network is unavailable
 * (the caller then hides the video section).
 *
 * @param {number} count  How many items to return.
 * @param {string} [apiKey]  Pexels key; defaults to VITE_PEXELS_KEY (browser).
 */
export async function fetchArtVideos(count = 6, apiKey = ENV_KEY) {
  if (!apiKey) return [];
  try {
    const term = QUERY_TERMS[Math.floor(Math.random() * QUERY_TERMS.length)];
    const res = await fetch(
      `${ENDPOINT}?query=${encodeURIComponent(term)}` +
        `&per_page=${count}&orientation=landscape&size=medium`,
      { headers: { Authorization: apiKey } },
    );
    if (!res.ok) throw new Error(`Pexels search failed: ${res.status}`);
    const data = await res.json();
    return (data.videos || []).map(toItem).filter(Boolean).slice(0, count);
  } catch {
    return [];
  }
}
