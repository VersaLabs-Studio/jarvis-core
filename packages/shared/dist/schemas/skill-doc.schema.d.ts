import { z } from "zod";
/**
 * Roles a skill can prefer for model selection. Maps to Hermes chains
 * (Part 1 §1.5). Optional — when omitted, the chat endpoint uses the
 * default `coding` chain.
 */
export declare const skillRoleSchema: z.ZodEnum<["planning", "coding", "office", "fast", "audit"]>;
/**
 * Skill categories. Mirrors Part 4 §4.2's "9 + 9" split. `foundational`
 * is added for the 11 system-context skills (Part 4 §4.1) so the loader
 * can bucket them separately.
 */
export declare const skillCategorySchema: z.ZodEnum<["swe", "devops", "content", "research", "communication", "analysis", "general", "foundational"]>;
/**
 * Estimated runtime, e.g. "5 minutes" or "5-15 minutes". Validator accepts
 * the forms written by E1/E2 sub-agents; we do not enforce a specific shape
 * beyond "digits and a time unit".
 */
export declare const estimatedTimeSchema: z.ZodString;
/**
 * The YAML frontmatter that opens every skill doc (Part 4 §4.3).
 * The body (markdown after the frontmatter) is the *how*; the frontmatter
 * is the *what*.
 */
export declare const skillFrontmatterSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    trigger: z.ZodArray<z.ZodString, "many">;
    tools_required: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    category: z.ZodEnum<["swe", "devops", "content", "research", "communication", "analysis", "general", "foundational"]>;
    estimated_time: z.ZodString;
    /**
     * True only for skills that are part of Hermes' permanent system context
     * (currently: `architectural-dna`). Always-loaded skills are emitted
     * into every chat request's system prompt.
     */
    always_loaded: z.ZodDefault<z.ZodBoolean>;
    preferred_model_role: z.ZodOptional<z.ZodEnum<["planning", "coding", "office", "fast", "audit"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    trigger: string[];
    tools_required: string[];
    category: "content" | "swe" | "devops" | "research" | "communication" | "analysis" | "general" | "foundational";
    estimated_time: string;
    always_loaded: boolean;
    preferred_model_role?: "planning" | "coding" | "office" | "fast" | "audit" | undefined;
}, {
    name: string;
    description: string;
    trigger: string[];
    category: "content" | "swe" | "devops" | "research" | "communication" | "analysis" | "general" | "foundational";
    estimated_time: string;
    tools_required?: string[] | undefined;
    always_loaded?: boolean | undefined;
    preferred_model_role?: "planning" | "coding" | "office" | "fast" | "audit" | undefined;
}>;
export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;
/**
 * The full doc: frontmatter + body. Body is the markdown after the
 * `---` frontmatter block. Validated at boot; malformed docs are logged
 * and skipped (Phase E §6.5).
 */
export declare const skillDocSchema: z.ZodObject<{
    frontmatter: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        trigger: z.ZodArray<z.ZodString, "many">;
        tools_required: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodEnum<["swe", "devops", "content", "research", "communication", "analysis", "general", "foundational"]>;
        estimated_time: z.ZodString;
        /**
         * True only for skills that are part of Hermes' permanent system context
         * (currently: `architectural-dna`). Always-loaded skills are emitted
         * into every chat request's system prompt.
         */
        always_loaded: z.ZodDefault<z.ZodBoolean>;
        preferred_model_role: z.ZodOptional<z.ZodEnum<["planning", "coding", "office", "fast", "audit"]>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        trigger: string[];
        tools_required: string[];
        category: "content" | "swe" | "devops" | "research" | "communication" | "analysis" | "general" | "foundational";
        estimated_time: string;
        always_loaded: boolean;
        preferred_model_role?: "planning" | "coding" | "office" | "fast" | "audit" | undefined;
    }, {
        name: string;
        description: string;
        trigger: string[];
        category: "content" | "swe" | "devops" | "research" | "communication" | "analysis" | "general" | "foundational";
        estimated_time: string;
        tools_required?: string[] | undefined;
        always_loaded?: boolean | undefined;
        preferred_model_role?: "planning" | "coding" | "office" | "fast" | "audit" | undefined;
    }>;
    body: z.ZodString;
    /** Populated by the loader (not in the frontmatter). */
    source: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    frontmatter: {
        name: string;
        description: string;
        trigger: string[];
        tools_required: string[];
        category: "content" | "swe" | "devops" | "research" | "communication" | "analysis" | "general" | "foundational";
        estimated_time: string;
        always_loaded: boolean;
        preferred_model_role?: "planning" | "coding" | "office" | "fast" | "audit" | undefined;
    };
    body: string;
    source?: string | undefined;
}, {
    frontmatter: {
        name: string;
        description: string;
        trigger: string[];
        category: "content" | "swe" | "devops" | "research" | "communication" | "analysis" | "general" | "foundational";
        estimated_time: string;
        tools_required?: string[] | undefined;
        always_loaded?: boolean | undefined;
        preferred_model_role?: "planning" | "coding" | "office" | "fast" | "audit" | undefined;
    };
    body: string;
    source?: string | undefined;
}>;
export type SkillDoc = z.infer<typeof skillDocSchema>;
//# sourceMappingURL=skill-doc.schema.d.ts.map