import { z } from 'zod'

export const analyticsEventSelectSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  event_type: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
})

export const analyticsEventInsertSchema = z.object({
  tenant_id: z.string().uuid(),
  event_type: z.string().min(1, 'Event type is required'),
  metadata: z.record(z.unknown()).optional().nullable(),
})

export type AnalyticsEventSelect = z.infer<typeof analyticsEventSelectSchema>
export type AnalyticsEventInsert = z.infer<typeof analyticsEventInsertSchema>
