/**
 * Grid-wrapped building blocks shared by the docs pages: an intro header and a
 * content block (code, tables, prose). Sliders render between them, full-bleed,
 * measuring the page's subgrid for alignment.
 */

export function DocsIntro({ title, children }) {
  return (
    <div className="grid">
      <div className="subgrid">
        <header className="docs__intro">
          <h2>{title}</h2>
          <p>{children}</p>
        </header>
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
