#!/usr/bin/env bun
// Regenerate public/og.png from scripts/og-template.html using headless
// system Chrome on macOS. No npm deps — just shell out to Chrome's
// built-in --screenshot flag.
//
// Run: bun run gen:og
//
// On Linux/Windows: adapt CHROME_BIN below to your installed browser
// (e.g. /usr/bin/google-chrome, /usr/bin/chromium).

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const CHROME_BIN = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!existsSync(CHROME_BIN)) {
  console.error(
    `[gen:og] Chrome not found at ${CHROME_BIN}. Set CHROME_BIN env var or install Google Chrome.`,
  );
  process.exit(1);
}

const ROOT = resolve(import.meta.dir, "..");
const TEMPLATE = resolve(ROOT, "scripts/og-template.html");
const OUT = resolve(ROOT, "public/og.png");

if (!existsSync(TEMPLATE)) {
  console.error(`[gen:og] template missing at ${TEMPLATE}`);
  process.exit(1);
}

// Chrome refuses --screenshot from file:// in newer versions unless given
// a fresh profile dir. Use a tmp one and clean up after.
const profile = mkdtempSync(join(tmpdir(), "chrome-og-"));
try {
  const result = spawnSync(
    CHROME_BIN,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--window-size=1200,630",
      `--user-data-dir=${profile}`,
      `--screenshot=${OUT}`,
      `file://${TEMPLATE}`,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    console.error(`[gen:og] Chrome exited with ${result.status}`);
    process.exit(result.status ?? 1);
  }
  console.log(`[gen:og] wrote ${OUT}`);
} finally {
  rmSync(profile, { recursive: true, force: true });
}
