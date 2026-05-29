#!/usr/bin/env bun
// SPA fallbacks + static-asset URL substitution.
//
// The landing ships a few text assets (`llms.txt`, `robots.txt`,
// `sitemap.xml`) that need to reference the canonical origin. We use the
// `__SITE_URL__` placeholder in the source files and substitute it here at
// build time so users don't have to ship a custom Vite plugin or
// hand-edit files.
//
// Source: VITE_SITE_URL env var (no trailing slash). If unset, we fall
// back to a clearly-fake placeholder so unconfigured deploys don't claim
// to be at someone else's domain.

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CWD = process.cwd();
const OUT = join(CWD, "dist");
const indexHtml = join(OUT, "index.html");

if (!existsSync(indexHtml)) {
  console.error("[postbuild] dist/index.html missing — did `vite build` succeed?");
  process.exit(1);
}

// Mirror Vite's .env load order for production builds. Bun only auto-loads
// `.env.production` when NODE_ENV is set, which it isn't in this chained
// `vite build && bun scripts/postbuild.ts` step. Loading explicitly keeps
// the substitution deterministic regardless of which shell or CI launches us.
// Order: later files override earlier. Shell env always wins.
const shellKeys = new Set(Object.keys(process.env));
for (const file of [".env", ".env.local", ".env.production", ".env.production.local"]) {
  loadEnvFile(join(CWD, file), shellKeys);
}

const FALLBACK_URL = "https://your-domain.example";
const rawSiteUrl = process.env.VITE_SITE_URL?.trim();
const siteUrl = rawSiteUrl?.replace(/\/+$/, "") || FALLBACK_URL;
if (!rawSiteUrl) {
  console.warn(
    `[postbuild] VITE_SITE_URL not set; static helpers will reference ${FALLBACK_URL}. ` +
      `Set VITE_SITE_URL=https://your-deploy.example to bake in the real origin.`,
  );
}

// index.html is in the list so `og:image`, `twitter:image`, JSON-LD
// `screenshot` etc. point at absolute URLs in the pre-hydration HTML
// crawlers fetch. (404.html is copied from index.html below, so it
// inherits the substitution.)
const SUBSTITUTE = ["index.html", "llms.txt", "llms-full.txt", "robots.txt", "sitemap.xml"];
for (const name of SUBSTITUTE) {
  const path = join(OUT, name);
  if (!existsSync(path)) continue;
  const original = readFileSync(path, "utf8");
  const swapped = original.replaceAll("__SITE_URL__", siteUrl);
  if (swapped !== original) writeFileSync(path, swapped);
}

copyFileSync(indexHtml, join(OUT, "404.html"));
writeFileSync(join(OUT, "_redirects"), "/* /index.html 200\n");
writeFileSync(join(OUT, ".nojekyll"), "");

console.log(`[postbuild] wrote 404.html, _redirects, .nojekyll; site_url=${siteUrl}`);

// Minimal .env parser — same shape Vite/dotenv handle. Comments, blank
// lines, optional surrounding quotes, KEY=VALUE only (no expansion).
function loadEnvFile(path: string, shellKeys: Set<string>) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (shellKeys.has(key)) continue;
    process.env[key] = val;
  }
}
