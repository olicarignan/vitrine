import { Link, NavLink, Outlet, ScrollRestoration } from "react-router";

const PAGES = [
  { to: "/docs", label: "Start", end: true },
  { to: "/docs/carousel", label: "Carousel" },
  { to: "/docs/captions", label: "Captions" },
  { to: "/docs/video", label: "Video" },
  { to: "/docs/lightbox", label: "Lightbox" },
  { to: "/docs/cursor", label: "Cursor" },
  { to: "/docs/stack", label: "Stack" },
  { to: "/docs/coverflow", label: "Coverflow" },
  { to: "/docs/navigation", label: "Navigation" },
  { to: "/docs/multiple", label: "Multiple" },
];

/**
 * Shell for the /docs section: title, page nav, and the routed page below.
 * Every docs page renders its own `.grid > .subgrid` blocks; the sliders
 * measure the page's subgrid, so all pages share the landing page's geometry.
 */
export default function DocsLayout() {
  return (
    <main className="page docs">
      <div className="grid">
        <div className="subgrid">
          <header className="page__header docs__header">
            <h1>
              <Link to="/">Vitrine</Link>{" "}
              <span className="docs__crumb">/ Docs</span>
            </h1>
            <nav className="docs__nav" aria-label="Documentation pages">
              {PAGES.map((page) => (
                <NavLink key={page.to} to={page.to} end={page.end}>
                  {page.label}
                </NavLink>
              ))}
            </nav>
          </header>
        </div>
      </div>
      <Outlet />
      <ScrollRestoration />
    </main>
  );
}
