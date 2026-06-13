import { z } from 'zod';
export const workflowRunStatusEnum = z.enum(['pending', 'running', 'success', 'failed', 'cancelled']);
export const workflowRunSelectSchema = z.object({
    id: z.string().uuid(),
    workflow_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    status: workflowRunStatusEnum,
    output: z.string().nullable(),
    error: z.string().nullable(),
    started_at: z.string().datetime().nullable(),
    finished_at: z.string().datetime().nullable(),
    duration_ms: z.number().int().nullable(),
});
export const workflowRunInsertSchema = z.object({
    workflow_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    status: workflowRunStatusEnum.default('pending'),
    output: z.string().optional().nullable(),
    error: z.string().optional().nullable(),
    started_at: z.string().datetime().optional().nullable(),
    finished_at: z.string().datetime().optional().nullable(),
    duration_ms: z.number().int().optional().nullable(),
});
//# sourceMappingURL=workflow-run.schema.js.map