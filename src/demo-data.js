// Demo data sourced live from The Metropolitan Museum of Art Collection API.
//
// The Met exposes a free, key-less, CORS-enabled REST API
// (https://metmuseum.github.io/). We hit the search endpoint with
// `hasImages=true` and a random query term to get a pool of object IDs that have
// images, shuffle it, then fetch a few object records and map them into the flat
// item shape the slider expects. A fresh random term each load keeps the set
// varied between refreshes.
//
// In a real project you'd map your own CMS / image pipeline into this same flat
// shape — see the item-shape docs in Slider.jsx.

const BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

// Broad terms that each return thousands of image-bearing works, so any pick
// yields plenty of candidates. The chosen term loosely themes a given load.
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

// A few real Met works to fall back to if the network request fails (offline,
// blocked, etc.) so the demo always has something to show.
const FALLBACK_ITEMS = [
  {
    id: 436535,
    title: "Wheat Field with Cypresses",
    meta: "Vincent van Gogh · 1889",
    alt: "Wheat Field with Cypresses, Vincent van Gogh",
    src: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-42549-001.jpg",
    highResSrc: "https://images.metmuseum.org/CRDImages/ep/original/DP-42549-001.jpg",
  },
  {
    id: 459123,
    title: "Madame Roulin and Her Baby",
    meta: "Vincent van Gogh · 1888",
    alt: "Madame Roulin and Her Baby, Vincent van Gogh",
    src: "https://images.metmuseum.org/CRDImages/rl/web-large/DT3154.jpg",
    highResSrc: "https://images.metmuseum.org/CRDImages/rl/original/DT3154.jpg",
  },
  {
    id: 45734,
    title: "Quail and Millet",
    meta: "Kiyohara Yukinobu · late 17th century",
    alt: "Quail and Millet, Kiyohara Yukinobu",
    src: "https://images.metmuseum.org/CRDImages/as/web-large/DP251139.jpg",
    highResSrc: "https://images.metmuseum.org/CRDImages/as/original/DP251139.jpg",
  },
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function searchObjectIDs() {
  const term = QUERY_TERMS[Math.floor(Math.random() * QUERY_TERMS.length)];
  const res = await fetch(
    `${BASE}/search?hasImages=true&q=${encodeURIComponent(term)}`,
  );
  if (!res.ok) throw new Error(`Met search failed: ${res.status}`);
  const data = await res.json();
  return data.objectIDs || [];
}

async function fetchObject(id) {
  try {
    const res = await fetch(`${BASE}/objects/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function toItem(o) {
  const metaParts = [o.artistDisplayName, o.objectDate].filter(Boolean);
  return {
    id: o.objectID,
    title: o.title || "Untitled",
    meta: metaParts.join(" · "),
    alt: o.artistDisplayName ? `${o.title}, ${o.artistDisplayName}` : o.title,
    // web-large for the panel/base layer; the original feeds the lightbox's
    // progressive hi-res upgrade.
    src: o.primaryImageSmall,
    highResSrc: o.primaryImage || undefined,
  };
}

/**
 * Fetch `count` random Met artworks (each with an image) for the slider.
 * Falls back to a small built-in set if the network is unavailable.
 */
export async function fetchRandomProjects(count = 6) {
  try {
    const ids = shuffle(await searchObjectIDs());
    const items = [];

    // Fetch object records in parallel batches and keep the ones that resolved
    // to a usable image. `hasImages=true` means a single batch is normally
    // enough; we walk further into the shuffled pool only if some came up short.
    let cursor = 0;
    while (items.length < count && cursor < ids.length) {
      const batch = ids.slice(cursor, cursor + count * 2);
      cursor += batch.length;
      const objects = await Promise.all(batch.map(fetchObject));
      for (const o of objects) {
        if (items.length >= count) break;
        if (o && o.primaryImageSmall) items.push(toItem(o));
      }
    }

    if (items.length) return items;
  } catch {
    // fall through to the offline fallback
  }
  return FALLBACK_ITEMS.slice(0, count);
}
