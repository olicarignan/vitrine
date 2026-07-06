import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects, splitItems } from "../../useDemoData.js";
import { DocsIntro, DocsBlock, DocsExampleHeading } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Default — click the active panel to zoom into the lightbox
<Slider items={items} />

// Add prev / close / next buttons inside the lightbox
<Slider items={items} lightboxControls />

// No lightbox — handle the active panel's click yourself
<Slider
  items={items}
  lightbox={false}
  onItemClick={(item) => alert(\`\${item.title} clicked\`)}
/>`;

export default function LightboxPage() {
  const projects = useProjects();
  const [setA, setB] = splitItems(projects);

  return (
    <>
      <DocsIntro>
        Clicking the active panel zooms it into a fullscreen, swipeable lightbox
        via a shared-element view transition. Below: the default lightbox, one
        with the opt-in <code>lightboxControls</code> bar, and one with the
        lightbox disabled so the click fires your own handler instead.
      </DocsIntro>
      {setA ? <Slider items={setA} /> : <SliderSkeleton />}
      <DocsExampleHeading title="In-lightbox controls">
        <code>lightboxControls</code> adds prev / close / next buttons inside
        the lightbox (on every breakpoint).
      </DocsExampleHeading>
      {setB ? <Slider items={setB} lightboxControls /> : <SliderSkeleton />}
      <DocsExampleHeading title="Custom click handler">
        <code>lightbox</code> set to <code>false</code> disables the zoom; the
        active panel&apos;s click fires <code>onItemClick</code> instead — here
        it pops a browser alert.
      </DocsExampleHeading>
      {projects ? (
        <Slider
          items={projects}
          lightbox={false}
          onItemClick={(item) => alert(`${item.title} clicked`)}
        />
      ) : (
        <SliderSkeleton />
      )}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
      </DocsBlock>
    </>
  );
}
