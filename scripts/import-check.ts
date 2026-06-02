import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, extname } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

const UI_DIR = join(ROOT, "apps", "web", "src", "components", "ui");
const FEATURES_DIR = join(ROOT, "apps", "web", "src", "features");

const EXCLUDED_DIRS = ["node_modules", ".next", "dist", ".turbo", "build"];

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

function checkUiImports(): Violation[] {
  const violations: Violation[] = [];

  if (!existsSync(UI_DIR)) {
    console.log("   ℹ️  apps/web/src/components/ui/ not found. Skipping UI import check.");
    return violations;
  }

  const files = walkDir(UI_DIR);

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const relPath = file.replace(ROOT, "").replace(/\\/g, "/");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (line.match(/from\s+['"].*features\//)) {
        violations.push({
          file: relPath,
          line: i + 1,
          issue: "UI component imports from features (violates import direction)",
          content: line.trim(),
        });
      }
    }
  }

  return violations;
}

function checkFeatureCrossImports(): Violation[] {
  const violations: Violation[] = [];

  if (!existsSync(FEATURES_DIR)) {
    console.log("   ℹ️  apps/web/src/features/ not found. Skipping feature cross-import check.");
    return violations;
  }

  const featureDirs = readdirSync(FEATURES_DIR).filter((entry) => {
    const fullPath = join(FEATURES_DIR, entry);
    return statSync(fullPath).isDirectory();
  });

  for (const feature of featureDirs) {
    const featureDir = join(FEATURES_DIR, feature);
    const files = walkDir(featureDir);

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const relPath = file.replace(ROOT, "").replace(/\\/g, "/");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";

        for (const otherFeature of featureDirs) {
          if (otherFeature === feature) continue;

          const crossImportPattern = new RegExp(
            `from\\s+['"].*features\\/${otherFeature}\\/`
          );

          if (line.match(crossImportPattern)) {
            violations.push({
              file: relPath,
              line: i + 1,
              issue: `Feature "${feature}" imports from feature "${otherFeature}" (sideways import)`,
              content: line.trim(),
            });
          }
        }
      }
    }
  }

  return violations;
}

function main() {
  console.log("📦 Import Direction Check (P3) — verifying import boundaries...\n");

  const uiViolations = checkUiImports();
  const featureViolations = checkFeatureCrossImports();
  const allViolations = [...uiViolations, ...featureViolations];

  if (allViolations.length === 0) {
    console.log("✅ Import direction rules respected!");
    process.exit(0);
  }

  console.error(`❌ Found ${allViolations.length} import direction violation(s):\n`);
  for (const v of allViolations) {
    console.error(`   ${v.file}:${v.line}`);
    console.error(`   Issue: ${v.issue}`);
    console.error(`   Content: ${v.content}\n`);
  }
  console.error("Fix: ui/ ← shared/ ← features/. No sideways imports.");
  process.exit(1);
}

main();
