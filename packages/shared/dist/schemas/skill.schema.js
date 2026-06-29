import { z } from 'zod';
export const skillStatusEnum = z.enum(['draft', 'active', 'disabled', 'archived']);
export const skillSelectSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    status: skillStatusEnum,
    config: z.record(z.unknown()),
    capabilities: z.array(z.string()),
    version: z.number().int().positive(),
    created_by: z.string().uuid().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
export const skillInsertSchema = z.object({
    tenant_id: z.string().uuid(),
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().max(2000).optional().nullable(),
    status: skillStatusEnum.default('draft'),
    config: z.record(z.unknown()).optional(),
    capabilities: z.array(z.string()).optional(),
    version: z.number().int().positive().default(1),
    created_by: z.string().uuid().optional().nullable(),
});
export const skillUpdateSchema = skillInsertSchema.partial();
//# sourceMappingURL=skill.schema.js.map