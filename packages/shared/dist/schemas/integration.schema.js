import { z } from 'zod';
export const integrationStatusEnum = z.enum(['pending', 'connected', 'disconnected', 'error']);
export const integrationSelectSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    name: z.string(),
    provider: z.string(),
    status: integrationStatusEnum,
    config: z.record(z.unknown()),
    metadata: z.record(z.unknown()),
    created_by: z.string().uuid().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
export const integrationInsertSchema = z.object({
    tenant_id: z.string().uuid(),
    name: z.string().min(1, 'Name is required').max(255),
    provider: z.string().min(1, 'Provider is required').max(255),
    status: integrationStatusEnum.default('pending'),
    config: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
    created_by: z.string().uuid().optional().nullable(),
});
export const integrationUpdateSchema = integrationInsertSchema.partial();
//# sourceMappingURL=integration.schema.js.map