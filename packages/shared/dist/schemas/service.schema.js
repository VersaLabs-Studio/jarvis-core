import { z } from 'zod';
export const serviceStatusEnum = z.enum(['provisioning', 'running', 'stopped', 'error', 'terminated']);
export const serviceSelectSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    name: z.string(),
    type: z.string(),
    status: serviceStatusEnum,
    config: z.record(z.unknown()),
    endpoints: z.record(z.unknown()),
    created_by: z.string().uuid().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
export const serviceInsertSchema = z.object({
    tenant_id: z.string().uuid(),
    name: z.string().min(1, 'Name is required').max(255),
    type: z.string().min(1, 'Type is required').max(255),
    status: serviceStatusEnum.default('provisioning'),
    config: z.record(z.unknown()).optional(),
    endpoints: z.record(z.unknown()).optional(),
    created_by: z.string().uuid().optional().nullable(),
});
export const serviceUpdateSchema = serviceInsertSchema.partial();
//# sourceMappingURL=service.schema.js.map