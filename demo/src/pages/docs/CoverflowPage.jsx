import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Classic coverflow — drag or scroll; the centered item lies flat
<Slider items={items} variant="coverflow" />`;

export default function CoverflowPage() {
  const projects = useProjects();

  return (
    <>
      <DocsIntro title="Coverflow">
        <code>variant=&quot;coverflow&quot;</code> keeps the drag/inertia
        scroll engine but centers every item and projects the row in 3D: the
        centered panel lies flat while its neighbors rotate toward the
        vanishing point, recede and shrink. Clicking the center panel zooms
        into the lightbox as usual.
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
          surface. Videos are skipped in the coverflow track (poster only) —
          the lightbox still plays them.
        </p>
      </DocsBlock>
    </>
  );
}
