import { z } from 'zod'

export const workflowStatusEnum = z.enum(['draft', 'active', 'paused', 'archived'])

export const workflowSelectSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: workflowStatusEnum,
  definition: z.record(z.unknown()),
  version: z.number().int().positive(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const workflowInsertSchema = z.object({
  tenant_id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  status: workflowStatusEnum.default('draft'),
  definition: z.record(z.unknown()).optional(),
  version: z.number().int().positive().default(1),
  created_by: z.string().uuid().optional().nullable(),
})

export const workflowUpdateSchema = workflowInsertSchema.partial()

export type WorkflowSelect = z.infer<typeof workflowSelectSchema>
export type WorkflowInsert = z.infer<typeof workflowInsertSchema>
export type WorkflowUpdate = z.infer<typeof workflowUpdateSchema>
