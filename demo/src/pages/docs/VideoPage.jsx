import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useVideos } from "../../useDemoData.js";
import { DocsIntro, DocsBlock } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Items with a \`video\` URL autoplay (muted, looping) while active.
const items = [{ src: poster, video: mp4Url, title, meta }];

// Ambient loops only (default)
<Slider items={items} />

// Add play/pause + mute + scrubber on the active panel and in the lightbox
<Slider items={items} videoControls />`;

export default function VideoPage() {
  const videos = useVideos();

  return (
    <>
      <DocsIntro title="Video">
        Any item with a <code>video</code> URL renders a looping muted clip
        over its poster image — only the active panel plays. With{" "}
        <code>videoControls</code>, a play/pause + mute + scrubber bar sits on
        the active panel and in the lightbox. Clips from the Pexels Video API.
      </DocsIntro>
      {videos === null ? (
        <SliderSkeleton />
      ) : videos.length > 0 ? (
        <Slider items={videos} videoControls />
      ) : (
        <DocsBlock>
          <p>
            This demo needs a (free) Pexels API key. Set{" "}
            <code>VITE_PEXELS_KEY</code> in <code>demo/.env.local</code> and
            reload.
          </p>
        </DocsBlock>
      )}
      <DocsBlock>
        <CodeBlock code={SNIPPET} />
        <p>
          The slider panel and the lightbox are separate <code>&lt;video&gt;</code>{" "}
          elements, so the mute state and playback position don&apos;t carry
          across the zoom. The stack and coverflow variants skip videos in the
          track entirely (poster only) — the lightbox still plays them.
        </p>
      </DocsBlock>
    </>
  );
}
