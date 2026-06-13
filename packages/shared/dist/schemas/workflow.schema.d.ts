import { z } from 'zod';
export declare const workflowStatusEnum: z.ZodEnum<["draft", "active", "paused", "archived"]>;
export declare const workflowSelectSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["draft", "active", "paused", "archived"]>;
    definition: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    version: z.ZodNumber;
    created_by: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    created_by: string | null;
    status: "draft" | "active" | "paused" | "archived";
    name: string;
    created_at: string;
    updated_at: string;
    description: string | null;
    definition: Record<string, unknown>;
    version: number;
}, {
    id: string;
    tenant_id: string;
    created_by: string | null;
    status: "draft" | "active" | "paused" | "archived";
    name: string;
    created_at: string;
    updated_at: string;
    description: string | null;
    definition: Record<string, unknown>;
    version: number;
}>;
export declare const workflowInsertSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "paused", "archived"]>>;
    definition: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    version: z.ZodDefault<z.ZodNumber>;
    created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    status: "draft" | "active" | "paused" | "archived";
    name: string;
    version: number;
    created_by?: string | null | undefined;
    description?: string | null | undefined;
    definition?: Record<string, unknown> | undefined;
}, {
    tenant_id: string;
    name: string;
    created_by?: string | null | undefined;
    status?: "draft" | "active" | "paused" | "archived" | undefined;
    description?: string | null | undefined;
    definition?: Record<string, unknown> | undefined;
    version?: number | undefined;
}>;
export declare const workflowUpdateSchema: z.ZodObject<{
    tenant_id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["draft", "active", "paused", "archived"]>>>;
    definition: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    version: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    created_by: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    tenant_id?: string | undefined;
    created_by?: string | null | undefined;
    status?: "draft" | "active" | "paused" | "archived" | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    definition?: Record<string, unknown> | undefined;
    version?: number | undefined;
}, {
    tenant_id?: string | undefined;
    created_by?: string | null | undefined;
    status?: "draft" | "active" | "paused" | "archived" | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    definition?: Record<string, unknown> | undefined;
    version?: number | undefined;
}>;
export type WorkflowSelect = z.infer<typeof workflowSelectSchema>;
export type WorkflowInsert = z.infer<typeof workflowInsertSchema>;
export type WorkflowUpdate = z.infer<typeof workflowUpdateSchema>;
//# sourceMappingURL=workflow.schema.d.ts.map