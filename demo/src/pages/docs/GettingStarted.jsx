import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { InstallTabs } from "../../components/InstallTabs.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const USAGE = `import { Slider } from "@ocarignan/vitrine";
import "@ocarignan/vitrine/styles.css";

<Slider items={items} />;`;

const TOKENS = `:root {
  --gap: 32px;            /* panel gap (matches the gap prop) */
  --accent-color: #131718; /* captions, dots, arrows */
  --text-color: #63635e;   /* secondary meta line */
  --color-text: #131718;   /* lightbox controls */

  /* Lets the rest of the page cross-fade during the lightbox zoom */
  view-transition-name: root;
}`;

const ITEM = `{
  id,          // unique key (falls back to array index)
  title,       // shown in the meta line
  meta,        // secondary meta line (e.g. "Brand · 2024")
  src,         // required: featured image URL
  srcSet,      // optional responsive srcset
  webpSrcSet,  // optional webp <source> srcset
  blurDataURL, // low-quality placeholder (data URI)
  alt,         // alt text (defaults to title)
  highResSrc,  // hi-res image for the lightbox
  video,       // looping muted video URL (row variant + lightbox)
}`;

export default function GettingStarted() {
  return (
    <>
      <DocsIntro>
        Vitrine is a React gallery slider with a shared-element zoom into a
        fullscreen lightbox. Install it, import the stylesheet once, and pass
        an array of items.
      </DocsIntro>
      <DocsBlock>
        <h3>Install</h3>
        <InstallTabs />
        <h3>Usage</h3>
        <CodeBlock code={USAGE} label="Copy usage snippet" />
        <h3>Required CSS tokens</h3>
        <p>
          The components read a few custom properties from your page, and the
          shared-element zoom needs a root view-transition name:
        </p>
        <CodeBlock code={TOKENS} label="Copy CSS tokens" />
        <h3>Item shape</h3>
        <CodeBlock code={ITEM} label="Copy item shape" />
        <h3>Multiple sliders</h3>
        <p>
          Any number of sliders can live on one page: each instance generates
          its own shared-element view-transition name, so every lightbox zooms
          back to the right panel. Pass <code>transitionName</code> to override
          the generated name. The one caveat is <code>morphCursor</code> — each
          slider renders its own follower cursor, so enable it on at most one
          slider per page.
        </p>
        <p>
          Note: don&apos;t wrap the slider in <code>&lt;StrictMode&gt;</code> —
          its measure / scroll / view-transition effects rely on a single pass.
        </p>
      </DocsBlock>
    </>
  );
}
