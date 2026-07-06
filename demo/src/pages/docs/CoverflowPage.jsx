import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Classic coverflow — drag or scroll; the centered item lies flat.
// Loops endlessly by default; pass loop={false} to clamp at the ends.
<Slider items={items} variant="coverflow" />

// Coverflow always uses a fixed box (default ~3:4) — reshape it with aspectRatio
<Slider items={items} variant="coverflow" aspectRatio="16/9" />`;

export default function CoverflowPage() {
  const projects = useProjects();

  return (
    <>
      <DocsIntro>
        <code>variant=&quot;coverflow&quot;</code> keeps the drag/inertia
        scroll engine but centers every item and projects the row in 3D: the
        centered panel lies flat while its neighbors rotate toward the
        vanishing point, recede and shrink. The row loops endlessly — keep
        dragging past the last item and the first comes around. Clicking the
        center panel zooms into a lightbox that mirrors the coverflow styling.
      </DocsIntro>
      {projects ? (
        <Slider items={projects.slice(0, 10)} variant="coverflow" />
      ) : (
        <SliderSkeleton />
      )}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
        <p>
          Panels are uniform cover-cropped boxes so the ribbon reads as one
          surface, and the lightbox keeps that language: items stay
          cover-cropped (the zoom morphs crop → crop) and the lightbox
          neighbors carry the same 3D rotation. The box defaults to roughly
          3:4; set <code>aspectRatio</code> (a number or <code>&quot;16/9&quot;</code>-style
          string) to reshape it. Videos are skipped in the track (poster only)
          — the lightbox still plays them.
        </p>
      </DocsBlock>
    </>
  );
}
