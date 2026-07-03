import { Slider, PlainCaption } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useProjects, splitItems } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `import { Slider, PlainCaption } from "vitrine";

// Default: captions morph between items (metamorphosis TextMorph)
<Slider items={items} />

// Opt out of the animation
<Slider items={items} Caption={PlainCaption} />

// Or bring your own — anything taking \`as\` + \`children\`
const Custom = ({ as: Tag = "span", children }) => (
  <Tag className="fancy">{children}</Tag>
);
<Slider items={items} Caption={Custom} />`;

export default function CaptionsPage() {
  const projects = useProjects();
  const [morphItems, plainItems] = splitItems(projects);

  return (
    <>
      <DocsIntro title="Captions">
        By default the caption morphs from one item&apos;s title to the
        next&apos;s as you navigate. Pass <code>PlainCaption</code> (or your
        own component) to opt out. First slider: morphing. Second: plain.
      </DocsIntro>
      {morphItems ? <Slider items={morphItems} /> : <SliderSkeleton />}
      {plainItems ? (
        <Slider items={plainItems} Caption={PlainCaption} />
      ) : (
        <SliderSkeleton />
      )}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
      </DocsBlock>
    </>
  );
}
