import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The demo imports the library straight from ../src (JSX), so allow Vite to
  // read one level up, and dedupe the shared deps to a single copy (the library
  // lists react/react-dom as peers and would otherwise resolve its own).
  resolve: { dedupe: ["react", "react-dom", "motion"] },
  server: { fs: { allow: [".."] } },
});
