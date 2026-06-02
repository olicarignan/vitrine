import { useEffect, useState } from "react";
import { TextMorph } from "metamorphosis/react";
// Import the library straight from source — the demo doubles as a smoke test of
// the package's public entry. Consumers instead import from "slider-lightbox".
import { Slider } from "../../src/index.jsx";
import { SliderSkeleton } from "./SliderSkeleton.jsx";
import { fetchRandomProjects } from "./demo-data.js";

export default function App() {
  const [projects, setProjects] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Constrain to roughly landscape-to-square artworks; drop tall portraits and
    // wide panoramas. Omit the opts to accept any aspect ratio.
    fetchRandomProjects(6, { minAspect: 0.7, maxAspect: 1.8 }).then((items) => {
      if (!cancelled) setProjects(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page">
      <div className="grid">
        <div className="subgrid">
          <header className="page__header">
            <h1>Gallery</h1>
            <p>Drag, scroll or arrow keys to navigate. Click to open lightbox.</p>
          </header>
        </div>
      </div>
      {projects ? (
        <Slider items={projects} Caption={TextMorph} />
      ) : (
        <SliderSkeleton />
      )}
      <div className="grid">
        <div className="subgrid">
          <section className="page__install">
            <h2>Use it in your project</h2>
            <p>Install from GitHub (React and motion come along as deps):</p>
            <pre>
              <code>pnpm add github:olicarignan/slider-lightbox</code>
            </pre>
            <p>Import the styles once, then render the slider with your items:</p>
            <pre>
              <code>{`import { Slider } from "slider-lightbox";
import "slider-lightbox/styles.css";

<Slider items={items} />;`}</code>
            </pre>
            <p>
              The caption is plain text by default. To animate it (as this demo
              does), install <code>github:olicarignan/metamorphosis</code> and
              pass its component to the optional <code>Caption</code> prop:
            </p>
            <pre>
              <code>{`import { TextMorph } from "metamorphosis/react";

<Slider items={items} Caption={TextMorph} />;`}</code>
            </pre>
            <p>
              See the <code>README.md</code> for the full prop list, item shape,
              and required CSS tokens.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
