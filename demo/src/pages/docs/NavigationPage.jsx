import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Prev/next arrows and pagination dots beside the caption
<Slider items={items} arrows pagination />`;

export default function NavigationPage() {
  const projects = useProjects();

  return (
    <>
      <DocsIntro title="Navigation">
        Opt-in <code>arrows</code> and <code>pagination</code> render beside
        the caption: prev/next buttons (disabled at the ends; they wrap on the
        stack variant) and one dot per panel that tracks scrolling — click a
        dot to jump. Both work on every variant.
      </DocsIntro>
      {projects ? (
        <Slider items={projects.slice(0, 8)} arrows pagination />
      ) : (
        <SliderSkeleton />
      )}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
      </DocsBlock>
    </>
  );
}
