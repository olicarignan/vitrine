import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Deck-cycling card stack — swipe (or arrow keys) to cycle, click to zoom
<Slider items={items} variant="stack" />`;

export default function StackPage() {
  const projects = useProjects();

  return (
    <>
      <DocsIntro title="Card stack">
        <code>variant=&quot;stack&quot;</code> swaps the row for a deck: cards
        pile up with a peek and scale falloff, and dragging the top card past
        the threshold sends it to the back — left cycles forward, right cycles
        backward, infinitely. Clicking the top card still zooms into the
        lightbox, and arrow keys cycle while hovered.
      </DocsIntro>
      {projects ? (
        <Slider items={projects.slice(0, 6)} variant="stack" />
      ) : (
        <SliderSkeleton />
      )}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
        <p>
          Cards are uniform cover-cropped boxes, so the lightbox zoom morphs
          from the crop to the image&apos;s native ratio. Videos are skipped in
          the stack (poster only) — the lightbox still plays them.
        </p>
      </DocsBlock>
    </>
  );
}
