import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The demo imports the library straight from ../src (JSX), so allow Vite to
  // read one level up, and dedupe the shared deps to a single copy (the library
  // lists react/react-dom as peers and would otherwise resolve its own).
  // dedupe also forces these bare specifiers to resolve from the demo root —
  // without it the out-of-tree library source can't find them when only demo/
  // is installed (e.g. on Vercel, where the repo root has no node_modules).
  resolve: { dedupe: ["react", "react-dom", "motion", "metamorphosis"] },
  server: { fs: { allow: [".."] } },
});
