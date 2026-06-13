import { z } from 'zod';
export declare const skillStatusEnum: z.ZodEnum<["draft", "active", "disabled", "archived"]>;
export declare const skillSelectSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["draft", "active", "disabled", "archived"]>;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    capabilities: z.ZodArray<z.ZodString, "many">;
    version: z.ZodNumber;
    created_by: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    created_by: string | null;
    status: "draft" | "active" | "archived" | "disabled";
    name: string;
    created_at: string;
    updated_at: string;
    description: string | null;
    version: number;
    config: Record<string, unknown>;
    capabilities: string[];
}, {
    id: string;
    tenant_id: string;
    created_by: string | null;
    status: "draft" | "active" | "archived" | "disabled";
    name: string;
    created_at: string;
    updated_at: string;
    description: string | null;
    version: number;
    config: Record<string, unknown>;
    capabilities: string[];
}>;
export declare const skillInsertSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "disabled", "archived"]>>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    version: z.ZodDefault<z.ZodNumber>;
    created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    status: "draft" | "active" | "archived" | "disabled";
    name: string;
    version: number;
    created_by?: string | null | undefined;
    description?: string | null | undefined;
    config?: Record<string, unknown> | undefined;
    capabilities?: string[] | undefined;
}, {
    tenant_id: string;
    name: string;
    created_by?: string | null | undefined;
    status?: "draft" | "active" | "archived" | "disabled" | undefined;
    description?: string | null | undefined;
    version?: number | undefined;
    config?: Record<string, unknown> | undefined;
    capabilities?: string[] | undefined;
}>;
export declare const skillUpdateSchema: z.ZodObject<{
    tenant_id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["draft", "active", "disabled", "archived"]>>>;
    config: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    capabilities: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    version: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    created_by: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    tenant_id?: string | undefined;
    created_by?: string | null | undefined;
    status?: "draft" | "active" | "archived" | "disabled" | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    version?: number | undefined;
    config?: Record<string, unknown> | undefined;
    capabilities?: string[] | undefined;
}, {
    tenant_id?: string | undefined;
    created_by?: string | null | undefined;
    status?: "draft" | "active" | "archived" | "disabled" | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    version?: number | undefined;
    config?: Record<string, unknown> | undefined;
    capabilities?: string[] | undefined;
}>;
export type SkillSelect = z.infer<typeof skillSelectSchema>;
export type SkillInsert = z.infer<typeof skillInsertSchema>;
export type SkillUpdate = z.infer<typeof skillUpdateSchema>;
//# sourceMappingURL=skill.schema.d.ts.map