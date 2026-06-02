import { z } from 'zod'

export const profileSelectSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const profileInsertSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().max(255).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
})

export const profileUpdateSchema = z.object({
  email: z.string().email().optional(),
  full_name: z.string().max(255).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
})

export type ProfileSelect = z.infer<typeof profileSelectSchema>
export type ProfileInsert = z.infer<typeof profileInsertSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
