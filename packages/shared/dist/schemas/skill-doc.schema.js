// =============================================================================
// @jarvis/shared — Skill Doc Frontmatter Schema (Phase E §6.2)
// Zod schema for the frontmatter of every Hermes skill markdown doc.
// Distinct from `skill.schema.ts` (DB `skills` table).
// =============================================================================
import { z } from "zod";
/**
 * Roles a skill can prefer for model selection. Maps to Hermes chains
 * (Part 1 §1.5). Optional — when omitted, the chat endpoint uses the
 * default `coding` chain.
 */
export const skillRoleSchema = z.enum([
    "planning",
    "coding",
    "office",
    "fast",
    "audit",
]);
/**
 * Skill categories. Mirrors Part 4 §4.2's "9 + 9" split. `foundational`
 * is added for the 11 system-context skills (Part 4 §4.1) so the loader
 * can bucket them separately.
 */
export const skillCategorySchema = z.enum([
    "swe",
    "devops",
    "content",
    "research",
    "communication",
    "analysis",
    "general",
    "foundational",
]);
/**
 * Estimated runtime, e.g. "5 minutes" or "5-15 minutes". Validator accepts
 * the forms written by E1/E2 sub-agents; we do not enforce a specific shape
 * beyond "digits and a time unit".
 */
export const estimatedTimeSchema = z
    .string()
    .regex(/^\d+(-\d+)?\s+(seconds?|minutes?|hours?)$/i);
/**
 * The YAML frontmatter that opens every skill doc (Part 4 §4.3).
 * The body (markdown after the frontmatter) is the *how*; the frontmatter
 * is the *what*.
 */
export const skillFrontmatterSchema = z.object({
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(280),
    trigger: z.array(z.string().min(1)).min(1),
    tools_required: z.array(z.string()).default([]),
    category: skillCategorySchema,
    estimated_time: estimatedTimeSchema,
    /**
     * True only for skills that are part of Hermes' permanent system context
     * (currently: `architectural-dna`). Always-loaded skills are emitted
     * into every chat request's system prompt.
     */
    always_loaded: z.boolean().default(false),
    preferred_model_role: skillRoleSchema.optional(),
});
/**
 * The full doc: frontmatter + body. Body is the markdown after the
 * `---` frontmatter block. Validated at boot; malformed docs are logged
 * and skipped (Phase E §6.5).
 */
export const skillDocSchema = z.object({
    frontmatter: skillFrontmatterSchema,
    body: z.string().min(1),
    /** Populated by the loader (not in the frontmatter). */
    source: z.string().optional(),
});
//# sourceMappingURL=skill-doc.schema.js.map