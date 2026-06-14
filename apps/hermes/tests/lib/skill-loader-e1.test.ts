// =============================================================================
// E1 acceptance test: all 11 foundational skill docs are valid and loadable.
//
// Runs the real skill-loader against the actual apps/hermes/skills/foundational/
// dir. The loader parses YAML frontmatter, validates against the Zod schema,
// and skips malformed docs (logged at warn). This test asserts the count +
// validity of the 11 expected docs.
//
// Run with SKILLS_DIR pointed at the apps/hermes/skills dir:
//   SKILLS_DIR=apps/hermes/skills pnpm -F @jarvis/hermes test skill-loader-e1
// =============================================================================

import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";
import { loadSkills } from "../../src/lib/skill-loader.js";

const SKILLS_DIR = process.env["SKILLS_DIR"] ?? join(process.cwd(), "skills");

// Force SKILLS_DIR for the test process so the loader doesn't fall back to
// the production container default (/app/data/skills) which doesn't exist on
// the dev machine.
process.env["SKILLS_DIR"] = SKILLS_DIR;

describe("E1 — foundational skills load", () => {
  let summary: Awaited<ReturnType<typeof loadSkills>>;
  let skipped: string[] = [];

  beforeAll(async () => {
    // The loader calls getEnv() on first use; validateEnv() refuses to run
    // without OPENROUTER_API_KEY. The key is a stub for the test — loadSkills
    // doesn't use it.
    process.env["OPENROUTER_API_KEY"] = "test-openrouter-key-1234567890";

    // Capture logger output so we can report skipped (malformed) docs.
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      if (msg.includes("Skill doc failed schema validation")) {
        skipped.push(msg);
      }
      origWarn(...args);
    };
    try {
      summary = await loadSkills();
    } finally {
      console.warn = origWarn;
    }
  });

  it("loads exactly 11 foundational skill docs", () => {
    expect(summary.foundational).toBe(11);
  });

  it("loads 0 OR more workflow skills (E1 invariant is the foundational count; E2 adds the rest)", () => {
    // E1 specifically adds the 11 foundational docs. Workflow docs may
    // already be present if E2 has landed in the same branch (per the
    // large-unit directive). The exact workflow count is checked by the
    // E2 acceptance test (skill-loader-e2.test.ts).
    expect(summary.workflow).toBeGreaterThanOrEqual(0);
    expect(summary.workflow).toBeLessThanOrEqual(18);
  });

  it("has exactly 1 always-loaded skill (architectural-dna)", () => {
    expect(summary.alwaysLoaded).toBe(1);
  });

  it("all 11 docs are valid (no malformed)", () => {
    expect(summary.malformed).toBe(0);
    expect(skipped).toEqual([]);
  });

  it("all 11 docs have a category of 'foundational'", async () => {
    const { getLoadedSkills } = await import("../../src/lib/skill-loader.js");
    const skills = getLoadedSkills();
    const foundational = skills.filter((s) => s.frontmatter.category === "foundational");
    expect(foundational.length).toBe(11);
  });

  it("all 11 docs have a non-empty trigger[] (schema requires ≥ 1)", async () => {
    const { getLoadedSkills } = await import("../../src/lib/skill-loader.js");
    const skills = getLoadedSkills();
    for (const s of skills) {
      expect(s.frontmatter.trigger.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("all 11 docs have a non-empty body", async () => {
    const { getLoadedSkills } = await import("../../src/lib/skill-loader.js");
    const skills = getLoadedSkills();
    for (const s of skills) {
      expect(s.body.length).toBeGreaterThan(0);
    }
  });

  it("all 11 docs have all 6 H2 sections (Purpose, Prerequisites, Steps, Output, Error Handling, Quality Checks)", async () => {
    const { getLoadedSkills } = await import("../../src/lib/skill-loader.js");
    const skills = getLoadedSkills();
    const requiredSections = ["## Purpose", "## Prerequisites", "## Steps", "## Output", "## Error Handling", "## Quality Checks"];
    for (const s of skills) {
      for (const section of requiredSections) {
        expect(s.body, `doc ${s.frontmatter.name} missing section ${section}`).toContain(section);
      }
    }
  });
});
