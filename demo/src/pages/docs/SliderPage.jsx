import { Link } from "react-router";
import { Slider, PlainCaption } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects, splitItems } from "../../useDemoData.js";
import { DocsIntro, DocsBlock, DocsExampleHeading } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `import { Slider, PlainCaption } from "@ocarignan/vitrine";
import "@ocarignan/vitrine/styles.css";

// The default carousel — captions morph between items (metamorphosis TextMorph)
<Slider items={items} />

// Opt out of the caption animation
<Slider items={items} Caption={PlainCaption} />

// Or bring your own — anything taking \`as\` + \`children\`
const Custom = ({ as: Tag = "span", children }) => (
  <Tag className="fancy">{children}</Tag>
);
<Slider items={items} Caption={Custom} />

// Endless — the row loops seamlessly, and so does its lightbox
<Slider items={items} loop />

// Morphing icon cursor: + over panels, × / ← / → in the lightbox
<Slider items={items} morphCursor />

// Force a fixed aspect ratio (cover-cropped) — works on any variant
<Slider items={items} aspectRatio="3/2" />

// Prev/next arrows and pagination dots beside the caption (any variant)
<Slider items={items} arrows pagination />`;

export default function SliderPage() {
  const projects = useProjects();
  const [morphItems, plainItems] = splitItems(projects);

  return (
    <>
      <DocsIntro>
        The default layout: a draggable scroll-snap row with inertia, wheel and
        trackpad scrolling, click-to-center, and keyboard arrows while hovered.
        Click the active panel to zoom into the lightbox, and the caption morphs
        from one item&apos;s title to the next&apos;s as you navigate. The
        labelled examples below swap in a plain caption, endless looping, the
        morphing cursor, and the arrows / pagination controls.
      </DocsIntro>
      {morphItems ? <Slider items={morphItems} /> : <SliderSkeleton />}
      <DocsExampleHeading title="Fixed caption">
        Passes <code>PlainCaption</code> to swap the morphing title for a plain,
        static one.
      </DocsExampleHeading>
      {plainItems ? (
        <Slider items={plainItems} Caption={PlainCaption} />
      ) : (
        <SliderSkeleton />
      )}
      <DocsExampleHeading title="Endless loop">
        <code>loop</code> scrolls the row seamlessly past the ends, and its
        lightbox loops along with it.
      </DocsExampleHeading>
      {projects ? <Slider items={projects} loop /> : <SliderSkeleton />}
      <DocsExampleHeading title="Morphing cursor">
        <code>morphCursor</code> follows the pointer, morphing between{" "}
        <code>+</code> over a panel and <code>×</code>/<code>←</code>/
        <code>→</code> in the lightbox.
      </DocsExampleHeading>
      {projects ? (
        <Slider items={projects.slice(0, 8)} morphCursor />
      ) : (
        <SliderSkeleton />
      )}
      <DocsExampleHeading title="Arrows &amp; pagination">
        Opt-in <code>arrows</code> and <code>pagination</code> render beside the
        caption — prev/next buttons and one dot per panel that tracks scrolling.
        Both work on every variant.
      </DocsExampleHeading>
      {projects ? (
        <Slider items={projects.slice(0, 8)} arrows pagination />
      ) : (
        <SliderSkeleton />
      )}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
        <p>
          When the page has a <code>.grid &gt; .subgrid</code> column (like
          this demo), the slider measures it and aligns the active panel and
          caption to it; otherwise the layout props are the standalone
          fallback — see the <Link to="/docs/api">API reference</Link>.
        </p>
      </DocsBlock>
    </>
  );
}
