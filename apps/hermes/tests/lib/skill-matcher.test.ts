// =============================================================================
// Tests for the chat-side skill trigger matcher (Phase E §4.3).
//
// v1.5: simple case-insensitive substring match on the skill's `trigger[]`.
// Foundational + always-loaded skills are skipped (they're system context).
// =============================================================================

import { describe, it, expect } from "vitest";
import { matchSkillToMessage } from "../../src/lib/skill-matcher.js";
import type { SkillDoc } from "@jarvis/shared";

function makeSkill(name: string, trigger: string[], opts: { category?: string; always_loaded?: boolean } = {}): SkillDoc {
  return {
    frontmatter: {
      name,
      description: `desc for ${name}`,
      trigger,
      tools_required: [],
      category: opts.category ?? "swe",
      estimated_time: "5 minutes",
      always_loaded: opts.always_loaded ?? false,
      preferred_model_role: "coding",
    },
    body: `# ${name}\n## Purpose\ndo the thing`,
    source: `/skills/workflow/${name}.md`,
  };
}

describe("matchSkillToMessage", () => {
  it("returns the skill whose trigger phrase appears in the message (case-insensitive)", () => {
    const skills: SkillDoc[] = [
      makeSkill("ship-feature", ["ship feature", "build and deploy"]),
      makeSkill("morning-audit", ["morning audit", "morning briefing"]),
    ];
    const matched = matchSkillToMessage("Please run the MORNING AUDIT now", skills);
    expect(matched?.frontmatter.name).toBe("morning-audit");
  });

  it("returns the first skill when multiple triggers match", () => {
    const skills: SkillDoc[] = [
      makeSkill("ship-feature", ["ship feature", "deploy this"]),
      makeSkill("deploy-to-vercel", ["deploy to vercel", "deploy this"]),
    ];
    const matched = matchSkillToMessage("can you deploy this for me", skills);
    // First match wins (skills are loaded in alphabetical order from the loader)
    expect(matched?.frontmatter.name).toBe("ship-feature");
  });

  it("returns null when no trigger matches", () => {
    const skills: SkillDoc[] = [
      makeSkill("ship-feature", ["ship feature", "build and deploy"]),
      makeSkill("morning-audit", ["morning audit"]),
    ];
    expect(matchSkillToMessage("hello world", skills)).toBeNull();
  });

  it("skips foundational skills (they're system context, not chat triggers)", () => {
    // "plan this" WOULD match the plan-feature skill if it were a workflow
    // skill, but the matcher skips foundational skills (system context).
    // The message has no workflow-skill trigger → matchSkillToMessage returns null.
    const skills: SkillDoc[] = [
      makeSkill("plan-feature", ["plan this", "design this"], { category: "foundational" }),
    ];
    const matched = matchSkillToMessage("please plan this for me", skills);
    expect(matched).toBeNull();
  });

  it("returns a workflow skill even when a foundational skill's trigger also matches the message", () => {
    // "ship feature" matches BOTH the foundational dna-style skill (which
    // we filter out) and the workflow ship-feature skill. The matcher
    // returns the workflow one.
    const skills: SkillDoc[] = [
      makeSkill("ship-feature-design", ["ship feature"], { category: "foundational" }),
      makeSkill("ship-feature", ["ship feature"]),
    ];
    const matched = matchSkillToMessage("can you ship feature X", skills);
    expect(matched?.frontmatter.name).toBe("ship-feature");
  });

  it("skips always-loaded skills (architectural-dna etc. are system context)", () => {
    const skills: SkillDoc[] = [
      makeSkill("architectural-dna", ["dna", "architecture"], { always_loaded: true }),
      makeSkill("debug-and-fix", ["debug", "fix this"]),
    ];
    const matched = matchSkillToMessage("help me debug this", skills);
    expect(matched?.frontmatter.name).toBe("debug-and-fix");
  });

  it("returns null for an empty skills list", () => {
    expect(matchSkillToMessage("anything", [])).toBeNull();
  });
});
