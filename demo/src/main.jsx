import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Analytics } from "@vercel/analytics/react";
import Home from "./pages/Home.jsx";
import DocsLayout from "./pages/docs/DocsLayout.jsx";
import GettingStarted from "./pages/docs/GettingStarted.jsx";
import ApiPage from "./pages/docs/ApiPage.jsx";
import SliderPage from "./pages/docs/SliderPage.jsx";
import VideoPage from "./pages/docs/VideoPage.jsx";
import LightboxPage from "./pages/docs/LightboxPage.jsx";
import StackPage from "./pages/docs/StackPage.jsx";
import CoverflowPage from "./pages/docs/CoverflowPage.jsx";

import "./demo.css";
import "./grid.css";
// The slider + lightbox styles come straight from the library source so the
// demo exercises the real package. Consumers instead import "vitrine/styles.css".
import "../../src/styles.css";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  {
    path: "/docs",
    element: <DocsLayout />,
    children: [
      { index: true, element: <GettingStarted /> },
      { path: "api", element: <ApiPage /> },
      { path: "slider", element: <SliderPage /> },
      { path: "video", element: <VideoPage /> },
      { path: "lightbox", element: <LightboxPage /> },
      { path: "coverflow", element: <CoverflowPage /> },
      { path: "stack", element: <StackPage /> },
    ],
  },
]);

// Note: intentionally not wrapped in <StrictMode>. The slider relies on a single
// pass of its measure / scroll / view-transition effects; StrictMode's dev-only
// double-invoke causes visible glitches with the shared-element zoom.
// Render Analytics as a sibling of the router (not a wrapper) so it doesn't
// change the app tree — keeping the no-StrictMode single-pass guarantee intact.
createRoot(document.getElementById("root")).render(
  <>
    <RouterProvider router={router} />
    <Analytics />
  </>,
);
