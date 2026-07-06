import { CopyButton } from "./CopyButton";

// Split code into text + comment segments so comments render paler than the
// code. Handles both line comments (`//` to end of line, skipping the `//` in
// URLs like `https://`) and block comments (`/* ... */`, which may span lines).
function highlight(code) {
  const nodes = [];
  let buf = "";
  let key = 0;
  const flush = () => {
    if (buf) {
      nodes.push(buf);
      buf = "";
    }
  };

  for (let i = 0; i < code.length; ) {
    const pair = code.slice(i, i + 2);
    if (pair === "//" && code[i - 1] !== ":") {
      flush();
      let end = code.indexOf("\n", i);
      if (end === -1) end = code.length;
      nodes.push(
        <span key={key++} className="usage__comment">
          {code.slice(i, end)}
        </span>,
      );
      i = end;
    } else if (pair === "/*") {
      flush();
      const close = code.indexOf("*/", i + 2);
      const end = close === -1 ? code.length : close + 2;
      nodes.push(
        <span key={key++} className="usage__comment">
          {code.slice(i, end)}
        </span>,
      );
      i = end;
    } else {
      buf += code[i];
      i += 1;
    }
  }
  flush();
  return nodes;
}

/** Code snippet with the copy button anchored top-right (the .usage pattern). */
export function CodeBlock({ code, label = "Copy code" }) {
  return (
    <div className="usage">
      <pre>
        <code>{highlight(code)}</code>
      </pre>
      <CopyButton className="usage__copy" text={code} label={label} />
    </div>
  );
}
