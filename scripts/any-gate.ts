import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, extname } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TARGET_DIRS = [join(ROOT, "apps"), join(ROOT, "packages")];

const FORBIDDEN_PATTERNS = [
  /:\s*any\b/,
  /\bas\s+any\b/,
  /<any>/,
];

const EXCLUDED_DIRS = ["node_modules", ".next", "dist", ".turbo", "build"];
const EXCLUDED_EXTS = [".d.ts", ".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"];

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
      if ([".ts", ".tsx"].includes(ext)) {
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
  console.log("🚫 Any Gate (P6) — scanning for `any` usage...\n");

  const violations: Violation[] = [];

  for (const dir of TARGET_DIRS) {
    if (!existsSync(dir)) continue;

    const files = walkDir(dir);

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
  }

  if (violations.length === 0) {
    console.log("✅ No `any` usage found. Type safety maintained!");
    process.exit(0);
  }

  console.error(`❌ Found ${violations.length} "any" usage(s):\n`);
  for (const v of violations) {
    console.error(`   ${v.file}:${v.line}`);
    console.error(`   Pattern: ${v.pattern}`);
    console.error(`   Content: ${v.content}\n`);
  }
  console.error("Fix: Replace `any` with proper types or `unknown`.");
  process.exit(1);
}

main();
