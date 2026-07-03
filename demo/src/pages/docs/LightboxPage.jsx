import { useState } from "react";
import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects, splitItems } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Prev / close / next buttons inside the lightbox
<Slider items={items} lightboxControls />

// No lightbox at all — the active panel's click is yours
<Slider
  items={items}
  lightbox={false}
  onItemClick={(item, index) => console.log(item.title, index)}
/>`;

export default function LightboxPage() {
  const projects = useProjects();
  const [withControls, noLightbox] = splitItems(projects);
  const [clicked, setClicked] = useState(null);

  return (
    <>
      <DocsIntro title="Lightbox">
        Clicking the active panel zooms it into a fullscreen, swipeable
        lightbox via a shared-element view transition. The first slider adds
        the opt-in <code>lightboxControls</code> bar. The second disables the
        lightbox entirely — clicking its active panel fires{" "}
        <code>onItemClick</code> instead.
      </DocsIntro>
      {withControls ? (
        <Slider items={withControls} lightboxControls />
      ) : (
        <SliderSkeleton />
      )}
      {noLightbox ? (
        <Slider
          items={noLightbox}
          lightbox={false}
          onItemClick={(item) => setClicked(item.title)}
        />
      ) : (
        <SliderSkeleton />
      )}
      <DocsBlock>
        <p aria-live="polite">
          {clicked
            ? `onItemClick fired: “${clicked}”`
            : "Click the second slider's active panel to fire onItemClick."}
        </p>
        <CodeBlock code={SNIPPET} />
      </DocsBlock>
    </>
  );
}
