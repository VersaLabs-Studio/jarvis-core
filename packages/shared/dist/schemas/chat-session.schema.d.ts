import { z } from 'zod';
export declare const chatSessionSelectSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodString;
    title: z.ZodString;
    context: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    is_active: z.ZodBoolean;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
    title: string;
    context: Record<string, unknown> | null;
    is_active: boolean;
}, {
    id: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
    title: string;
    context: Record<string, unknown> | null;
    is_active: boolean;
}>;
export declare const chatSessionInsertSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    title: z.ZodDefault<z.ZodString>;
    context: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    is_active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    title: string;
    is_active: boolean;
    context?: Record<string, unknown> | null | undefined;
}, {
    tenant_id: string;
    title?: string | undefined;
    context?: Record<string, unknown> | null | undefined;
    is_active?: boolean | undefined;
}>;
export declare const chatSessionUpdateSchema: z.ZodObject<{
    tenant_id: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    context: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    is_active: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    tenant_id?: string | undefined;
    title?: string | undefined;
    context?: Record<string, unknown> | null | undefined;
    is_active?: boolean | undefined;
}, {
    tenant_id?: string | undefined;
    title?: string | undefined;
    context?: Record<string, unknown> | null | undefined;
    is_active?: boolean | undefined;
}>;
export type ChatSessionSelect = z.infer<typeof chatSessionSelectSchema>;
export type ChatSessionInsert = z.infer<typeof chatSessionInsertSchema>;
export type ChatSessionUpdate = z.infer<typeof chatSessionUpdateSchema>;
//# sourceMappingURL=chat-session.schema.d.ts.map