import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from "react-router";
import { Footer } from "../../components/Footer.jsx";

// Single source for the sidebar and the header subtitle.
const SECTIONS = [
  {
    label: "Basics",
    pages: [
      { to: "/docs", label: "Getting started", end: true },
      { to: "/docs/api", label: "API" },
    ],
  },
  {
    label: "Examples",
    pages: [
      { to: "/docs/slider", label: "Slider" },
      { to: "/docs/lightbox", label: "Lightbox" },
      { to: "/docs/video", label: "Video" },
      { to: "/docs/coverflow", label: "Coverflow" },
      { to: "/docs/stack", label: "Stack" },
    ],
  },
];

/**
 * Shell for the /docs section: the landing page's title/subtitle header (the
 * title links home, the subtitle names the current page), a sectioned nav, and
 * the routed page below. On wide viewports the nav is a fixed, page-background
 * strip in the left gutter — full-bleed slider panels slide beneath it; on
 * narrow ones it collapses to a hamburger that opens a full-screen overlay
 * menu (reusing the lightbox backdrop's blur/scrim). Every page shares the
 * landing page's footer.
 */
export default function DocsLayout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const activeLabel =
    SECTIONS.flatMap((s) => s.pages).find((p) =>
      p.end ? pathname === p.to : pathname.startsWith(p.to),
    )?.label ?? "Docs";

  // Close the menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // While the overlay is open, lock body scroll and close on Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const renderGroups = (onClick) => {
    // A running index across labels + links drives the menu's staggered
    // fade-in (via the --stagger custom property; unused by the desktop nav).
    let i = 0;
    return SECTIONS.map((section) => (
      <div key={section.label} className="docs__sidebar-group">
        <h2 className="docs__sidebar-label" style={{ "--stagger": i++ }}>
          {section.label}
        </h2>
        <ul>
          {section.pages.map((page) => (
            <li key={page.to}>
              <NavLink
                to={page.to}
                end={page.end}
                className={({ isActive }) =>
                  `docs__navlink${isActive ? " active" : ""}`
                }
                style={{ "--stagger": i++ }}
                onClick={onClick}
              >
                {page.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    ));
  };

  return (
    <main className="page docs">
      <div className="grid">
        <div className="subgrid">
          <header className="page__header docs__header">
            <h1>
              <Link to="/">Vitrine</Link>
            </h1>
            <p>{activeLabel}</p>
            <button
              type="button"
              className="docs__menu-toggle"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                <path
                  d="M3 6.5h16M3 11h16M3 15.5h16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>
          <nav className="docs__sidebar" aria-label="Documentation pages">
            {renderGroups()}
          </nav>
        </div>
      </div>

      {menuOpen && (
        <div
          className="docs__menu"
          role="dialog"
          aria-modal="true"
          aria-label="Documentation menu"
        >
          <div
            className="docs__menu-backdrop"
            onClick={() => setMenuOpen(false)}
          />
          <button
            type="button"
            className="docs__menu-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <path
                d="M5 5l12 12M17 5L5 17"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <nav className="docs__menu-nav" aria-label="Documentation pages">
            {renderGroups(() => setMenuOpen(false))}
          </nav>
        </div>
      )}

      <Outlet />
      <Footer />
      <ScrollRestoration />
    </main>
  );
}
