// =============================================================================
// E2 acceptance test: all 18 workflow skill docs are valid and loadable, and
// each doc's tools_required matches the Part 4 §4.2 / PHASE-E-PLAN-REMAINDER.md
// §5.2 contract.
//
// The 18 docs are split into two groups:
//   SWE / DevOps (9):   ship-feature, morning-audit, debug-and-fix, deploy-to-vercel,
//                        deploy-to-vps, github-pr-workflow, code-review, research-and-report,
//                        api-integration
//   Comm / Business (9): notion-update, email-draft, create-proposal, client-report,
//                        project-onboard, content-creation, invoice-generation,
//                        data-analysis, seo-audit
//
// Each doc's tools_required must match the canonical contract below; a mismatch
// is an E2 blocker (the agentic loop's allow-list depends on it).
// =============================================================================

import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";
import { loadSkills, getLoadedSkills } from "../../src/lib/skill-loader.js";

const SKILLS_DIR = process.env["SKILLS_DIR"] ?? join(process.cwd(), "skills");
process.env["SKILLS_DIR"] = SKILLS_DIR;

/** Canonical tools_required per PHASE-E-PLAN-REMAINDER.md §5.2. */
const TOOLS_REQUIRED: Record<string, string[]> = {
  "ship-feature": ["github", "vercel", "notion"],
  "morning-audit": ["github", "notion", "gmail"],
  "debug-and-fix": ["github"],
  "deploy-to-vercel": ["vercel"],
  "deploy-to-vps": ["filesystem"],
  "github-pr-workflow": ["github"],
  "code-review": ["github"],
  "research-and-report": ["browser", "notion"],
  "api-integration": ["filesystem", "browser"],
  "notion-update": ["notion"],
  "email-draft": ["gmail"],
  "create-proposal": ["browser", "notion", "gmail"],
  "client-report": ["github", "notion", "gmail"],
  "project-onboard": ["github", "vercel", "notion"],
  "content-creation": ["browser", "notion"],
  "invoice-generation": ["filesystem", "gmail"],
  "data-analysis": ["filesystem"],
  "seo-audit": ["browser"],
};

describe("E2 — workflow skills load", () => {
  let summary: Awaited<ReturnType<typeof loadSkills>>;

  beforeAll(async () => {
    process.env["OPENROUTER_API_KEY"] = "test-openrouter-key-1234567890";
    summary = await loadSkills();
  });

  it("loads exactly 18 workflow skill docs", () => {
    expect(summary.workflow).toBe(18);
  });

  it("loads 11 foundational docs (E1 lands first; verify cross-WP coupling)", () => {
    expect(summary.foundational).toBe(11);
  });

  it("loads 29 docs total (11 foundational + 18 workflow)", () => {
    expect(summary.total).toBe(29);
  });

  it("has 0 always-loaded skills (foundational count covers architectural-dna; no workflow skill is always-on)", () => {
    // The total alwaysLoaded should be exactly 1 (just architectural-dna from
    // the foundational set); no workflow skill is always_loaded.
    expect(summary.alwaysLoaded).toBe(1);
  });

  it("all 18 workflow docs are valid (no malformed)", () => {
    expect(summary.malformed).toBe(0);
  });

  it("every workflow doc's tools_required matches the §5.2 contract", () => {
    const skills = getLoadedSkills();
    const workflowSkills = skills.filter((s) => s.frontmatter.category !== "foundational");
    for (const skill of workflowSkills) {
      const expected = TOOLS_REQUIRED[skill.frontmatter.name];
      expect(expected, `doc ${skill.frontmatter.name} not in the §5.2 contract table`).toBeDefined();
      expect(
        [...skill.frontmatter.tools_required].sort(),
        `doc ${skill.frontmatter.name} has tools_required ${JSON.stringify(skill.frontmatter.tools_required)}, expected ${JSON.stringify(expected)}`,
      ).toEqual([...expected].sort());
    }
  });

  it("every workflow doc's category is one of: swe, devops, content, research, communication, analysis", () => {
    const skills = getLoadedSkills();
    const workflowSkills = skills.filter((s) => s.frontmatter.category !== "foundational");
    const allowedCategories = new Set(["swe", "devops", "content", "research", "communication", "analysis"]);
    for (const skill of workflowSkills) {
      expect(allowedCategories, `doc ${skill.frontmatter.name} has unexpected category ${skill.frontmatter.category}`).toContain(skill.frontmatter.category);
    }
  });

  it("every workflow doc has a non-empty trigger[] (≥ 1 phrase)", () => {
    const skills = getLoadedSkills();
    const workflowSkills = skills.filter((s) => s.frontmatter.category !== "foundational");
    for (const skill of workflowSkills) {
      expect(skill.frontmatter.trigger.length, `doc ${skill.frontmatter.name} has no triggers`).toBeGreaterThanOrEqual(1);
    }
  });

  it("every workflow doc has all 6 H2 sections (Purpose, Prerequisites, Steps, Output, Error Handling, Quality Checks)", () => {
    const skills = getLoadedSkills();
    const workflowSkills = skills.filter((s) => s.frontmatter.category !== "foundational");
    const requiredSections = ["## Purpose", "## Prerequisites", "## Steps", "## Output", "## Error Handling", "## Quality Checks"];
    for (const skill of workflowSkills) {
      for (const section of requiredSections) {
        expect(skill.body, `doc ${skill.frontmatter.name} missing section ${section}`).toContain(section);
      }
    }
  });

  it("every workflow doc has a preferred_model_role (used by the agentic loop's chain selection)", () => {
    const skills = getLoadedSkills();
    const workflowSkills = skills.filter((s) => s.frontmatter.category !== "foundational");
    const allowedRoles = new Set(["planning", "coding", "office", "fast", "audit"]);
    for (const skill of workflowSkills) {
      const role = skill.frontmatter.preferred_model_role;
      expect(role, `doc ${skill.frontmatter.name} has no preferred_model_role`).toBeDefined();
      expect(allowedRoles, `doc ${skill.frontmatter.name} has invalid role ${role}`).toContain(role);
    }
  });

  it("no workflow doc has 'slack' in tools_required (slack is PENDING per Part 4 §4.6)", () => {
    const skills = getLoadedSkills();
    const workflowSkills = skills.filter((s) => s.frontmatter.category !== "foundational");
    for (const skill of workflowSkills) {
      expect(skill.frontmatter.tools_required, `doc ${skill.frontmatter.name} incorrectly lists slack as a tool`).not.toContain("slack");
    }
  });
});
