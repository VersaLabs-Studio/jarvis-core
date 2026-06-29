import { z } from 'zod';
export const chatMessageRoleEnum = z.enum(['user', 'assistant', 'system', 'tool']);
export const chatMessageSelectSchema = z.object({
    id: z.string().uuid(),
    session_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    role: chatMessageRoleEnum,
    content: z.string().nullable(),
    model: z.string().nullable(),
    tools_used: z.array(z.string()),
    tokens_in: z.number().int().nullable(),
    tokens_out: z.number().int().nullable(),
    duration_ms: z.number().int().nullable(),
    metadata: z.record(z.unknown()).nullable(),
    created_at: z.string().datetime(),
});
export const chatMessageInsertSchema = z.object({
    session_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    role: chatMessageRoleEnum,
    content: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    tools_used: z.array(z.string()).default([]),
    tokens_in: z.number().int().optional().nullable(),
    tokens_out: z.number().int().optional().nullable(),
    duration_ms: z.number().int().optional().nullable(),
    metadata: z.record(z.unknown()).optional().nullable(),
});
//# sourceMappingURL=chat-message.schema.js.map