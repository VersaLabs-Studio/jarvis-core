import { z } from 'zod'

export const tenantSelectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  plan: z.enum(['free', 'pro', 'enterprise']),
  settings: z.record(z.unknown()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const tenantInsertSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  settings: z.record(z.unknown()).optional(),
})

export const tenantUpdateSchema = tenantInsertSchema.partial()

export type TenantSelect = z.infer<typeof tenantSelectSchema>
export type TenantInsert = z.infer<typeof tenantInsertSchema>
export type TenantUpdate = z.infer<typeof tenantUpdateSchema>
