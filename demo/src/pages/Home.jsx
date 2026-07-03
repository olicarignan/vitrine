import { Link } from "react-router";
import { IconLink } from "../IconLink";
import { ArrowIcon } from "../ArrowIcon";
// Import the library straight from source — the demo doubles as a smoke test of
// the package's public entry. Consumers instead import from "vitrine".
import { Slider } from "../../../src/index.jsx";
import { SliderSkeleton } from "../SliderSkeleton.jsx";
import { InstallTabs } from "../components/InstallTabs.jsx";
import { CodeBlock } from "../components/CodeBlock.jsx";
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
            <p>Opinionated gallery slider with lightbox and video support.</p>
            <div className="credit">
              <span>Images from the</span>
              <IconLink href="https://www.artic.edu/" icon={<ArrowIcon />}>
                Art Institue of Chicago
              </IconLink>
            </div>
            <div className="features">
              <span>Browse the</span>
              <Link className="icon-link" to="/docs">
                <span className="icon-link__icon">
                  <ArrowIcon />
                </span>
                <span className="icon-link__text">docs & demos</span>
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
            <p className="install__link">
              Browse the <Link to="/docs">documentation &amp; live demos</Link>,
              or check the project on{" "}
              <a
                href="https://github.com/olicarignan/vitrine"
                target="_blank"
                rel="noopener noreferrer"
              >
                Github
              </a>
            </p>
          </section>
          <section className="credits">
            <div className="credit">
              <span>Made by</span>
              <IconLink href="https://oliviercarignan.com">
                Olivier Carignan
              </IconLink>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
