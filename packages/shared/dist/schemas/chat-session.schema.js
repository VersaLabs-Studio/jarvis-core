import { z } from 'zod';
export const chatSessionSelectSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    title: z.string(),
    context: z.record(z.unknown()).nullable(),
    is_active: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
export const chatSessionInsertSchema = z.object({
    tenant_id: z.string().uuid(),
    title: z.string().max(255).default('New Chat'),
    context: z.record(z.unknown()).optional().nullable(),
    is_active: z.boolean().default(true),
});
export const chatSessionUpdateSchema = chatSessionInsertSchema.partial();
//# sourceMappingURL=chat-session.schema.js.map