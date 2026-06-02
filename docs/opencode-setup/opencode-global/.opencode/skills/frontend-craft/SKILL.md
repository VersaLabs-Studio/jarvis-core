---
name: Frontend Craft
description: >
  High-craft React/Next.js + TypeScript implementation patterns following Kidus Abdula's
  Architectural DNA. Load for any component, page, hook, or API route implementation.
  Covers factory hooks, TanStack Query patterns, and Golden Template adherence.
version: 1.0.0
---

# Frontend Craft Skill

Elite frontend implementation following the Architectural DNA. This skill covers the code patterns that turn a schema into a working, production-grade feature.

---

## Factory Hook Patterns (Pillar 2)

All data access goes through generic factory hooks. Never write bespoke fetch logic.

```ts
// hooks/use-entity.ts — Standard factory hook implementation:

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EntityKeys } from '@/lib/query-keys'
import { ENTITY_CONFIG } from '@/config/entities'
import type { Entity, EntityFormData } from '@/types'

const config = ENTITY_CONFIG.entity_name

// List hook with filters + pagination:
export function useEntities(options?: {
  page?: number
  limit?: number
  search?: string
  status?: string
}) {
  return useQuery({
    queryKey: EntityKeys.list(options),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.page)   params.set('page', String(options.page))
      if (options?.limit)  params.set('limit', String(options.limit))
      if (options?.search) params.set('search', options.search)
      if (options?.status) params.set('status', options.status)

      const res = await fetch(`${config.protectedPath}?${params}`)
      if (!res.ok) throw new Error('Failed to fetch entities')
      return res.json() as Promise<{ data: Entity[]; total: number }>
    },
  })
}

// Single document hook:
export function useEntity(id: string | null) {
  return useQuery({
    queryKey: EntityKeys.doc(id!),
    queryFn: async () => {
      const res = await fetch(`${config.protectedPath}/${id}`)
      if (!res.ok) throw new Error('Failed to fetch entity')
      return res.json() as Promise<Entity>
    },
    enabled: !!id,
  })
}

// Create mutation:
export function useCreateEntity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: EntityFormData) => {
      const res = await fetch(config.protectedPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create entity')
      return res.json() as Promise<Entity>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EntityKeys.all() })
    },
  })
}

// Update mutation:
export function useUpdateEntity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EntityFormData> }) => {
      const res = await fetch(`${config.protectedPath}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update entity')
      return res.json() as Promise<Entity>
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: EntityKeys.all() })
      qc.invalidateQueries({ queryKey: EntityKeys.doc(id) })
    },
  })
}

// Delete mutation (soft delete):
export function useDeleteEntity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${config.protectedPath}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete entity')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EntityKeys.all() })
    },
  })
}
```

---

## API Route Patterns (App Router)

```ts
// app/api/cms/entities/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEntitySchema } from '@/schemas/entity.schema'
import { ENTITY_CONFIG } from '@/config/entities'

const config = ENTITY_CONFIG.entity_name

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)

  const page   = Number(searchParams.get('page') ?? 1)
  const limit  = Number(searchParams.get('limit') ?? 20)
  const search = searchParams.get('search') ?? ''
  const offset = (page - 1) * limit

  let query = supabase
    .from(config.table)
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order(config.sortField, { ascending: config.sortOrder === 'asc' })
    .range(offset, offset + limit - 1)

  if (search) {
    const searchFilter = config.searchFields
      .map(field => `${field}.ilike.%${search}%`)
      .join(',')
    query = query.or(searchFilter)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()

  const parsed = createEntitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from(config.table)
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

---

## Page Architecture (Golden Template)

```tsx
// app/(cms)/entities/page.tsx — Standard list page:

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/dashboard/page-header'
import { EntityDialog } from './_components/entity-dialog'
import { useEntities, useDeleteEntity } from './_hooks/use-entity'
import { entityColumns } from './_components/entity-columns'
import { containerVariants, itemVariants } from '@/lib/motion'

export default function EntitiesPage() {
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useEntities({ page, search })
  const { mutate: deleteEntity } = useDeleteEntity()

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6"
    >
      <motion.div variants={itemVariants}>
        <PageHeader
          title="Entities"
          description="Manage your entities"
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Entity
            </Button>
          }
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <DataTable
          columns={entityColumns({ onEdit: setEditId, onDelete: deleteEntity })}
          data={data?.data ?? []}
          isLoading={isLoading}
          total={data?.total ?? 0}
          page={page}
          onPageChange={setPage}
          onSearch={setSearch}
        />
      </motion.div>

      <EntityDialog
        open={open || !!editId}
        editId={editId}
        onClose={() => { setOpen(false); setEditId(null) }}
      />
    </motion.div>
  )
}
```

---

## Form Pattern (React Hook Form + Zod)

```tsx
// _components/entity-form.tsx

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createEntitySchema, type EntityFormData } from '@/schemas/entity.schema'
import { useCreateEntity, useUpdateEntity } from '../_hooks/use-entity'
import { toast } from 'sonner'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface EntityFormProps {
  defaultValues?: Partial<EntityFormData>
  editId?: string | null
  onSuccess?: () => void
}

export function EntityForm({ defaultValues, editId, onSuccess }: EntityFormProps) {
  const form = useForm<EntityFormData>({
    resolver: zodResolver(createEntitySchema),
    defaultValues: { name: '', status: 'active', ...defaultValues },
  })

  const { mutate: create, isPending: isCreating } = useCreateEntity()
  const { mutate: update, isPending: isUpdating } = useUpdateEntity()
  const isPending = isCreating || isUpdating

  function onSubmit(data: EntityFormData) {
    if (editId) {
      update(
        { id: editId, data },
        {
          onSuccess: () => { toast.success('Entity updated'); onSuccess?.() },
          onError: (e) => toast.error(e.message),
        }
      )
    } else {
      create(data, {
        onSuccess: () => { toast.success('Entity created'); onSuccess?.() },
        onError: (e) => toast.error(e.message),
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter name..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Saving...' : editId ? 'Update Entity' : 'Create Entity'}
        </Button>
      </form>
    </Form>
  )
}
```

---

## Module Directory Structure (Required)

```
features/
└── entities/                    # Module root
    ├── _components/             # Module-local components only
    │   ├── entity-dialog.tsx
    │   ├── entity-form.tsx
    │   ├── entity-columns.tsx
    │   └── entity-card.tsx
    ├── _hooks/                  # Module-local hooks only
    │   └── use-entity.ts
    ├── [id]/                    # Detail page
    │   └── page.tsx
    └── page.tsx                 # List page
```

**Rule:** Nothing inside `_components/` or `_hooks/` is imported by another feature. If something needs to be shared, it goes to `components/shared/` — and that is a conscious architectural decision, not a shortcut.
