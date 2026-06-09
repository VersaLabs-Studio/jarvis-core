import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, extname } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const WEB_TARGET_DIR = join(ROOT, "apps", "web");
const MOBILE_TARGET_DIRS = [
  join(ROOT, "apps", "mobile", "app"),
  join(ROOT, "apps", "mobile", "components"),
];

const WEB_FORBIDDEN_PATTERNS = [
  { pattern: /\bbg-white\b/, name: "bg-white" },
  { pattern: /\btext-black\b/, name: "text-black" },
  { pattern: /\btext-gray-\d+\b/, name: "text-gray-N" },
  { pattern: /\bbg-gray-\d+\b/, name: "bg-gray-N" },
  { pattern: /\bborder-gray-\d+\b/, name: "border-gray-N" },
];

const MOBILE_FORBIDDEN_PATTERNS = [
  { pattern: /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/, name: "raw hex" },
  { pattern: /\brgb\s*\(/, name: "rgb(" },
  { pattern: /\brgba\s*\(/, name: "rgba(" },
  { pattern: /\boklch\s*\(/, name: "oklch(" },
  { pattern: /\bhsl\s*\(/, name: "hsl(" },
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
      if ([".ts", ".tsx", ".jsx", ".js"].includes(ext)) {
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
  ruleName: string;
}

function main() {
  console.log("🎨 Color Gate (P4) — checking for hardcoded colors...\n");
  const violations: Violation[] = [];

  // 1. Check Web
  if (existsSync(WEB_TARGET_DIR)) {
    console.log("Checking apps/web...");
    const webFiles = walkDir(WEB_TARGET_DIR);
    for (const file of webFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const relPath = file.replace(ROOT, "").replace(/\\/g, "/");

      for (let i = 0; i < lines.length; i++) {
        for (const { pattern, name } of WEB_FORBIDDEN_PATTERNS) {
          const match = lines[i]?.match(pattern);
          if (match) {
            violations.push({
              file: relPath,
              line: i + 1,
              pattern: match[0],
              content: lines[i]?.trim() ?? "",
              ruleName: name,
            });
          }
        }
      }
    }
  }

  // 2. Check Mobile
  for (const dir of MOBILE_TARGET_DIRS) {
    if (existsSync(dir)) {
      console.log(`Checking mobile directory: ${dir.replace(ROOT, "").replace(/\\/g, "/")}`);
      const mobileFiles = walkDir(dir);
      for (const file of mobileFiles) {
        if (file.endsWith("colors.ts")) continue; // Explicit exclusion for colors.ts
        const content = readFileSync(file, "utf-8");
        const lines = content.split("\n");
        const relPath = file.replace(ROOT, "").replace(/\\/g, "/");

        for (let i = 0; i < lines.length; i++) {
          for (const { pattern, name } of MOBILE_FORBIDDEN_PATTERNS) {
            const match = lines[i]?.match(pattern);
            if (match) {
              violations.push({
                file: relPath,
                line: i + 1,
                pattern: match[0],
                content: lines[i]?.trim() ?? "",
                ruleName: name,
              });
            }
          }
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log("\n✅ No forbidden color usage found. All gates green!");
    process.exit(0);
  }

  console.error(`\n❌ Found ${violations.length} forbidden color pattern(s):\n`);
  for (const v of violations) {
    console.error(`   ${v.file}:${v.line}`);
    console.error(`   Violation: ${v.ruleName} ('${v.pattern}')`);
    console.error(`   Content: ${v.content}\n`);
  }
  console.error("Fix: Use semantic tokens and colors from theme/colors.ts.");
  process.exit(1);
}

main();
