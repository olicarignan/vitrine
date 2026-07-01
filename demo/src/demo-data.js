// Demo data sourced live from the Art Institute of Chicago Collection API.
//
// The AIC exposes a free, key-less, CORS-enabled REST API
// (https://api.artic.edu/docs/). Its `/artworks/search` endpoint returns the
// fields we need in a single request — including `image_id`, the artwork's pixel
// `thumbnail.width`/`height`, and a base64 `thumbnail.lqip` low-quality
// placeholder — so, unlike the Met, we get the aspect ratio and a blur-up
// without probing each image. We hit search with a random query term, keep
// public-domain works that have an image, shuffle, and map them into the flat
// item shape the slider expects. A fresh random term each load keeps the set
// varied between refreshes. One catch: AIC sometimes reports a public-domain
// `image_id` whose IIIF image the server then 403s, so we do a lightweight
// load-check (see `takeLoadable`) and drop any that fail before showing them.
//
// Images are served over IIIF: `${iiif_url}/${image_id}/full/${width},/0/default.jpg`.
//
// In a real project you'd map your own CMS / image pipeline into this same flat
// shape — see the item-shape docs in Slider.jsx.

const BASE = "https://api.artic.edu/api/v1";

// IIIF base for building image URLs. Also returned as `config.iiif_url` on every
// response; we read that when present and fall back to this constant.
const IIIF = "https://www.artic.edu/iiif/2";

// Widths (px) for the two IIIF renditions: the panel/base layer and the hi-res
// image the lightbox progressively upgrades to.
const SRC_WIDTH = 843;
const HIGH_RES_WIDTH = 1686;

// Skip works with unwieldy titles so the meta line stays tidy in the slider.
const MAX_TITLE_LENGTH = 40;

// The `fields` we ask search to return — one request per load, no per-object
// follow-ups (the Met needed a second fetch per object; AIC search inlines it).
const FIELDS =
  "id,title,artist_display,date_display,image_id,is_public_domain,thumbnail";

// Broad terms that each return plenty of image-bearing works, so any pick yields
// enough candidates. The chosen term loosely themes a given load.
const QUERY_TERMS = [
  "landscape",
  "portrait",
  "still life",
  "flowers",
  "river",
  "garden",
  "figure",
  "blue",
  "gold",
  "sea",
  "mountain",
  "horse",
  "tree",
  "sunset",
  "abstract",
  "bronze",
  "vase",
  "dance",
  "night",
  "study",
];

// A few real AIC works to fall back to if the network request fails (offline,
// blocked, etc.) so the demo always has something to show.
const FALLBACK_ITEMS = [
  {
    id: 28560,
    title: "The Bedroom",
    meta: "Vincent van Gogh · 1889",
    alt: "The Bedroom, Vincent van Gogh",
    src: `${IIIF}/6644829f-f292-c5c4-a73c-0356a6fdbf0d/full/${SRC_WIDTH},/0/default.jpg`,
    highResSrc: `${IIIF}/6644829f-f292-c5c4-a73c-0356a6fdbf0d/full/${HIGH_RES_WIDTH},/0/default.jpg`,
  },
  {
    id: 20684,
    title: "Paris Street; Rainy Day",
    meta: "Gustave Caillebotte · 1877",
    alt: "Paris Street; Rainy Day, Gustave Caillebotte",
    src: `${IIIF}/f8fd76e9-c396-5678-36ed-6a348c904d27/full/${SRC_WIDTH},/0/default.jpg`,
    highResSrc: `${IIIF}/f8fd76e9-c396-5678-36ed-6a348c904d27/full/${HIGH_RES_WIDTH},/0/default.jpg`,
  },
  {
    id: 111628,
    title: "Nighthawks",
    meta: "Edward Hopper · 1942",
    alt: "Nighthawks, Edward Hopper",
    src: `${IIIF}/831a05de-d3f6-f4fa-a460-23008dd58dda/full/${SRC_WIDTH},/0/default.jpg`,
    highResSrc: `${IIIF}/831a05de-d3f6-f4fa-a460-23008dd58dda/full/${HIGH_RES_WIDTH},/0/default.jpg`,
  },
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function imageUrl(iiif, imageId, width) {
  return `${iiif}/${imageId}/full/${width},/0/default.jpg`;
}

// Confirm an image actually loads. AIC occasionally reports `image_id` +
// `is_public_domain: true` for a work whose IIIF image the server then 403s, so
// metadata alone isn't enough — we verify the real URL before showing it. Uses
// `Image()` (not `fetch`, which AIC's IIIF doesn't send CORS headers for); the
// load is reused from cache when the panel renders. Resolves true/false.
function probeImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(false);
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// Walk `candidates` in order, probing each image in batches, and collect the
// first `count` that load. In non-browser envs (tests) `Image` is absent, so we
// skip probing and take them as-is.
async function takeLoadable(candidates, count) {
  if (typeof Image === "undefined") return candidates.slice(0, count);
  const out = [];
  for (let i = 0; i < candidates.length && out.length < count; i += count) {
    const batch = candidates.slice(i, i + count);
    const oks = await Promise.all(
      batch.map((c) => probeImage(c.src).then((ok) => (ok ? c : null))),
    );
    for (const c of oks) {
      if (c && out.length < count) out.push(c);
    }
  }
  return out;
}

// AIC's `artist_display` is a multi-line blurb ("Vincent van Gogh\nDutch,
// 1853–1890"); the first line is the artist name. Pair it with `date_display`
// for a tidy "Artist · Date" meta line.
function toItem(o, iiif) {
  // Take the first line and drop any trailing "(born …, 1591–1653)" parenthetical
  // AIC sometimes appends, so the meta line stays just the name.
  const artist = (o.artist_display || "")
    .split("\n")[0]
    .split("(")[0]
    .trim();
  const metaParts = [artist, o.date_display].filter(Boolean);
  const t = o.thumbnail || {};
  return {
    id: o.id,
    title: o.title || "Untitled",
    meta: metaParts.join(" · "),
    alt: artist ? `${o.title}, ${artist}` : o.title,
    src: imageUrl(iiif, o.image_id, SRC_WIDTH),
    highResSrc: imageUrl(iiif, o.image_id, HIGH_RES_WIDTH),
    // AIC ships a base64 low-quality placeholder — use it for the blur-up.
    blurDataURL: t.lqip || undefined,
  };
}

/**
 * Fetch `count` random AIC artworks (each with an image) for the slider.
 * Falls back to a small built-in set if the network is unavailable.
 *
 * @param {number} count                   How many items to return.
 * @param {object} [opts]
 * @param {number} [opts.minAspect]         Min width/height ratio to accept
 *                                          (e.g. 0.7 drops tall portraits).
 * @param {number} [opts.maxAspect]         Max width/height ratio to accept
 *                                          (e.g. 1.8 drops wide panoramas).
 *
 * For a "preferred aspect ratio with tolerance", pass a range around it —
 * e.g. roughly square: `{ minAspect: 0.85, maxAspect: 1.15 }`.
 */
export async function fetchRandomProjects(count = 6, opts = {}) {
  const { minAspect, maxAspect } = opts;
  try {
    const term = QUERY_TERMS[Math.floor(Math.random() * QUERY_TERMS.length)];
    const res = await fetch(
      `${BASE}/artworks/search?q=${encodeURIComponent(term)}` +
        `&fields=${FIELDS}&limit=100`,
    );
    if (!res.ok) throw new Error(`AIC search failed: ${res.status}`);
    const data = await res.json();
    const iiif = data.config?.iiif_url || IIIF;

    // AIC search inlines every field we need, so filtering and aspect-ratio
    // measuring happen off the returned metadata (no per-image probing for
    // dimensions). Keep public-domain works with an image and a tidy title,
    // inside the optional aspect window.
    const candidates = [];
    for (const o of shuffle(data.data || [])) {
      if (!o.is_public_domain || !o.image_id) continue;
      if (o.title && o.title.length > MAX_TITLE_LENGTH) continue;

      const t = o.thumbnail;
      if (minAspect != null || maxAspect != null) {
        if (!t?.width || !t?.height) continue;
        const aspect = t.width / t.height;
        if (minAspect != null && aspect < minAspect) continue;
        if (maxAspect != null && aspect > maxAspect) continue;
      }
      candidates.push(toItem(o, iiif));
    }

    // Metadata can promise an image the IIIF server withholds (403), so keep only
    // the first `count` candidates whose images actually load.
    const items = await takeLoadable(candidates, count);
    if (items.length) return items;
  } catch {
    // fall through to the offline fallback
  }
  return FALLBACK_ITEMS.slice(0, count);
}
