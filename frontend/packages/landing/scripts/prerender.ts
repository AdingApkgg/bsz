#!/usr/bin/env bun
// Optional SPA prerender — snapshots /, /en, /ja into static HTML files so
// non-JS crawlers (older Baidu, some LLM bots) get the full content in the
// initial response instead of just the SPA shell.
//
// This script is OPT-IN. It's NOT wired into `bun run build` because
// Playwright adds ~150MB to install footprint and modern crawlers
// (Google, GPTBot, ClaudeBot, modern Baidu via 渲染服务) run JS anyway.
//
// To enable:
//   bun add -D playwright
//   bunx playwright install chromium
//   bun run build:prerender
//
// Output: dist/index.html (zh, overwrites SPA shell with rendered HTML)
//         dist/en/index.html
//         dist/ja/index.html
// Each one is the hydrated DOM at the moment networkidle is reached.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let chromium: typeof import("playwright").chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "[prerender] playwright not installed. Run: bun add -D playwright && bunx playwright install chromium",
  );
  process.exit(1);
}

const OUT = join(process.cwd(), "dist");
const PORT = 4173; // vite preview default
const BASE = `http://localhost:${PORT}`;
const ROUTES = ["/", "/en", "/ja"];

// Start `vite preview` against the freshly built dist/ folder.
const preview = spawn("bun", ["x", "vite", "preview", "--port", String(PORT), "--strictPort"], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
});

await waitFor(`${BASE}/`, 20_000);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

try {
  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    console.log(`[prerender] ${route}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 15_000 });
    // Wait one extra tick so Motion settles and effects (head updates) run.
    await page.waitForTimeout(400);
    const html = `<!doctype html>\n${await page.content()}`;
    const target = route === "/" ? join(OUT, "index.html") : join(OUT, route.slice(1), "index.html");
    if (route !== "/") mkdirSync(join(OUT, route.slice(1)), { recursive: true });
    writeFileSync(target, html);
  }
} finally {
  await browser.close();
  preview.kill("SIGTERM");
}

console.log(`[prerender] wrote ${ROUTES.length} prerendered HTML files`);

async function waitFor(url: string, ms: number) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server at ${url} did not become reachable within ${ms}ms`);
}
