import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";
import { PropsTable } from "../../components/PropsTable.jsx";

const SNIPPET = `<Slider
  items={items}
  contentWidth={628}
  gap={32}
  maxItemHeight={520}
/>`;

const LAYOUT_PROPS = [
  { prop: "contentWidth", def: "628", desc: "Desktop width (px) of the active panel's content column." },
  { prop: "gap", def: "32", desc: "Desktop gap (px) between panels." },
  { prop: "columns", def: "4", desc: "Notional grid columns — only used to align the meta text." },
  { prop: "metaOffsetColumns", def: "0", desc: "Shift the meta text right by N columns on desktop." },
  { prop: "sideMargin", def: "24", desc: "Minimum viewport margin (px per side) the content column keeps." },
  { prop: "maxItemHeight", def: "520", desc: "Max panel height (px); taller images scale down keeping ratio." },
  { prop: "sizes", def: undefined, desc: "sizes hint for the panel <img>." },
  { prop: "lightboxSizes", def: '"84vw"', desc: "sizes hint forwarded to the lightbox images." },
];

export default function CarouselPage() {
  const projects = useProjects();

  return (
    <>
      <DocsIntro title="Carousel">
        The default layout: a draggable scroll-snap row with inertia, wheel and
        trackpad scrolling, click-to-center, and keyboard arrows while hovered.
        Click the active panel to zoom into the lightbox.
      </DocsIntro>
      {projects ? <Slider items={projects} /> : <SliderSkeleton />}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
        <h3>Layout props</h3>
        <PropsTable rows={LAYOUT_PROPS} />
        <p>
          When the page has a <code>.grid &gt; .subgrid</code> column (like
          this demo), the slider measures it and aligns the active panel and
          caption to it — the props above are the standalone fallback.
        </p>
      </DocsBlock>
    </>
  );
}
