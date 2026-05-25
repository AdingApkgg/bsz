import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [solid(), tsconfigPaths()],
  server: { port: 12706, strictPort: false },
  preview: { port: 12706, strictPort: false },
  build: { target: "esnext" },
  resolve: { dedupe: ["solid-js"] },
});
