import { z } from 'zod';
export declare const workflowRunStatusEnum: z.ZodEnum<["pending", "running", "success", "failed", "cancelled"]>;
export declare const workflowRunSelectSchema: z.ZodObject<{
    id: z.ZodString;
    workflow_id: z.ZodString;
    tenant_id: z.ZodString;
    status: z.ZodEnum<["pending", "running", "success", "failed", "cancelled"]>;
    output: z.ZodNullable<z.ZodString>;
    error: z.ZodNullable<z.ZodString>;
    started_at: z.ZodNullable<z.ZodString>;
    finished_at: z.ZodNullable<z.ZodString>;
    duration_ms: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    error: string | null;
    workflow_id: string;
    status: "pending" | "running" | "success" | "failed" | "cancelled";
    duration_ms: number | null;
    output: string | null;
    started_at: string | null;
    finished_at: string | null;
}, {
    id: string;
    tenant_id: string;
    error: string | null;
    workflow_id: string;
    status: "pending" | "running" | "success" | "failed" | "cancelled";
    duration_ms: number | null;
    output: string | null;
    started_at: string | null;
    finished_at: string | null;
}>;
export declare const workflowRunInsertSchema: z.ZodObject<{
    workflow_id: z.ZodString;
    tenant_id: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["pending", "running", "success", "failed", "cancelled"]>>;
    output: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    error: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    started_at: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    finished_at: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    duration_ms: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    workflow_id: string;
    status: "pending" | "running" | "success" | "failed" | "cancelled";
    error?: string | null | undefined;
    duration_ms?: number | null | undefined;
    output?: string | null | undefined;
    started_at?: string | null | undefined;
    finished_at?: string | null | undefined;
}, {
    tenant_id: string;
    workflow_id: string;
    error?: string | null | undefined;
    status?: "pending" | "running" | "success" | "failed" | "cancelled" | undefined;
    duration_ms?: number | null | undefined;
    output?: string | null | undefined;
    started_at?: string | null | undefined;
    finished_at?: string | null | undefined;
}>;
export type WorkflowRunSelect = z.infer<typeof workflowRunSelectSchema>;
export type WorkflowRunInsert = z.infer<typeof workflowRunInsertSchema>;
//# sourceMappingURL=workflow-run.schema.d.ts.map