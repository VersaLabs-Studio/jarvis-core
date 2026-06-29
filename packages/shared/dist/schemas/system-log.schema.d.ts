import { z } from 'zod';
export declare const systemLogLevelEnum: z.ZodEnum<["info", "warn", "error", "debug"]>;
export declare const systemLogSelectSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodNullable<z.ZodString>;
    level: z.ZodEnum<["info", "warn", "error", "debug"]>;
    service: z.ZodString;
    message: z.ZodString;
    metadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string | null;
    level: "error" | "info" | "warn" | "debug";
    message: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
    service: string;
}, {
    id: string;
    tenant_id: string | null;
    level: "error" | "info" | "warn" | "debug";
    message: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
    service: string;
}>;
export declare const systemLogInsertSchema: z.ZodObject<{
    tenant_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    level: z.ZodEnum<["info", "warn", "error", "debug"]>;
    service: z.ZodString;
    message: z.ZodString;
    metadata: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    level: "error" | "info" | "warn" | "debug";
    message: string;
    service: string;
    tenant_id?: string | null | undefined;
    metadata?: Record<string, unknown> | null | undefined;
}, {
    level: "error" | "info" | "warn" | "debug";
    message: string;
    service: string;
    tenant_id?: string | null | undefined;
    metadata?: Record<string, unknown> | null | undefined;
}>;
export type SystemLogSelect = z.infer<typeof systemLogSelectSchema>;
export type SystemLogInsert = z.infer<typeof systemLogInsertSchema>;
//# sourceMappingURL=system-log.schema.d.ts.map