import { z } from "zod";
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodOptional<z.ZodString>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    per_page: number;
    sort_order: "asc" | "desc";
    sort_by?: string | undefined;
}, {
    page?: number | undefined;
    per_page?: number | undefined;
    sort_by?: string | undefined;
    sort_order?: "asc" | "desc" | undefined;
}>;
export declare const apiResponseSchema: <T extends z.ZodType>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: T;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: T;
    error: z.ZodOptional<z.ZodString>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: T;
    error: z.ZodOptional<z.ZodString>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export { skillFrontmatterSchema, skillDocSchema, skillCategorySchema, skillRoleSchema, estimatedTimeSchema, type SkillFrontmatter, type SkillDoc, } from "./skill-doc.schema.js";
export { cronJobSchema, cronRegistrySchema, cronScheduleSchema, cronNotifySchema, type CronJob, type CronRegistry, } from "./cron.schema.js";
//# sourceMappingURL=index.d.ts.map