// =============================================================================
// Skill trigger matcher (Phase E §4.3 — chat-side skill injection).
//
// Given a user message, returns the best-matching loaded skill (by trigger
// phrase) or null. Used by chat-stream.ts to inject the matched skill's
// body into the system prompt + override the chain's preferred_model_role.
//
// v1.5 uses a simple case-insensitive substring match on the skill's
// `trigger[]` array. v2 can add an LLM-based classifier if the hit rate
// is too low.
// =============================================================================

import type { SkillDoc } from "@jarvis/shared";

/**
 * Find the first skill whose `trigger[]` contains a phrase that appears
 * (case-insensitive) in the message. Returns null if no match.
 *
 * - Foundational skills (`category: "foundational"`) are NOT returned —
 *   they're already injected via `getAlwaysLoadedSystemContext()` for
 *   any `always_loaded: true` doc, and the others are loaded by the LLM
 *   based on context (premium-ui, schema-first, etc.). A user saying
 *   "follow premium-ui" doesn't make sense in chat.
 * - Always-loaded skills are skipped for the same reason.
 */
export function matchSkillToMessage(message: string, skills: SkillDoc[]): SkillDoc | null {
  const lower = message.toLowerCase();
  for (const skill of skills) {
    if (skill.frontmatter.always_loaded) continue;
    if (skill.frontmatter.category === "foundational") continue;
    for (const trigger of skill.frontmatter.trigger) {
      if (lower.includes(trigger.toLowerCase())) {
        return skill;
      }
    }
  }
  return null;
}
