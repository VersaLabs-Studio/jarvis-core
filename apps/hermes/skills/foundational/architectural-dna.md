---
name: architectural-dna
description: The JARVIS Architectural DNA v1.0.0 — the Six Pillars every implementation must honor. Always-loaded system context; consulted on every architectural decision.
trigger:
  - "DNA"
  - "architecture"
  - "pillar"
  - "principles"
tools_required: []
category: foundational
estimated_time: "1 minute"
always_loaded: true
preferred_model_role: audit
---

# Architectural DNA

> **This is the only `always_loaded: true` skill.** Every Hermes turn starts with this context. The LLM uses it to evaluate its own work and the work of any sub-agent. Consult it before every architectural decision; ignore it at the cost of an audit blocker.

## Purpose

Encode the JARVIS Architectural DNA v1.0.0 — the **Six Pillars** that govern every implementation. The DNA is not a stylistic preference; it is a code-review gate, an auditor rubric, and a contract between agents. Every commit, every plan doc, every audit report cites the pillars it satisfies and the pillars it risks violating. The pillars are not negotiable; the *implementation* of a pillar is the engineer's choice.

## Prerequisites

- Familiarity with monorepo + pnpm + Turborepo conventions (see `apps/`, `packages/`)
- Understanding of the three-tier API surface: `/api/public/*` (read-only, no auth) · `/api/cms/*` (auth + full CRUD) · `/api/${resource}` (bespoke routes — never under `/cms/`)
- Knowledge of the standing DNA gates: `pnpm tsc --noEmit` · `pnpm any-gate` · `pnpm color-gate` · `pnpm type-drift:check` · `pnpm import-check` · `pnpm factory-check`

## Steps

### The Six Pillars

#### P1 — Schema-First

The database schema is the **source of truth**. No code is written before the migration. The order is non-negotiable:

1. **SQL migration** under `supabase/migrations/<timestamp>_<name>.sql` (tables, RLS, triggers, indexes)
2. **Generated types** via `supabase gen types` → `packages/shared/src/types/database.types.ts`
3. **Derived types** in `packages/shared/src/types/<entity>.ts` (Row, Insert, Update)
4. **Zod schemas** in `packages/shared/src/schemas/<entity>.schema.ts` for runtime validation
5. **Config** (factory configs, query-key factories, register-entities entries)
6. **Hooks** (factory hooks: `useList`/`useDoc`/`useCreate`/`useUpdate`/`useDelete`)
7. **UI** (columns, form, dialog, card)
8. **Pages** (list, detail)

Reversing any step is a P1 violation. Hand-written types in a route are a P1 violation. Two sources of truth for the data model are an automatic P1 audit blocker.

#### P2 — Factory Pattern

Every CRUD operation goes through the **generic factory**, never bespoke. The factory lives at `apps/api/src/factory/crud.ts` (`createListHandler`, `createGetHandler`, `createCreateHandler`, `createUpdateHandler`, `createDeleteHandler`). For every entity:

- `apps/api/src/factory/register-entities.ts` registers the entity config (table name, RLS path, allowed roles, Zod schema)
- `apps/api/src/keys/<entity>.ts` defines the TanStack Query-key factory (`all`, `lists`, `list(filters)`, `details`, `detail(id)`)
- Mobile/web consume the same `@jarvis/shared` `keys` factory + `CrudEntityKey` type — no second CRUD wrapper

Bespoke `supabase.from(...).insert(...)` in a handler is a P2 violation. A second CRUD layer on the client is a P2 violation. The factory reduces boilerplate by 70%+ and ships new modules in hours, not days.

#### P3 — Extreme Modularization

Each feature = its own directory (`_components/`, `_hooks/`, `_types/`, API routes). **No cross-feature imports.** The import-direction gate (`pnpm import-check`) enforces it. A `features/auth/hooks/use-auth.ts` may import from `features/shared/` or `packages/shared/`, but never from `features/billing/`. Worktrees may add features without merging; the merge conflict surface is per-file, not per-module.

Three concrete rules:

- **`_components/`, `_hooks/`, `_lib/`, `_types/`** — the underscore prefix is intentional; it sorts the folder above the public exports and signals "module-internal, do not import from outside the feature."
- **No barrel re-exports of internal state.** `features/auth/index.ts` may export the public surface (`LoginForm`, `useAuth`); it must not re-export every internal hook.
- **Public APIs are a contract.** Renaming a `LoginForm` is a breaking change; renaming `_use-login-validation.ts` is not.

#### P4 — Premium UI

The UI is the **first impression** the user has of the system. Premium is not aesthetic preference; it is a business strategy. Every screen must:

- Use **OKLCH tokens** (no hardcoded `bg-white`, `text-gray-500`, etc.). The lint gate `pnpm color-gate` enforces it; zero hits is the bar.
- **Glassmorphism + Framer Motion** on every page. The first load animates in (opacity + translateY, 200-400ms, with a stagger of 50-100ms between siblings).
- **Responsive by default** — mobile-first, breakpoints at `sm/md/lg/xl`, no fixed widths.
- **Light + dark mode** — both are first-class; the OKLCH token table defines both.
- **Accessible by default** — `aria-*` on interactive elements, keyboard navigable, focus rings visible.
- **All four data-view states** — loading (skeleton + spinner), empty (illustration + CTA), error (retry button + correlation id), success (the data).

Premium is a floor, not a ceiling. A demo must be deployable; a deploy must look like a $50K+ product.

#### P5 — Documentation as Architecture

Docs are written **before** code and are the source of truth. The order:

1. `docs/PART<N>-*.md` — the master architecture doc (P1, P2, P3, P4, P5)
2. `docs/PHASE-<X>-PLAN.md` — the phase plan; WP map, gate criteria, carryover ledger
3. `docs/PHASE-<X>-HANDOFF.md` — the BRAIN's dispatch into the phase
4. `docs/PHASE-<X>-GATE-FINDINGS.md` — the audit report
5. `README.md` and inline JSDoc on every exported function
6. **CHANGELOG.md** per deploy

A doc that disagrees with the code is a bug in the doc, not the code. The plan-agent reviews docs first, then approves the implementation. The audit-agent reads docs to score the work.

#### P6 — End-to-End Type Safety

TypeScript **strict everywhere**. `tsc --noEmit` is 0 across all apps + the shared package. The rules:

- **No `any` in production paths.** The `pnpm any-gate` enforces it; zero hits. `unknown` is the only escape hatch; narrow it at the boundary.
- **Zod at every runtime boundary** — every API request body, every MCP tool argument, every cron job spec. Zod schemas are the same instances used for `z.infer`-derived TypeScript types (one source of truth for shape + runtime check).
- **Generated types only.** Database row types come from `supabase gen types`; everything else comes from `z.infer<typeof SomeSchema>` or from `@jarvis/shared`. Hand-written types that mirror generated types are a P6 violation.
- **Strict mode flags** — `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`. The `tsconfig.json` extends `@jarvis/config` and inherits the strict baseline.

## Output

Every implementation report must cite which pillars it satisfies and which it risks violating. A PR body in the form:

> **WP:** E0 · **Implements:** Part 1 §1.4 · **Satisfies:** P1 (SQL migration → generated types), P2 (factory only), P3 (single app), P5 (Part 1 §1.4 updated) · **Closes:** C5, H1, H2

The auditor scores the PR by walking the pillars, not by vibes.

## Error Handling

When a pillar violation is detected:

- **P1 (schema-first)** — refuse the PR; require the migration to land first. The audit ID is the migration filename.
- **P2 (factory)** — refuse the PR; require the factory hook. The audit ID is the entity + the handler name.
- **P3 (modularization)** — refuse the cross-feature import; require the import to be inlined or moved to `shared/`.
- **P4 (premium UI)** — block the merge until the OKLCH tokens are used, the Framer Motion stagger is in, and the four data-view states are present. The audit IDs are the lint-gate output.
- **P5 (docs)** — block the merge until the docs are updated to match the code. The audit ID is the doc filename.
- **P6 (type safety)** — block the merge on any `any`; the `any-gate` output is the audit ID.

## Quality Checks

Before declaring a task done, run:

```bash
pnpm -r typecheck                    # tsc --noEmit 0 across all packages
pnpm any-gate                        # zero `any` in production
pnpm color-gate                      # zero hardcoded colors in apps/web + apps/mobile
pnpm factory-check                   # all CRUD goes through the factory
pnpm import-check                    # no cross-feature imports
pnpm type-drift:check                # generated types match migrations
```

If any check fails, the task is not done. The audit-agent runs these as part of the gate; failing them is a merge blocker regardless of the auditor's score.
