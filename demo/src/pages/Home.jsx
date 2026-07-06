import { Link } from "react-router";
import { ArrowIcon } from "../ArrowIcon";
// Import the library straight from source — the demo doubles as a smoke test of
// the package's public entry. Consumers instead import from "vitrine".
import { Slider } from "../../../src/index.jsx";
import { SliderSkeleton } from "../SliderSkeleton.jsx";
import { InstallTabs } from "../components/InstallTabs.jsx";
import { CodeBlock } from "../components/CodeBlock.jsx";
import { Footer } from "../components/Footer.jsx";
import { useProjects } from "../useDemoData.js";

// Usage snippet shown under the install tabs, also the copy target.
const USAGE = `import { Slider } from "vitrine";
import "vitrine/styles.css";

<Slider items={items} />;`;

export default function Home() {
  const projects = useProjects();

  return (
    <main className="page">
      <div className="grid">
        <div className="subgrid">
          <header className="page__header">
            <h1>Vitrine</h1>
            <p>
              Opinionated gallery slider with lightbox, video support and
              alternate layouts.
            </p>
            <div className="features">
              <Link className="docs-link" to="/docs">
                Documentation
              </Link>
            </div>
          </header>
        </div>
      </div>
      {projects ? <Slider items={projects} morphCursor /> : <SliderSkeleton />}
      <div className="grid">
        <div className="subgrid">
          <section className="page__install">
            <h2>Install</h2>
            <InstallTabs />
            <h3>Usage</h3>
            <CodeBlock code={USAGE} label="Copy usage snippet" />
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
