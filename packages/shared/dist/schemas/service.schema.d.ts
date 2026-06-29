import { z } from 'zod';
export declare const serviceStatusEnum: z.ZodEnum<["provisioning", "running", "stopped", "error", "terminated"]>;
export declare const serviceSelectSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    status: z.ZodEnum<["provisioning", "running", "stopped", "error", "terminated"]>;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    endpoints: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    created_by: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    created_by: string | null;
    status: "error" | "provisioning" | "running" | "stopped" | "terminated";
    name: string;
    type: string;
    created_at: string;
    updated_at: string;
    config: Record<string, unknown>;
    endpoints: Record<string, unknown>;
}, {
    id: string;
    tenant_id: string;
    created_by: string | null;
    status: "error" | "provisioning" | "running" | "stopped" | "terminated";
    name: string;
    type: string;
    created_at: string;
    updated_at: string;
    config: Record<string, unknown>;
    endpoints: Record<string, unknown>;
}>;
export declare const serviceInsertSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["provisioning", "running", "stopped", "error", "terminated"]>>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    endpoints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    status: "error" | "provisioning" | "running" | "stopped" | "terminated";
    name: string;
    type: string;
    created_by?: string | null | undefined;
    config?: Record<string, unknown> | undefined;
    endpoints?: Record<string, unknown> | undefined;
}, {
    tenant_id: string;
    name: string;
    type: string;
    created_by?: string | null | undefined;
    status?: "error" | "provisioning" | "running" | "stopped" | "terminated" | undefined;
    config?: Record<string, unknown> | undefined;
    endpoints?: Record<string, unknown> | undefined;
}>;
export declare const serviceUpdateSchema: z.ZodObject<{
    tenant_id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["provisioning", "running", "stopped", "error", "terminated"]>>>;
    config: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    endpoints: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    created_by: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    tenant_id?: string | undefined;
    created_by?: string | null | undefined;
    status?: "error" | "provisioning" | "running" | "stopped" | "terminated" | undefined;
    name?: string | undefined;
    type?: string | undefined;
    config?: Record<string, unknown> | undefined;
    endpoints?: Record<string, unknown> | undefined;
}, {
    tenant_id?: string | undefined;
    created_by?: string | null | undefined;
    status?: "error" | "provisioning" | "running" | "stopped" | "terminated" | undefined;
    name?: string | undefined;
    type?: string | undefined;
    config?: Record<string, unknown> | undefined;
    endpoints?: Record<string, unknown> | undefined;
}>;
export type ServiceSelect = z.infer<typeof serviceSelectSchema>;
export type ServiceInsert = z.infer<typeof serviceInsertSchema>;
export type ServiceUpdate = z.infer<typeof serviceUpdateSchema>;
//# sourceMappingURL=service.schema.d.ts.map