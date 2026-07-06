import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";
import { PropsTable } from "../../components/PropsTable.jsx";

const ITEM = `{
  id,          // unique key (falls back to array index)
  title,       // shown in the meta line
  meta,        // secondary meta line (e.g. "Brand · 2024")
  src,         // required: featured image URL
  srcSet,      // optional responsive srcset
  webpSrcSet,  // optional webp <source> srcset
  blurDataURL, // low-quality placeholder (data URI)
  alt,         // alt text (defaults to title)
  highResSrc,  // hi-res image for the lightbox
  video,       // looping muted video URL (row variant + lightbox)
}`;

const FEATURE_PROPS = [
  { prop: "variant", def: '"row"', desc: "Track layout: \"row\" (scroll-snap carousel), \"stack\" (deck cycling — no lightbox), or \"coverflow\" (3D row; its lightbox mirrors the coverflow styling). Stack and coverflow show posters only in the track." },
  { prop: "lightbox", def: "true", desc: "Set false to disable the lightbox: clicking the active panel fires onItemClick instead. Ignored by the stack variant, which never has a lightbox." },
  { prop: "onItemClick", def: undefined, desc: "Called with (item, index) when the active panel is clicked and the lightbox is disabled (or the variant is \"stack\")." },
  { prop: "lightboxControls", def: "false", desc: "Prev / close / next buttons inside the lightbox (all breakpoints)." },
  { prop: "videoControls", def: "false", desc: "Play/pause + mute + scrubber over the active video panel (slider and lightbox). Videos still autoplay muted." },
  { prop: "loop", def: undefined, desc: "Endless scroll: the array loops seamlessly. Defaults on for \"stack\" and \"coverflow\", off for \"row\"." },
  { prop: "arrows", def: "false", desc: "Prev/next buttons beside the caption (disabled at the ends; wrapping when the track loops)." },
  { prop: "pagination", def: "false", desc: "One dot per panel beside the caption; the active dot tracks scrolling, clicking a dot navigates." },
  { prop: "Caption", def: "TextMorph", desc: "Caption renderer (takes `as` + `children`). Pass PlainCaption — or your own — to opt out of the morphing animation." },
  { prop: "morphCursor", def: "false", desc: "Pointer-following morphing icon cursor (+ over panels, × / ← / → in the lightbox). Precise pointers only." },
  { prop: "transitionName", def: "auto", desc: "Override the auto-generated per-instance shared-element view-transition name." },
];

const LAYOUT_PROPS = [
  { prop: "contentWidth", def: "628", desc: "Desktop width (px) of the active panel's content column." },
  { prop: "gap", def: "32", desc: "Desktop gap (px) between panels." },
  { prop: "columns", def: "4", desc: "Notional grid columns — only used to align the meta text." },
  { prop: "metaOffsetColumns", def: "0", desc: "Shift the meta text right by N columns on desktop." },
  { prop: "sideMargin", def: "24", desc: "Minimum viewport margin (px per side) the content column keeps." },
  { prop: "maxItemHeight", def: "520", desc: "Max panel height (px); taller images scale down keeping ratio." },
  { prop: "aspectRatio", def: undefined, desc: "Force a fixed cover-cropped box — a number (1.5) or ratio string (\"16/9\"). Off by default (row & stack keep each image's ratio); coverflow always uses a fixed box (default ≈ 3:4) and this overrides it." },
  { prop: "sizes", def: undefined, desc: "sizes hint for the panel <img>." },
  { prop: "lightboxSizes", def: '"84vw"', desc: "sizes hint forwarded to the lightbox images." },
];

export default function ApiPage() {
  return (
    <>
      <DocsIntro>
        Everything <code>&lt;Slider&gt;</code> takes besides{" "}
        <code>items</code>. All props are optional and every default preserves
        the base carousel behavior shown on the examples pages.
      </DocsIntro>
      <DocsBlock>
        <h3>Item shape</h3>
        <CodeBlock code={ITEM} label="Copy item shape" />
        <h3>Feature props</h3>
        <PropsTable rows={FEATURE_PROPS} />
        <h3>Layout props</h3>
        <p>
          When the page has a <code>.grid &gt; .subgrid</code> column the
          slider measures it and aligns to it; these props are the standalone
          fallback.
        </p>
        <PropsTable rows={LAYOUT_PROPS} />
      </DocsBlock>
    </>
  );
}
