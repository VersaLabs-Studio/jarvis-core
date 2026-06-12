// =============================================================================
// Skill doc loader (Phase E §6 + E0 §5.6 step 5).
//
// Reads every `*.md` under `SKILLS_DIR/{foundational,workflow}/`, parses
// YAML frontmatter with gray-matter, validates against the Zod schema in
// `@jarvis/shared/schemas/skill-doc.schema.ts`, and returns the loaded set.
// Malformed docs are LOGGED AND SKIPPED — never crash the runtime.
// =============================================================================

import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { skillDocSchema, type SkillDoc } from "@jarvis/shared";
import type { SkillMeta } from "@jarvis/shared";
import { getEnv } from "../config/env.js";
import { log } from "./logger.js";
import { MAX_SKILL_DOC_BYTES } from "../config/constants.js";

let _loaded: SkillDoc[] = [];

export interface LoadSummary {
  total: number;
  foundational: number;
  workflow: number;
  alwaysLoaded: number;
  malformed: number;
  sources: string[];
}

export async function loadSkills(): Promise<LoadSummary> {
  const env = getEnv();
  const dir = env.SKILLS_DIR;
  const summary: LoadSummary = {
    total: 0,
    foundational: 0,
    workflow: 0,
    alwaysLoaded: 0,
    malformed: 0,
    sources: [],
  };
  const docs: SkillDoc[] = [];

  for (const bucket of ["foundational", "workflow"] as const) {
    const bucketDir = join(dir, bucket);
    let entries: string[];
    try {
      entries = await readdir(bucketDir);
    } catch (err) {
      log.warn(
        { err: err instanceof Error ? err.message : String(err), bucketDir },
        `Skill bucket missing or unreadable; skipping`,
      );
      continue;
    }
    for (const entry of entries.filter((e) => e.endsWith(".md")).sort()) {
      const source = join(bucketDir, entry);
      const fileStat = await stat(source).catch(() => null);
      if (!fileStat) continue;
      if (fileStat.size > MAX_SKILL_DOC_BYTES) {
        log.warn({ source, size: fileStat.size }, `Skill doc exceeds MAX_SKILL_DOC_BYTES; skipping`);
        summary.malformed += 1;
        continue;
      }
      const raw = await readFile(source, "utf8").catch((err) => {
        log.warn({ err: err instanceof Error ? err.message : String(err), source }, "Failed to read skill doc");
        return null;
      });
      if (raw == null) {
        summary.malformed += 1;
        continue;
      }
      const parsed = matter(raw);
      const candidate = { frontmatter: parsed.data, body: parsed.content, source };
      const result = skillDocSchema.safeParse(candidate);
      if (!result.success) {
        log.warn(
          { source, issues: result.error.flatten() },
          "Skill doc failed schema validation; skipping",
        );
        summary.malformed += 1;
        continue;
      }
      docs.push(result.data);
      summary.sources.push(source);
      if (bucket === "foundational") summary.foundational += 1;
      if (bucket === "workflow") summary.workflow += 1;
      if (result.data.frontmatter.always_loaded) summary.alwaysLoaded += 1;
    }
  }

  summary.total = docs.length;
  _loaded = docs;
  log.info(summary, "Loaded skill docs");
  return summary;
}

export function getLoadedSkills(): SkillDoc[] {
  return _loaded;
}

export function getSkillByName(name: string): SkillDoc | null {
  return _loaded.find((d) => d.frontmatter.name === name || d.frontmatter.name === name.replace(/\.md$/, "")) ?? null;
}

/**
 * Always-loaded skills (`always_loaded: true` in frontmatter) are
 * concatenated into the system prompt. Currently only `architectural-dna.md`.
 */
export function getAlwaysLoadedSystemContext(): string {
  return _loaded
    .filter((d) => d.frontmatter.always_loaded)
    .map((d) => `# ${d.frontmatter.name}\n\n${d.body}`)
    .join("\n\n---\n\n");
}

/**
 * Public metadata for `GET /v1/skills`.
 */
export function toMeta(d: SkillDoc): SkillMeta {
  return {
    name: d.frontmatter.name,
    description: d.frontmatter.description,
    category: d.frontmatter.category,
    trigger: d.frontmatter.trigger,
    tools_required: d.frontmatter.tools_required,
    estimated_time: d.frontmatter.estimated_time,
    always_loaded: d.frontmatter.always_loaded,
    preferred_model_role: d.frontmatter.preferred_model_role,
    source: d.source ?? "",
  };
}
