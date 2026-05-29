#!/usr/bin/env bun
// Bypass solidui-cli (which has a bug passing empty args to `bun add`) and
// pull components straight from the solid-ui registry. Run from the shared
// package; component sources land here, runtime deps go into the admin app.
//
// Usage: bun packages/shared/install-ui.ts <component>...
//        bun packages/shared/install-ui.ts --all

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { $ } from "bun";

const BASE = "https://www.solid-ui.com";
const UI_DIR = resolve(import.meta.dir, "src", "components", "ui");
const ADMIN_DIR = resolve(import.meta.dir, "..", "admin");

type IndexEntry = {
  name: string;
  type: "ui" | "example";
  files: string[];
  dependencies?: string[];
  registryDependencies?: string[];
};

type ItemFile = { name: string; content: string };
type Item = { name: string; files: ItemFile[]; dependencies?: string[] };

async function getIndex(): Promise<IndexEntry[]> {
  const res = await fetch(`${BASE}/registry/index.json`);
  if (!res.ok) throw new Error(`index.json: HTTP ${res.status}`);
  const arr = (await res.json()) as IndexEntry[];
  return arr.filter((e) => e.type === "ui");
}

async function getItem(name: string): Promise<Item> {
  const res = await fetch(`${BASE}/registry/ui/${name}.json`);
  if (!res.ok) throw new Error(`${name}.json: HTTP ${res.status}`);
  return (await res.json()) as Item;
}

function resolveTree(index: IndexEntry[], names: string[]): IndexEntry[] {
  const out: IndexEntry[] = [];
  const seen = new Set<string>();
  function visit(n: string) {
    if (seen.has(n)) return;
    const e = index.find((x) => x.name === n);
    if (!e) {
      console.warn(`  ! unknown component: ${n}`);
      return;
    }
    seen.add(n);
    for (const d of e.registryDependencies ?? []) visit(d);
    out.push(e);
  }
  for (const n of names) visit(n);
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("usage: install-ui.ts <component>... | --all");
    process.exit(1);
  }

  const index = await getIndex();
  const requested = args.includes("--all") ? index.map((e) => e.name) : args;
  const tree = resolveTree(index, requested);

  const allDeps = new Set<string>();
  for (const entry of tree) {
    const item = await getItem(entry.name);
    for (const file of item.files) {
      const target = resolve(UI_DIR, file.name);
      await mkdir(dirname(target), { recursive: true });
      // Rewrite the registry's internal alias scheme to relative paths.
      // Registry source uses `~/registry/ui/foo` for sibling components
      // and `~/lib/utils` for the cn helper.
      let content = file.content.replaceAll('"~/registry/ui/', '"./');
      content = content.replaceAll('"~/lib/utils"', '"../../lib/utils"');
      await writeFile(target, content);
    }
    for (const d of item.dependencies ?? []) {
      const trimmed = d.trim();
      if (trimmed) allDeps.add(trimmed);
    }
  }

  if (allDeps.size > 0) {
    const list = [...allDeps];
    await $`bun add ${list}`.cwd(ADMIN_DIR);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
