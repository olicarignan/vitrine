/**
 * Grid-wrapped building blocks shared by the docs pages: an intro header and a
 * content block (code, tables, prose). Sliders render between them, full-bleed,
 * measuring the page's subgrid for alignment.
 */

export function DocsIntro({ children }) {
  // The page name lives in the docs header's subtitle; the intro is just the
  // lead paragraph.
  return (
    <div className="grid">
      <div className="subgrid">
        <header className="docs__intro">
          <p>{children}</p>
        </header>
      </div>
    </div>
  );
}

/** Left-aligned title + short description sitting directly above an example. */
export function DocsExampleHeading({ title, children }) {
  return (
    <div className="grid docs__example-heading">
      <div className="subgrid">
        <h3 className="docs__example-title">{title}</h3>
        {children ? <p className="docs__example-desc">{children}</p> : null}
      </div>
    </div>
  );
}

export function DocsBlock({ children }) {
  return (
    <div className="grid">
      <div className="subgrid">
        {/* Reuses the landing page's install-section typography for code/pre. */}
        <section className="page__install docs__block">{children}</section>
      </div>
    </div>
  );
}
