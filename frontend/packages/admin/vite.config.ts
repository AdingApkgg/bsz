import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [solid(), tsconfigPaths()],
  server: { port: 12705, strictPort: false },
  preview: { port: 12705, strictPort: false },
  build: {
    target: "esnext",
    // Smaller chunks for chart.js + the lazy admin pages so first paint
    // (the welcome screen) ships <100 KB.
    chunkSizeWarningLimit: 800,
  },
  resolve: {
    // Force HMR / module identity through a single React-like instance
    // (here Solid) — without this, importing solid-js via @bsz/shared and
    // directly in admin pages can yield two copies of the runtime.
    dedupe: ["solid-js"],
  },
});
