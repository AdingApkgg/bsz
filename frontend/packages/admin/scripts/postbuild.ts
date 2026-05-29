#!/usr/bin/env bun
// Static-host helpers for the Vite build. Vite emits a single index.html;
// client-side routes (/welcome, /app/...) need fallbacks on the hosting layer:
//   - 404.html → GitHub Pages SPA fallback
//   - _redirects → Cloudflare Pages / Netlify SPA fallback
//   - .nojekyll → GH Pages: don't strip /assets

import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "dist");
const indexHtml = join(OUT, "index.html");

if (!existsSync(indexHtml)) {
  console.error("[postbuild] dist/index.html missing — did `vite build` succeed?");
  process.exit(1);
}

copyFileSync(indexHtml, join(OUT, "404.html"));
writeFileSync(join(OUT, "_redirects"), "/* /index.html 200\n");
writeFileSync(join(OUT, ".nojekyll"), "");

console.log("[postbuild] wrote 404.html, _redirects, .nojekyll");
