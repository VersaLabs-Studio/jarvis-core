import { z } from 'zod';
export declare const tenantSelectSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    plan: z.ZodEnum<["free", "pro", "enterprise"]>;
    settings: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    plan: "free" | "pro" | "enterprise";
    name: string;
    slug: string;
    settings: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}, {
    id: string;
    plan: "free" | "pro" | "enterprise";
    name: string;
    slug: string;
    settings: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}>;
export declare const tenantInsertSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    plan: z.ZodDefault<z.ZodEnum<["free", "pro", "enterprise"]>>;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    plan: "free" | "pro" | "enterprise";
    name: string;
    slug: string;
    settings?: Record<string, unknown> | undefined;
}, {
    name: string;
    slug: string;
    plan?: "free" | "pro" | "enterprise" | undefined;
    settings?: Record<string, unknown> | undefined;
}>;
export declare const tenantUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    plan: z.ZodOptional<z.ZodDefault<z.ZodEnum<["free", "pro", "enterprise"]>>>;
    settings: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    plan?: "free" | "pro" | "enterprise" | undefined;
    name?: string | undefined;
    slug?: string | undefined;
    settings?: Record<string, unknown> | undefined;
}, {
    plan?: "free" | "pro" | "enterprise" | undefined;
    name?: string | undefined;
    slug?: string | undefined;
    settings?: Record<string, unknown> | undefined;
}>;
export type TenantSelect = z.infer<typeof tenantSelectSchema>;
export type TenantInsert = z.infer<typeof tenantInsertSchema>;
export type TenantUpdate = z.infer<typeof tenantUpdateSchema>;
//# sourceMappingURL=tenant.schema.d.ts.map