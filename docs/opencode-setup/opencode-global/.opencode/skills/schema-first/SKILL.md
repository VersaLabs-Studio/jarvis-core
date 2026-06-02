---
name: Schema-First Development
description: >
  Enforces Kidus Abdula's Schema-First methodology. Load this skill before any
  database design, type generation, Zod schema creation, or config setup.
  No code is written until this process is complete.
version: 1.0.0
---

# Schema-First Development Skill

**Pillar 1 of the Architectural DNA.** This process is the entry point for every new entity, module, or feature. Code does not exist until data does.

---

## The Mandatory Flow

```
DOMAIN MODEL (whiteboard)
        ↓
DATABASE SCHEMA (SQL)
        ↓
GENERATED TYPES + ZOD SCHEMAS
        ↓
CENTRALIZED CONFIG
        ↓
FACTORY HOOKS + API ROUTES
        ↓
UI COMPONENTS
```

Never skip steps. Never reverse order. Starting at UI before completing schema is an architectural violation.

---

## Step 1 — Domain Modeling

Before writing SQL, answer these questions for every entity:

```
Entity: [Name]
Purpose: What does this represent in the business domain?
Key attributes: [list the most important fields]
Relationships:
  - belongs_to: [parent entities]
  - has_many: [child entities]
  - many_to_many: [through what join table?]
Access control:
  - Who can READ? (public / authenticated / admin only)
  - Who can WRITE? (owner / admin / specific roles)
Tier placement:
  - Public tier exposure? [yes/no]
  - Dashboard tier? [yes/no]
  - Admin tier? [yes/no]
```

---

## Step 2 — Database Schema (Supabase/PostgreSQL)

```sql
-- Template for every table:
CREATE TABLE public.entity_name (
  -- Identity
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core fields (domain-specific)
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive', 'archived')),

  -- Ownership (always include for multi-tenant)
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Metadata (always include)
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at  TIMESTAMPTZ  -- soft delete support
);

-- Indexes (always create these):
CREATE INDEX idx_entity_org_id    ON entity_name(org_id);
CREATE INDEX idx_entity_status    ON entity_name(status);
CREATE INDEX idx_entity_created_at ON entity_name(created_at DESC);

-- Soft delete filter (apply globally):
-- In queries: WHERE deleted_at IS NULL

-- RLS (always enable):
ALTER TABLE entity_name ENABLE ROW LEVEL SECURITY;

-- RLS Policies template:
CREATE POLICY "Public read" ON entity_name
  FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Authenticated write" ON entity_name
  FOR ALL USING (auth.uid() = created_by OR /* role check */);
```

---

## Step 3 — Type Generation

After schema is in Supabase, generate types:

```bash
# Supabase type generation:
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts

# Never handwrite database types. Always generate.
```

---

## Step 4 — Derived Types (types/index.ts)

```ts
import type { Database } from './database.types'

// Raw row type (from DB):
export type EntityRow = Database['public']['Tables']['entity_name']['Row']
export type EntityInsert = Database['public']['Tables']['entity_name']['Insert']
export type EntityUpdate = Database['public']['Tables']['entity_name']['Update']

// Application types (add computed/joined fields):
export type Entity = EntityRow & {
  // Add any joined relations:
  creator?: { id: string; full_name: string }
  // Add any computed fields:
  display_name?: string
}
```

---

## Step 5 — Zod Schemas (schemas/entity.schema.ts)

```ts
import { z } from 'zod'

// Base schema (matches DB constraints):
export const entitySchema = z.object({
  id:          z.string().uuid().optional(),
  name:        z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  status:      z.enum(['active', 'inactive', 'archived']).default('active'),
  org_id:      z.string().uuid(),
  created_at:  z.string().datetime().optional(),
  updated_at:  z.string().datetime().optional(),
})

// Create schema (omit auto-generated fields):
export const createEntitySchema = entitySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

// Update schema (all fields optional):
export const updateEntitySchema = createEntitySchema.partial()

// Type inference:
export type EntityFormData = z.infer<typeof createEntitySchema>
export type UpdateEntityData = z.infer<typeof updateEntitySchema>
```

---

## Step 6 — Centralized Config (config/entities.ts)

```ts
// Every entity is registered here. This is the single source of truth
// for how the factory knows to access each entity.

export const ENTITY_CONFIG = {
  entity_name: {
    table:       'entity_name',           // DB table name
    label:       'Entity',                // Display name (singular)
    labelPlural: 'Entities',              // Display name (plural)
    searchFields: ['name', 'description'], // Fields searched in list queries
    labelField:  'name',                  // Field used as display label
    sortField:   'created_at',            // Default sort
    sortOrder:   'desc' as const,
    // API paths:
    publicPath:    '/api/public/entities',
    protectedPath: '/api/cms/entities',
  },
} as const

export type EntityKey = keyof typeof ENTITY_CONFIG
```

---

## Step 7 — Query Key Factory (lib/query-keys.ts)

```ts
// Add to the central query key factory:
export const EntityKeys = {
  all:  ()         => ['Entity']                as const,
  list: (opts?: object) => ['Entity', 'list', opts] as const,
  doc:  (id: string)    => ['Entity', 'doc', id]    as const,
}
```

---

## Audit Checklist (Before Moving to Implementation)

```
Schema-First Completion Checklist:
[ ] SQL migration written and reviewed
[ ] Migration applied to development database
[ ] Types generated (not handwritten)
[ ] Derived application types created
[ ] Zod create + update schemas defined
[ ] Config entry added to centralized config
[ ] Query keys added to factory
[ ] RLS policies applied and tested
[ ] Indexes created for all foreign keys + sort fields

→ ONLY after all boxes are checked: proceed to factory hooks and API routes
```
