import { Slider } from "../../../../src/index.jsx";
import { SliderSkeleton } from "../../SliderSkeleton.jsx";
import { useVideos, useProjects } from "../../useDemoData.js";
import { DocsIntro, DocsBlock, DocsExampleHeading } from "./DocsBlocks.jsx";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const SNIPPET = `// Items with a \`video\` URL autoplay (muted, looping) while active.
const items = [{ src: poster, video: mp4Url, title, meta }];

// Ambient loops only (default)
<Slider items={items} />

// Full playback UI: a hover play/pause toggle on the panel, and a progress
// bar in the lightbox that expands to timestamp + mute / PiP / fullscreen.
<Slider items={items} videoControls />

// Minimal: keep only the play/pause toggle and progress bar in the lightbox
<Slider items={items} videoControls="minimal" />

// Videos and plain photos mix freely — a photo is just an item with no \`video\`
<Slider items={[photo, video, photo, video]} videoControls />`;

// Alternate video and photo items (unique ids so keys never collide).
function interleave(videos, photos) {
  const out = [];
  const n = Math.min(videos.length, photos.length);
  for (let i = 0; i < n; i++) {
    out.push({ ...videos[i], id: `v-${videos[i].id ?? i}` });
    out.push({ ...photos[i], id: `p-${photos[i].id ?? i}` });
  }
  return out;
}

export default function VideoPage() {
  const videos = useVideos();
  const projects = useProjects();
  const mixed =
    videos && videos.length > 0 && projects
      ? interleave(videos, projects)
      : null;

  return (
    <>
      <DocsIntro>
        Any item with a <code>video</code> URL renders a looping muted clip
        over its poster image — only the active panel plays. With{" "}
        <code>videoControls</code>, hovering the active panel reveals a morphing
        play/pause toggle (and softly blurs the clip); in the lightbox a
        minified progress bar expands on hover into a timestamp plus mute,
        picture-in-picture, and fullscreen controls. Clips from the Pexels
        Video API.
      </DocsIntro>
      {videos === null ? (
        <SliderSkeleton />
      ) : videos.length > 0 ? (
        <>
          <DocsExampleHeading title="Full controls">
            Hover the panel for play/pause; open the lightbox and hover for the
            timestamp, mute, picture-in-picture, and fullscreen.
          </DocsExampleHeading>
          <Slider items={videos} videoControls />
          <DocsExampleHeading title="Minimal player">
            <code>videoControls=&quot;minimal&quot;</code> keeps only the
            play/pause toggle and the progress bar in the lightbox.
          </DocsExampleHeading>
          <Slider items={videos} videoControls="minimal" />
          <DocsExampleHeading title="Mixed with photos">
            One slider can hold both — video items get the player UI, plain
            photos are shown as-is.
          </DocsExampleHeading>
          {mixed ? (
            <Slider items={mixed} videoControls />
          ) : (
            <SliderSkeleton />
          )}
        </>
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
          track entirely (poster only) — the coverflow lightbox still plays
          them.
        </p>
      </DocsBlock>
    </>
  );
}
