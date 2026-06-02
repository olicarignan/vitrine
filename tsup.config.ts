import { defineConfig } from "tsup";

export default defineConfig({
  // JS entry + a standalone stylesheet (slider.css + lightbox.css, with the
  // cursors inlined) emitted as dist/styles.css.
  entry: { index: "src/index.jsx", styles: "src/styles.css" },
  format: ["esm", "cjs"],
  clean: true,
  treeshake: true,
  minify: true,
  // react/react-dom are peers; motion is a runtime dep — never bundle them.
  external: ["react", "react-dom", "motion"],
  esbuildOptions(options) {
    // React 17+ automatic runtime — source files don't import React.
    options.jsx = "automatic";
  },
});
