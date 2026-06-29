import { z } from "zod";
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(20),
    sort_by: z.string().optional(),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
});
export const apiResponseSchema = (dataSchema) => z.object({
    success: z.boolean(),
    data: dataSchema,
    error: z.string().optional(),
});
// Phase E — Hermes skill frontmatter (distinct from the DB `skills` table)
export { skillFrontmatterSchema, skillDocSchema, skillCategorySchema, skillRoleSchema, estimatedTimeSchema, } from "./skill-doc.schema.js";
// Phase E — In-memory cron job registry
export { cronJobSchema, cronRegistrySchema, cronScheduleSchema, cronNotifySchema, } from "./cron.schema.js";
//# sourceMappingURL=index.js.map