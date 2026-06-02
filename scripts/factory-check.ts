import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, extname } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

const HOOKS_DIR = join(ROOT, "apps", "web", "hooks");
const ROUTES_DIR = join(ROOT, "apps", "api", "src", "routes");

const CRUD_PATTERNS = [
  /useList\b/,
  /useDoc\b/,
  /useCreate\b/,
  /useUpdate\b/,
  /useDelete\b/,
];

const FACTORY_PATTERNS = [
  /createListHandler/,
  /createGetHandler/,
  /createCreateHandler/,
  /createUpdateHandler/,
  /createDeleteHandler/,
  /registerCrud/,
];

function walkDir(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!["node_modules", "dist", ".next"].includes(entry)) {
        files.push(...walkDir(fullPath));
      }
    } else if (extname(entry) === ".ts" || extname(entry) === ".tsx") {
      files.push(fullPath);
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
  issue: string;
  content: string;
}

function checkHooks(): Violation[] {
  const violations: Violation[] = [];

  if (!existsSync(HOOKS_DIR)) {
    console.log("   ℹ️  apps/web/hooks/ not found. Skipping hook check.");
    return violations;
  }

  const files = walkDir(HOOKS_DIR);

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const relPath = file.replace(ROOT, "").replace(/\\/g, "/");

    const hasFactoryImport = content.includes("createCrudHook") || content.includes("factory");

    if (!hasFactoryImport) {
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of CRUD_PATTERNS) {
          if (lines[i]?.match(pattern)) {
            violations.push({
              file: relPath,
              line: i + 1,
              issue: "Hand-written CRUD hook (should use factory)",
              content: lines[i]?.trim() ?? "",
            });
          }
        }
      }
    }
  }

  return violations;
}

function checkRoutes(): Violation[] {
  const violations: Violation[] = [];

  if (!existsSync(ROUTES_DIR)) {
    console.log("   ℹ️  apps/api/src/routes/ not found. Skipping route check.");
    return violations;
  }

  const files = walkDir(ROUTES_DIR);

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const relPath = file.replace(ROOT, "").replace(/\\/g, "/");

    const hasFactory = FACTORY_PATTERNS.some((p) => content.match(p));

    if (!hasFactory) {
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of CRUD_PATTERNS) {
          if (lines[i]?.match(pattern)) {
            violations.push({
              file: relPath,
              line: i + 1,
              issue: "Hand-written CRUD route (should use registerCrud)",
              content: lines[i]?.trim() ?? "",
            });
          }
        }
      }
    }
  }

  return violations;
}

function main() {
  console.log("🏭 Factory Check (P2) — verifying factory pattern usage...\n");

  const hookViolations = checkHooks();
  const routeViolations = checkRoutes();
  const allViolations = [...hookViolations, ...routeViolations];

  if (allViolations.length === 0) {
    console.log("✅ All CRUD operations use factory pattern!");
    process.exit(0);
  }

  console.error(`❌ Found ${allViolations.length} factory pattern violation(s):\n`);
  for (const v of allViolations) {
    console.error(`   ${v.file}:${v.line}`);
    console.error(`   Issue: ${v.issue}`);
    console.error(`   Content: ${v.content}\n`);
  }
  console.error("Fix: Use createCrudHook() for hooks, registerCrud() for routes.");
  process.exit(1);
}

main();
