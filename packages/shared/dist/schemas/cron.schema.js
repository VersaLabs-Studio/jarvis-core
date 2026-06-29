// =============================================================================
// @jarvis/shared — Cron Job Schema (Phase E §9)
// In-memory cron job configuration for Hermes. NOT a DB row — when a cron
// job fires, it creates `workflows` + `workflow_runs` rows via the API factory
// (per the E0 plan §9.3).
// =============================================================================
import { z } from "zod";
import { skillRoleSchema } from "./skill-doc.schema.js";
/**
 * Standard cron expression (`* * * * *` syntax) or the special `@boot` token
 * which fires once at Hermes boot (used for the model boot-check).
 */
export const cronScheduleSchema = z
    .string()
    .refine((s) => s === "@boot" || /^(\S+\s+){4}\S+$/.test(s), "Schedule must be a 5-field cron expression or '@boot'");
/**
 * Notification channels. Telegram is documented but the real bot wiring
 * is Phase F; in v1.5 a `telegram` notify just writes a structured log
 * line (per Phase E §9.3).
 */
export const cronNotifySchema = z.enum(["api", "telegram"]);
/**
 * In-memory cron job registry entry. Loaded at Hermes boot from
 * `apps/hermes/src/cron/registry.ts`; persists across restarts via
 * BullMQ's Redis-backed job store (the *schedule* is in-memory; the
 * *scheduled jobs* are in Redis).
 */
export const cronJobSchema = z.object({
    id: z.string().min(1).regex(/^[a-z][a-z0-9-]*$/, "id must be kebab-case, start with a letter"),
    name: z.string().min(1),
    schedule: cronScheduleSchema,
    /**
     * The skill doc name to invoke. `null` for built-in jobs (e.g. the
     * model boot-check, which is not a skill but a `cron` module handler).
     */
    skill: z.string().min(1).nullable(),
    args: z.record(z.unknown()).default({}),
    notify: z.array(cronNotifySchema).default([]),
    enabled: z.boolean().default(true),
    /**
     * The model role to use when the job runs a skill. If omitted, the
     * skill's own `preferred_model_role` (from its frontmatter) is used.
     */
    preferred_model_role: skillRoleSchema.optional(),
});
/**
 * The full registry — keyed by `CronJob.id`. Validated at boot; the runtime
 * refuses to start with a malformed registry.
 */
export const cronRegistrySchema = z.record(z.string(), cronJobSchema);
//# sourceMappingURL=cron.schema.js.map