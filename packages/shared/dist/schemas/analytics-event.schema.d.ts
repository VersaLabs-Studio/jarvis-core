import { z } from 'zod';
export declare const analyticsEventSelectSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodString;
    event_type: z.ZodString;
    metadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
    event_type: string;
}, {
    id: string;
    tenant_id: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
    event_type: string;
}>;
export declare const analyticsEventInsertSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    event_type: z.ZodString;
    metadata: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    event_type: string;
    metadata?: Record<string, unknown> | null | undefined;
}, {
    tenant_id: string;
    event_type: string;
    metadata?: Record<string, unknown> | null | undefined;
}>;
export type AnalyticsEventSelect = z.infer<typeof analyticsEventSelectSchema>;
export type AnalyticsEventInsert = z.infer<typeof analyticsEventInsertSchema>;
//# sourceMappingURL=analytics-event.schema.d.ts.map