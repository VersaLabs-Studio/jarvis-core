import { z } from 'zod';
export declare const integrationStatusEnum: z.ZodEnum<["pending", "connected", "disconnected", "error"]>;
export declare const integrationSelectSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodString;
    name: z.ZodString;
    provider: z.ZodString;
    status: z.ZodEnum<["pending", "connected", "disconnected", "error"]>;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    created_by: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    created_by: string | null;
    status: "pending" | "connected" | "disconnected" | "error";
    name: string;
    created_at: string;
    updated_at: string;
    provider: string;
    config: Record<string, unknown>;
    metadata: Record<string, unknown>;
}, {
    id: string;
    tenant_id: string;
    created_by: string | null;
    status: "pending" | "connected" | "disconnected" | "error";
    name: string;
    created_at: string;
    updated_at: string;
    provider: string;
    config: Record<string, unknown>;
    metadata: Record<string, unknown>;
}>;
export declare const integrationInsertSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    name: z.ZodString;
    provider: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["pending", "connected", "disconnected", "error"]>>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    status: "pending" | "connected" | "disconnected" | "error";
    name: string;
    provider: string;
    created_by?: string | null | undefined;
    config?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    tenant_id: string;
    name: string;
    provider: string;
    created_by?: string | null | undefined;
    status?: "pending" | "connected" | "disconnected" | "error" | undefined;
    config?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const integrationUpdateSchema: z.ZodObject<{
    tenant_id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["pending", "connected", "disconnected", "error"]>>>;
    config: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    created_by: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    tenant_id?: string | undefined;
    created_by?: string | null | undefined;
    status?: "pending" | "connected" | "disconnected" | "error" | undefined;
    name?: string | undefined;
    provider?: string | undefined;
    config?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    tenant_id?: string | undefined;
    created_by?: string | null | undefined;
    status?: "pending" | "connected" | "disconnected" | "error" | undefined;
    name?: string | undefined;
    provider?: string | undefined;
    config?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type IntegrationSelect = z.infer<typeof integrationSelectSchema>;
export type IntegrationInsert = z.infer<typeof integrationInsertSchema>;
export type IntegrationUpdate = z.infer<typeof integrationUpdateSchema>;
//# sourceMappingURL=integration.schema.d.ts.map