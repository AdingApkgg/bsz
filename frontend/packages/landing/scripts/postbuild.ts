#!/usr/bin/env bun
// SPA fallbacks for the landing build. Landing is a single page so this is
// strictly defensive — anyone hitting /foo on a misconfigured host still
// gets the page back.

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
