import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Morphing icon cursor: + over panels, × / ← / → in the lightbox
<Slider items={items} morphCursor />`;

export default function CursorPage() {
  const projects = useProjects();

  return (
    <>
      <DocsIntro title="Cursor">
        By default the slider uses static SVG zoom cursors. With{" "}
        <code>morphCursor</code>, a pointer-following icon morphs between{" "}
        <code>+</code> over a panel, <code>×</code> over the active lightbox
        item, and <code>←</code>/<code>→</code> over its neighbors. Precise
        pointers only — touch keeps the static cursors. (One morph-cursor
        slider per page: each renders its own follower.)
      </DocsIntro>
      {projects ? <Slider items={projects.slice(0, 8)} morphCursor /> : <SliderSkeleton />}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
        <p>
          Compare with any other page in these docs — everywhere else the
          default static cursors are in effect.
        </p>
      </DocsBlock>
    </>
  );
}
