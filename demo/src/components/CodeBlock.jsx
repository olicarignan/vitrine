import { CopyButton } from "./CopyButton";

/** Code snippet with the copy button anchored top-right (the .usage pattern). */
export function CodeBlock({ code, label = "Copy code" }) {
  return (
    <div className="usage">
      <pre>
        <code>{code}</code>
      </pre>
      <CopyButton className="usage__copy" text={code} label={label} />
    </div>
  );
}
