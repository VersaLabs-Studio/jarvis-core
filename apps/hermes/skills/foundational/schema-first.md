---
name: schema-first
description: Schema-First Development methodology — SQL migration first, then generated types, Zod schemas, derived types, factory config, hooks, and only then UI. The order is non-negotiable; reversing any step is a P1 audit blocker.
trigger:
  - "schema"
  - "migration"
  - "entity"
  - "database"
tools_required: []
category: foundational
estimated_time: "1 minute"
always_loaded: false
preferred_model_role: audit
---

# Schema-First Development

## Purpose

Enforce the JARVIS Schema-First methodology. The database schema is the **single source of truth** for the data model. Code, types, and UI are all derived from it; nothing is hand-written in parallel. The order — SQL → generated types → Zod → derived types → config → hooks → UI — is non-negotiable. Reversing it is a P1 audit blocker (C1 in the original audit).

The discipline prevents drift, keeps the API contract honest, and makes the codebase auditable. A new entity added without a migration is a bug.

## Prerequisites

- Supabase CLI installed and authenticated (`supabase login`)
- `supabase` project linked (the local project is `jarvis-core`)
- The shared package at `packages/shared` is set up (it consumes the generated types)
- A clear data model: which entities, which relationships, which RLS policies, which triggers

## Steps

### Step 1: Author the SQL migration

Create a new file at `supabase/migrations/<UTC-timestamp>_<name>.sql`. The filename is the audit ID (e.g. `20260612143000_add_invoice_tables.sql`). The file must contain, in this order:

1. **`CREATE TABLE`** — columns, types, defaults, NOT NULL constraints, CHECK constraints
2. **Indexes** — on every FK column + every column used in WHERE/ORDER BY
3. **Triggers** — `updated_at` auto-bump, soft-delete cascades, denormalized columns
4. **RLS policies** — `ENABLE ROW LEVEL SECURITY`; policies for SELECT/INSERT/UPDATE/DELETE; role-based; tenant-scoped
5. **Grants** — `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO authenticated`
6. **Comments** — `COMMENT ON TABLE <table> IS '...'` for the human reader

Apply locally: `supabase db reset` (drops + recreates from all migrations in order).

### Step 2: Generate types and commit them

Run:

```bash
supabase gen types typescript --local > packages/shared/src/types/database.types.ts
```

The file is **generated** — never hand-edited. The `pnpm type-drift:check` CI gate runs a hash compare; drift blocks the merge. Commit the regenerated file in the same PR as the migration.

The generated type is `Database["public"]["Tables"]["<table>"]["Row"]`. Don't use it directly in routes; derive from it.

### Step 3: Write the Zod schema

Create `packages/shared/src/schemas/<entity>.schema.ts`:

```ts
import { z } from "zod";

export const entityInsertSchema = z.object({
  // Zod types here, NOT the generated Row type. The insert shape may omit
  // server-managed columns (id, created_at, updated_at, tenant_id).
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(280),
  // ... etc
});

export const entityUpdateSchema = entityInsertSchema.partial();

export const entityRowSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  // ... fields from entityInsertSchema
});

export type EntityInsert = z.infer<typeof entityInsertSchema>;
export type EntityUpdate = z.infer<typeof entityUpdateSchema>;
export type EntityRow = z.infer<typeof entityRowSchema>;
```

The schema is the **single source of truth** for the entity's shape on the wire. The generated type is the database shape; the Zod schema is the API shape. They may differ (e.g. `created_at` is generated, not sent).

### Step 4: Add the entity to the registry

In `packages/shared/src/lib/registry.ts` (or the relevant factory-key module), add:

```ts
import { entityInsertSchema, entityUpdateSchema } from "../schemas/entity.schema.js";

export const ENTITIES = {
  // ... existing entities
  entity: {
    table: "entity",
    insert: entityInsertSchema,
    update: entityUpdateSchema,
    // ... any cross-cutting metadata
  },
} as const;
```

Add the `keys` factory entry too:

```ts
export const keys = {
  // ... existing
  entity: {
    all: () => ["entity"] as const,
    lists: () => ["entity", "list"] as const,
    list: (filters?: object) => ["entity", "list", filters ?? {}] as const,
    details: () => ["entity", "detail"] as const,
    detail: (id: string) => ["entity", "detail", id] as const,
  },
} as const;
```

### Step 5: Register the entity in the API factory

In `apps/api/src/factory/register-entities.ts`:

```ts
await registerCrud(protectedScope, "entity", {
  table: "entity",
  insertSchema: entityInsertSchema,
  updateSchema: entityUpdateSchema,
  // ... default sort, allowed roles, etc.
});
```

This wires `GET /api/cms/entity`, `GET /api/cms/entity/:id`, `POST /api/cms/entity`, `PATCH /api/cms/entity/:id`, `DELETE /api/cms/entity/:id` automatically. No bespoke handlers.

### Step 6: Use the factory hooks on web + mobile

In `apps/web/src/hooks/use-entity.ts`:

```ts
import { useList, useDoc, useCreate, useUpdate, useDelete } from "@/hooks/use-entity";
import { keys } from "@jarvis/shared";
import type { EntityInsert, EntityUpdate } from "@jarvis/shared";

export const useEntityList = (filters?: object) =>
  useList("entity", keys.entity.list(filters));
export const useEntity = (id: string) =>
  useDoc("entity", id, keys.entity.detail(id));
export const useCreateEntity = () =>
  useCreate<EntityInsert>("entity", keys.entity.all());
export const useUpdateEntity = () =>
  useUpdate<EntityUpdate>("entity", keys.entity.all());
export const useDeleteEntity = () =>
  useDelete("entity", keys.entity.all());
```

The same five hooks on mobile, with the same `keys` import from `@jarvis/shared`. Cache invalidation works automatically because both apps consume the same keys.

### Step 7: UI components (columns, form, dialog, card)

Build four components, in this order:

1. **`<EntityColumns />`** — the TanStack Table column defs (id, name, description, created_at, actions)
2. **`<EntityForm />`** — the create/edit form; uses `react-hook-form` + the Zod schema (`zodResolver(entityInsertSchema)`)
3. **`<EntityDialog />`** — the create/edit dialog; wraps `<EntityForm />`; calls `useCreateEntity` or `useUpdateEntity`
4. **`<EntityCard />`** — the detail-card view; uses `useEntity(id)`; shows all fields

### Step 8: Pages (list, detail)

`<EntityListPage />` — uses `useEntityList()`, renders the columns + a "Create" button that opens `<EntityDialog />`.

`<EntityDetailPage />` — uses `useEntity(id)`, renders `<EntityCard />` + an "Edit" button.

Both pages get the Framer Motion stagger entrance (see `premium-ui` skill).

## Output

A new entity lands as 1 SQL migration + 1 generated types commit + 1 Zod schema + 1 registry entry + 1 register-entities line + 5 factory hooks + 4 UI components + 2 pages. The PR cites the migration filename as the audit ID. The CI gate (`pnpm type-drift:check`) confirms the generated types match the migration.

## Error Handling

- **Migration fails locally** — read the Postgres error; the migration is atomic; `supabase db reset` re-applies from scratch. Never edit a committed migration; if the design is wrong, add a new migration.
- **Generated types drift from migrations** — `pnpm type-drift:check` fails; the CI gate blocks the merge. Re-run `supabase gen types` and commit the result.
- **Zod schema disagrees with the API contract** — the Zod schema is the source of truth for the API. If the API receives a payload Zod doesn't validate, the API rejects it (422). Update the schema; never widen the API silently.
- **Two sources of truth appear** (e.g. someone hand-writes a Row type in a route) — the auditor catches it. Refactor to `z.infer<typeof entityRowSchema>`.
- **Cache invalidation misses a write** — every mutation must use the factory hook (which calls `keys.entity.all()` for invalidation). Bespoke fetch + setState bypasses the cache and is a P2 violation.

## Quality Checks

```bash
# 1. Generated types match migrations
pnpm type-drift:check

# 2. The entity is wired through the factory
pnpm factory-check
# Expected: entity appears in the registered-entities list

# 3. No hand-written types for the entity
grep -rn "interface Entity" apps packages --include="*.ts" --include="*.tsx" \
  | grep -v "z.infer" | grep -v ".d.ts"
# Expected: 0 hits

# 4. No bespoke CRUD on the entity
grep -rn "supabase.*from.*entity" apps packages --include="*.ts" --include="*.tsx"
# Expected: only the register-entities.ts line; the rest go through the factory

# 5. Zod is at the boundary
grep -rn "JSON.parse\|req.body" apps/api/src/routes --include="*.ts" \
  | grep -v "ZodError" | grep -v "safeParse"
# Expected: 0 hits (every route validates with Zod)
```

A schema-first implementation that doesn't pass all five is a P1 violation. The merge is blocked.
