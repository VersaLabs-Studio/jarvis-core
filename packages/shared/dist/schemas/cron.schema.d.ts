import { z } from "zod";
/**
 * Standard cron expression (`* * * * *` syntax) or the special `@boot` token
 * which fires once at Hermes boot (used for the model boot-check).
 */
export declare const cronScheduleSchema: z.ZodEffects<z.ZodString, string, string>;
/**
 * Notification channels. Telegram is documented but the real bot wiring
 * is Phase F; in v1.5 a `telegram` notify just writes a structured log
 * line (per Phase E §9.3).
 */
export declare const cronNotifySchema: z.ZodEnum<["api", "telegram"]>;
/**
 * In-memory cron job registry entry. Loaded at Hermes boot from
 * `apps/hermes/src/cron/registry.ts`; persists across restarts via
 * BullMQ's Redis-backed job store (the *schedule* is in-memory; the
 * *scheduled jobs* are in Redis).
 */
export declare const cronJobSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    schedule: z.ZodEffects<z.ZodString, string, string>;
    /**
     * The skill doc name to invoke. `null` for built-in jobs (e.g. the
     * model boot-check, which is not a skill but a `cron` module handler).
     */
    skill: z.ZodNullable<z.ZodString>;
    args: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    notify: z.ZodDefault<z.ZodArray<z.ZodEnum<["api", "telegram"]>, "many">>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    /**
     * The model role to use when the job runs a skill. If omitted, the
     * skill's own `preferred_model_role` (from its frontmatter) is used.
     */
    preferred_model_role: z.ZodOptional<z.ZodEnum<["planning", "coding", "office", "fast", "audit"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    skill: string | null;
    schedule: string;
    args: Record<string, unknown>;
    notify: ("api" | "telegram")[];
    enabled: boolean;
    preferred_model_role?: "planning" | "coding" | "office" | "fast" | "audit" | undefined;
}, {
    id: string;
    name: string;
    skill: string | null;
    schedule: string;
    preferred_model_role?: "planning" | "coding" | "office" | "fast" | "audit" | undefined;
    args?: Record<string, unknown> | undefined;
    notify?: ("api" | "telegram")[] | undefined;
    enabled?: boolean | undefined;
}>;
export type CronJob = z.infer<typeof cronJobSchema>;
/**
 * The full registry — keyed by `CronJob.id`. Validated at boot; the runtime
 * refuses to start with a malformed registry.
 */
export declare const cronRegistrySchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    schedule: z.ZodEffects<z.ZodString, string, string>;
    /**
     * The skill doc name to invoke. `null` for built-in jobs (e.g. the
     * model boot-check, which is not a skill but a `cron` module handler).
     */
    skill: z.ZodNullable<z.ZodString>;
    args: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    notify: z.ZodDefault<z.ZodArray<z.ZodEnum<["api", "telegram"]>, "many">>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    /**
     * The model role to use when the job runs a skill. If omitted, the
     * skill's own `preferred_model_role` (from its frontmatter) is used.
     */
    preferred_model_role: z.ZodOptional<z.ZodEnum<["planning", "coding", "office", "fast", "audit"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    skill: string | null;
    schedule: string;
    args: Record<string, unknown>;
    notify: ("api" | "telegram")[];
    enabled: boolean;
    preferred_model_role?: "planning" | "coding" | "office" | "fast" | "audit" | undefined;
}, {
    id: string;
    name: string;
    skill: string | null;
    schedule: string;
    preferred_model_role?: "planning" | "coding" | "office" | "fast" | "audit" | undefined;
    args?: Record<string, unknown> | undefined;
    notify?: ("api" | "telegram")[] | undefined;
    enabled?: boolean | undefined;
}>>;
export type CronRegistry = z.infer<typeof cronRegistrySchema>;
//# sourceMappingURL=cron.schema.d.ts.map