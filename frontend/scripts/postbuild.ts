#!/usr/bin/env bun
// Static-host helpers: a SolidStart `ssr: false` build emits a single
// index.html, but GitHub Pages and Cloudflare Pages need explicit fallbacks
// for client-side routes. This script:
//   - copies index.html to 404.html (GH Pages SPA fallback)
//   - mirrors index.html to /admin/index.html (so /admin works on any host)
//   - writes a `_redirects` file for Cloudflare Pages / Netlify
//   - writes a `.nojekyll` so GH Pages serves _build/ assets

import { copyFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), ".output", "public");

if (!existsSync(join(OUT, "index.html"))) {
  console.error("[postbuild] .output/public/index.html missing — did `vinxi build` succeed?");
  process.exit(1);
}

const indexHtml = join(OUT, "index.html");

// GitHub Pages SPA fallback
copyFileSync(indexHtml, join(OUT, "404.html"));

// /admin direct URL
mkdirSync(join(OUT, "admin"), { recursive: true });
copyFileSync(indexHtml, join(OUT, "admin", "index.html"));

// Cloudflare Pages / Netlify
writeFileSync(join(OUT, "_redirects"), "/* /index.html 200\n");

// GH Pages: don't apply Jekyll processing (preserves _build/ etc.)
writeFileSync(join(OUT, ".nojekyll"), "");

console.log("[postbuild] wrote 404.html, admin/index.html, _redirects, .nojekyll");
