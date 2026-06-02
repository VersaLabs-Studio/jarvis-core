import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, extname } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TARGET_DIR = join(ROOT, "apps", "web");

const FORBIDDEN_PATTERNS = [
  /\bbg-white\b/,
  /\btext-black\b/,
  /\btext-gray-\d+\b/,
  /\bbg-gray-\d+\b/,
  /\bborder-gray-\d+\b/,
];

const EXCLUDED_DIRS = ["node_modules", ".next", "dist", ".turbo", "build"];
const EXCLUDED_EXTS = [".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"];

function walkDir(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry)) {
        files.push(...walkDir(fullPath));
      }
    } else {
      const ext = extname(entry);
      if ([".ts", ".tsx", ".jsx"].includes(ext)) {
        if (!EXCLUDED_EXTS.some((e) => entry.endsWith(e))) {
          files.push(fullPath);
        }
      }
    }
  }

  return files;
}

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

interface Violation {
  file: string;
  line: number;
  pattern: string;
  content: string;
}

function main() {
  console.log("🎨 Color Gate (P4) — checking for hardcoded colors...\n");

  if (!existsSync(TARGET_DIR)) {
    console.log("⚠️  apps/web/ not found. Skipping color gate.");
    process.exit(0);
  }

  const files = walkDir(TARGET_DIR);
  const violations: Violation[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const relPath = file.replace(ROOT, "").replace(/\\/g, "/");

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        const match = lines[i]?.match(pattern);
        if (match) {
          violations.push({
            file: relPath,
            line: i + 1,
            pattern: match[0],
            content: lines[i]?.trim() ?? "",
          });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log("✅ No hardcoded colors found. Use semantic tokens!");
    process.exit(0);
  }

  console.error(`❌ Found ${violations.length} hardcoded color(s):\n`);
  for (const v of violations) {
    console.error(`   ${v.file}:${v.line}`);
    console.error(`   Pattern: ${v.pattern}`);
    console.error(`   Content: ${v.content}\n`);
  }
  console.error("Fix: Replace with semantic tokens (bg-background, text-foreground, border-border).");
  process.exit(1);
}

main();
