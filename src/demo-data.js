// Sample data for the demo. Images come from picsum.photos (stable per seed);
// the two videos come from Google's public sample bucket.
//
// In a real project you'd map your CMS / image pipeline output into this same
// flat shape — see the item-shape docs in Slider.jsx.

const img = (seed) => ({
  src: `https://picsum.photos/seed/${seed}/680/453`,
  srcSet: `https://picsum.photos/seed/${seed}/680/453 680w, https://picsum.photos/seed/${seed}/1360/906 1360w`,
  highResSrc: `https://picsum.photos/seed/${seed}/1600/1067`,
  highResSrcSet: `https://picsum.photos/seed/${seed}/1600/1067 1600w, https://picsum.photos/seed/${seed}/2400/1600 2400w`,
});

export const projects = [
  {
    id: "studio",
    title: "Studio Atlas",
    meta: "Brand Identity · 2024",
    ...img("studio-atlas"),
  },
  {
    id: "harbor",
    title: "Harbor",
    meta: "Motion · 2024",
    ...img("harbor-lights"),
    video:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    id: "field",
    title: "Field Notes",
    meta: "Editorial · 2023",
    ...img("field-notes"),
  },
  {
    id: "north",
    title: "Due North",
    meta: "Art Direction · 2023",
    ...img("due-north"),
  },
  {
    id: "signal",
    title: "Signal",
    meta: "Product · 2023",
    ...img("signal-room"),
    video:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    id: "meridian",
    title: "Meridian",
    meta: "Web · 2022",
    ...img("meridian-co"),
  },
];
