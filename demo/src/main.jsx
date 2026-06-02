import { createRoot } from "react-dom/client";
import App from "./App.jsx";

import "./demo.css";
import "./grid.css";
// The slider + lightbox styles come straight from the library source so the
// demo exercises the real package. Consumers instead import "slider-lightbox/styles.css".
import "../../src/styles.css";

// Note: intentionally not wrapped in <StrictMode>. The slider relies on a single
// pass of its measure / scroll / view-transition effects; StrictMode's dev-only
// double-invoke causes visible glitches with the shared-element zoom.
createRoot(document.getElementById("root")).render(<App />);
