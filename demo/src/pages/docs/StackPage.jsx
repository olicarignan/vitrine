import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Deck-cycling card stack — throw the top card (any direction)
// or use arrow keys. Cycles endlessly by default;
// pass loop={false} to clamp at the ends.
<Slider items={items} variant="stack" />

// The stack has no lightbox; wire the top card's click yourself if needed
<Slider items={items} variant="stack" onItemClick={(item) => ...} />

// Force uniform cover-cropped cards instead of a mixed-shape pile
<Slider items={items} variant="stack" aspectRatio="3/4" />`;

export default function StackPage() {
  const projects = useProjects();

  return (
    <>
      <DocsIntro>
        <code>variant=&quot;stack&quot;</code> swaps the row for a loose deck:
        each card keeps its own aspect ratio — a pile of differently-shaped
        photos — resting slightly askew with a peek and scale falloff. Grab the
        top card and it follows the cursor — throw it in any direction and it
        tilts into the flip and lands at the back; the deck only ever moves
        forward. Arrow keys cycle while hovered.
      </DocsIntro>
      {projects ? (
        <Slider items={projects.slice(0, 6)} variant="stack" />
      ) : (
        <SliderSkeleton />
      )}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
        <p>
          The stack has no lightbox (<code>lightbox</code> is ignored) —
          clicking the top card fires <code>onItemClick</code> if given,
          otherwise nothing. Videos are skipped too: cards show the poster
          image only. Want a tidy, uniform deck instead of mixed shapes? Pass{" "}
          <code>aspectRatio</code> (e.g. <code>aspectRatio=&#123;3/4&#125;</code>{" "}
          or <code>&quot;4/3&quot;</code>) to cover-crop every card to one box.
        </p>
      </DocsBlock>
    </>
  );
}
