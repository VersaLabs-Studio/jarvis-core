import { z } from 'zod'

export const systemLogLevelEnum = z.enum(['info', 'warn', 'error', 'debug'])

export const systemLogSelectSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullable(),
  level: systemLogLevelEnum,
  service: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
})

export const systemLogInsertSchema = z.object({
  tenant_id: z.string().uuid().optional().nullable(),
  level: systemLogLevelEnum,
  service: z.string().min(1, 'Service is required'),
  message: z.string().min(1, 'Message is required'),
  metadata: z.record(z.unknown()).optional().nullable(),
})

export type SystemLogSelect = z.infer<typeof systemLogSelectSchema>
export type SystemLogInsert = z.infer<typeof systemLogInsertSchema>
