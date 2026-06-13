#!/usr/bin/env node
// scripts/add-js-extensions-apps.mjs
// One-off migration: add .js extensions to all relative imports in
// apps/*/src (api, hermes, web, mobile) — required for moduleResolution: NodeNext.
//
// Run: node scripts/add-js-extensions-apps.mjs
// Idempotent: re-runs are a no-op (already-extended imports are skipped).

import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = [
  join(ROOT, "apps", "api", "src"),
  join(ROOT, "apps", "hermes", "src"),
  // web and mobile use bundler resolution (no NodeNext emit); skip
];

// Match: from './path' or from "../path"  (no extension, no query/hash, no scheme)
const RE = /from\s+(['"])(\.{1,2}\/[^'"?#]+?)\1/g;

let totalScanned = 0;
let totalChanged = 0;
let totalRewritten = 0;

async function processDir(srcDir) {
  for await (const entry of glob("**/*.ts", { cwd: srcDir })) {
    const filePath = join(srcDir, entry);
    totalScanned++;
    const original = await readFile(filePath, "utf8");
    let updated = original;
    let count = 0;
    updated = updated.replace(RE, (match, quote, path) => {
      // Skip ONLY if it ends in .js (the canonical NodeNext extension).
      if (path.endsWith(".js")) return match;
      count++;
      return `from ${quote}${path}.js${quote}`;
    });
    if (count > 0) {
      await writeFile(filePath, updated, "utf8");
      totalChanged++;
      totalRewritten += count;
      console.log(`  +${count}  ${entry}`);
    }
  }
}

async function main() {
  for (const dir of TARGET_DIRS) {
    console.log(`\n=== ${dir} ===`);
    await processDir(dir);
  }
  console.log("\n=== summary ===");
  console.log(`Scanned:  ${totalScanned} files`);
  console.log(`Changed: ${totalChanged} files`);
  console.log(`Rewrote: ${totalRewritten} imports`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
