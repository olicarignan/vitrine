import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects, splitItems } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Any number of sliders per page — each generates its own
// shared-element transition name (override with \`transitionName\`)
<Slider items={artworks} />
<Slider items={photography} />`;

export default function MultiplePage() {
  const projects = useProjects();
  const [first, second] = splitItems(projects);

  return (
    <>
      <DocsIntro title="Multiple sliders">
        Each slider generates a per-instance view-transition name, so several
        can live on one page and each lightbox zooms back to the right panel.
        Open and close the lightbox on both to see it.
      </DocsIntro>
      {first ? <Slider items={first} /> : <SliderSkeleton />}
      {second ? <Slider items={second} /> : <SliderSkeleton />}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
      </DocsBlock>
    </>
  );
}
