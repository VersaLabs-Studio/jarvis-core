#!/usr/bin/env node
// scripts/add-js-extensions.mjs
// One-off migration: add .js extensions to all relative imports in
// packages/shared/src (required for moduleResolution: NodeNext).
//
// Run: node scripts/add-js-extensions.mjs
// Idempotent: re-runs are a no-op (already-extended imports are skipped).

import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "packages", "shared", "src");

// Match: from './path' or from "../path"  (no extension, no query/hash, no scheme)
const RE = /from\s+(['"])(\.{1,2}\/[^'"?#]+?)\1/g;

let filesScanned = 0;
let filesChanged = 0;
let importsRewritten = 0;

async function main() {
  for await (const entry of glob("**/*.ts", { cwd: SRC_DIR })) {
    const filePath = join(SRC_DIR, entry);
    filesScanned++;
    const original = await readFile(filePath, "utf8");
    let updated = original;
    let count = 0;
    updated = updated.replace(RE, (match, quote, path) => {
      // Skip ONLY if it ends in .js (the canonical NodeNext extension).
      // Other "extensions" (like .types) are conventions — the .js goes
      // AFTER them: `./database.types` → `./database.types.js`.
      if (path.endsWith(".js")) return match;
      count++;
      return `from ${quote}${path}.js${quote}`;
    });
    if (count > 0) {
      await writeFile(filePath, updated, "utf8");
      filesChanged++;
      importsRewritten += count;
      console.log(`  +${count}  ${entry}`);
    }
  }
  console.log("");
  console.log(`Scanned:  ${filesScanned} files`);
  console.log(`Changed: ${filesChanged} files`);
  console.log(`Rewrote: ${importsRewritten} imports`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
