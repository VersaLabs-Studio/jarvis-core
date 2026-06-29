import { z } from 'zod';
export const secretTypeEnum = z.enum(['api_key', 'oauth_token', 'database_url', 'webhook_secret', 'custom']);
export const secretSelectSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    name: z.string(),
    type: secretTypeEnum,
    value: z.string(),
    description: z.string().nullable(),
    expires_at: z.string().datetime().nullable(),
    created_by: z.string().uuid().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
export const secretInsertSchema = z.object({
    tenant_id: z.string().uuid(),
    name: z.string().min(1, 'Name is required').max(255),
    type: secretTypeEnum.default('custom'),
    value: z.string().min(1, 'Value is required'),
    description: z.string().max(2000).optional().nullable(),
    expires_at: z.string().datetime().optional().nullable(),
    created_by: z.string().uuid().optional().nullable(),
});
export const secretUpdateSchema = secretInsertSchema.partial();
//# sourceMappingURL=secret.schema.js.map