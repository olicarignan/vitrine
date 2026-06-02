import { useEffect, useRef, useState } from "react";
import { TextMorph } from "metamorphosis/react";
import { IconLink } from "./IconLink";
// Import the library straight from source — the demo doubles as a smoke test of
// the package's public entry. Consumers instead import from "vitrine".
import { Slider } from "../../src/index.jsx";
import { SliderSkeleton } from "./SliderSkeleton.jsx";
import { fetchRandomProjects } from "./demo-data.js";

// Install command per package manager — the morph target for the install tabs.
const INSTALL = [
  { id: "pnpm", cmd: "pnpm i github:olicarignan/vitrine" },
  { id: "npm", cmd: "npm i github:olicarignan/vitrine" },
  { id: "bun", cmd: "bun i github:olicarignan/vitrine" },
  { id: "yarn", cmd: "yarn add github:olicarignan/vitrine" },
];

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
            <h1>Vitrine</h1>
            <p>
              Drag, scroll or arrow keys to navigate. Click to open lightbox.
            </p>
          </header>
        </div>
      </div>
      {projects ? <Slider items={projects} /> : <SliderSkeleton />}
      <div className="grid">
        <div className="subgrid">
          <section className="page__install">
            <h2>Install</h2>
            <InstallTabs />
            <h3>Usage</h3>
            <pre>
              <code>{`import { Slider } from "vitrine";
import "vitrine/styles.css";

<Slider items={items} />;`}</code>
            </pre>
            <p className="install__link">
              For documentation, check the project on{" "}
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

const GitHubIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

/**
 * Install snippet with package-manager tabs. The command is wrapped in a
 * TextMorph so switching tabs morphs one command into the next, and a copy
 * button morphs from a copy icon to a checkmark once the command is copied.
 */
function InstallTabs() {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(null);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL[active].cmd);
      setCopied(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="install">
      <div
        className="install__tabs"
        role="tablist"
        aria-label="Package manager"
      >
        {INSTALL.map((m, i) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={i === active ? "is-active" : undefined}
            onClick={() => {
              setActive(i);
              setCopied(false);
            }}
          >
            {m.id}
          </button>
        ))}
      </div>

      <div className="install__command">
        <div className="install__scroll">
          <TextMorph className="install__code" granularity="grapheme">
            {INSTALL[active].cmd}
          </TextMorph>
        </div>

        <button
          type="button"
          className={`install__copy${copied ? " is-copied" : ""}`}
          onClick={copyCommand}
          aria-label={copied ? "Copied" : "Copy install command"}
        >
          <span className="install__copy-icons">
            <span className="install__copy-icon install__copy-icon--copy">
              <CopyIcon />
            </span>
            <span className="install__copy-icon install__copy-icon--check">
              <CheckIcon />
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

const CopyIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M10 4H5C4.44772 4 4 4.44772 4 5V10C4 10.5523 4.44772 11 5 11H10C10.5523 11 11 10.5523 11 10V5C11 4.44772 10.5523 4 10 4Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 8C1.45 8 1 7.55 1 7V2C1 1.45 1.45 1 2 1H7C7.55 1 8 1.45 8 2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
