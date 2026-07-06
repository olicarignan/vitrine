import { useState } from "react";
import { TextMorph } from "metamorphosis/react";
import { CopyButton } from "./CopyButton";

// Install command per package manager — the morph target for the install tabs.
const INSTALL = [
  { id: "pnpm", cmd: "pnpm i github:olicarignan/vitrine" },
  { id: "npm", cmd: "npm i github:olicarignan/vitrine" },
  { id: "bun", cmd: "bun i github:olicarignan/vitrine" },
  { id: "yarn", cmd: "yarn add github:olicarignan/vitrine" },
];

/**
 * Install snippet with package-manager tabs. The command is wrapped in a
 * TextMorph so switching tabs morphs one command into the next, and a copy
 * button morphs from a copy icon to a checkmark once the command is copied.
 */
export function InstallTabs() {
  const [active, setActive] = useState(0);

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
            onClick={() => setActive(i)}
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

        <CopyButton text={INSTALL[active].cmd} label="Copy install command" />
      </div>
    </div>
  );
}
