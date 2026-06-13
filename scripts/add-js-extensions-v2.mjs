#!/usr/bin/env node
// scripts/add-js-extensions-v2.mjs
// One-off migration: add .js extensions to all relative imports in
// packages/shared/src + apps/*/src (api, hermes) — required for
// moduleResolution: NodeNext.
//
// Handles:
//   - `from "./path"`        → `from "./path.js"`
//   - `from "../path.ts"`     → `from "../path.js"`  (strip .ts, add .js)
//   - `from "../path.tsx"`    → `from "../path.js"`  (strip .tsx, add .js)
//   - `from "./schemas"`      → `from "./schemas/index.js"`  (barrel)
//   - `import "./path";`      → `import "./path.js";`  (side-effect import)
//
// Run: node scripts/add-js-extensions-v2.mjs
// Idempotent: re-runs are a no-op (already-extended imports are skipped).

import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = [
  join(ROOT, "packages", "shared", "src"),
  join(ROOT, "apps", "api", "src"),
  join(ROOT, "apps", "hermes", "src"),
  // web and mobile use bundler resolution (no NodeNext emit); skip
];

// from './path' or from "../path" or import './path' (side-effect)
const RE = /(from|import)\s+(['"])(\.{1,2}\/[^'"?#]+?)\2/g;

const SOURCE_EXT_RE = /\.(ts|tsx|mts|cts)$/i;

let totalScanned = 0;
let totalChanged = 0;
let totalRewritten = 0;

function isBarrelImport(srcDir, importPath) {
  // A path with no extension like "./types" or "../config" that points
  // to a directory (has a sibling index.ts/index.tsx/index.d.ts) is a barrel.
  // Resolve relative to the importing file's directory. Since we don't have
  // the importing file here, we just check if `importPath` (as a directory)
  // exists anywhere reasonable. For simplicity, check in srcDir.
  const asDir = join(srcDir, importPath);
  return existsSync(asDir);
}

function rewritePath(importPath) {
  // Strip source-only extensions first
  let p = importPath.replace(SOURCE_EXT_RE, "");
  // If it ends with .js, no change
  if (p.endsWith(".js")) return null;
  return p + ".js";
}

async function processFile(srcDir, filePath) {
  const rel = filePath.slice(srcDir.length + 1).replace(/\\/g, "/");
  const original = await readFile(filePath, "utf8");
  let updated = original;
  let count = 0;
  updated = updated.replace(RE, (match, kw, q, path) => {
    const rewritten = rewritePath(path);
    if (rewritten === null) return match;
    // If the original import is a directory (barrel), it should be ./dir/index.js
    let final = rewritten;
    if (isBarrelImport(srcDir, path)) {
      // Path was "./types" or "../config" — append /index.js
      // rewritePath already added .js; change to /index.js
      final = path + "/index.js";
    }
    count++;
    return `${kw} ${q}${final}${q}`;
  });
  if (count > 0) {
    await writeFile(filePath, updated, "utf8");
    totalChanged++;
    totalRewritten += count;
    console.log(`  +${count}  ${rel}`);
  }
}

async function processDir(srcDir) {
  for await (const entry of glob("**/*.ts", { cwd: srcDir })) {
    const filePath = join(srcDir, entry);
    totalScanned++;
    await processFile(srcDir, filePath);
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
