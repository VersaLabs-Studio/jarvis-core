# JARVIS v1.5 — Auditor Assessment Framework

> **Authority:** Architectural DNA v1.0.0 (`ARCHITECTURAL_DNA.md`)
> **Scope:** Full v1.5 build (Phases A–F)
> **Merge Floor:** 8.5/10 (codified gate)
> **Exemplary Bar:** 9.2/10 ("impresses everyone" threshold)
> **Date:** June 2026

---

## 1. Scoring Rubric — Detailed 0–10 Criteria

### Category A: Schema-First Compliance (Weight: 20%)

| Score | Criteria |
|-------|----------|
| **10** | All types generated via `supabase gen types`. Zod schemas derived from generated types. Entity config centralized. Query Key Factory used everywhere. Zero `any` in data layer. RLS policies O(1) with JWT claims. Migration versioning enforced. |
| **9** | Minor deviation: 1–2 handwritten utility types (not entity types). All other checks pass. |
| **8** | Generated types used for all entities. 1–2 missing Zod schemas on non-critical routes. Query Key Factory mostly used. |
| **7** | Most types generated, but 1–3 entity types handwritten. Some hardcoded query keys. RLS uses subquery (not JWT claims). |
| **6** | Mixed generated/handwritten types. Missing centralized config for 2+ entities. No Query Key Factory. |
| **5** | Majority of types handwritten. No Zod schemas. No entity config. RLS absent or incorrectly scoped. |
| **4** | Types exist but are entirely handwritten. No runtime validation. Schema exists but not followed. |
| **3** | Incomplete type coverage. No Zod. No RLS. Schema exists but types don't match. |
| **2** | Minimal types. No validation layer. Schema is aspirational, not enforced. |
| **1** | No type system. No schema. No validation. |
| **0** | Not implemented. |

**Deductions:**
- Handwritten entity type: −3 points per occurrence
- Missing Zod schema on POST/PUT route: −2 points per route
- `any` in types/ or schemas/: −2 points per occurrence
- Missing entity config entry: −2 points per entity
- Hardcoded query key string: −1 point per occurrence
- RLS uses correlated subquery instead of JWT claim: −1 point

---

### Category B: Factory Pattern (Weight: 20%)

| Score | Criteria |
|-------|----------|
| **10** | All CRUD via factory hooks (useList/useDoc/useCreate/useUpdate/useDelete). API routes use factory handlers. Query Key Factory integrated. Zero bespoke fetch() in components. Cache invalidation on all mutations. 70%+ boilerplate reduction achieved. |
| **9** | Factory used for 90%+ of CRUD. 1–2 minor custom hooks justified. All cache invalidation correct. |
| **8** | Factory used for 80%+ of CRUD. 1–3 bespoke hooks for non-standard operations. Cache invalidation mostly correct. |
| **7** | Factory exists but 20–30% of modules use bespoke CRUD. Some missing cache invalidation. |
| **6** | Factory implemented but inconsistently used. 30–40% bespoke CRUD. Hardcoded cache keys present. |
| **5** | Factory exists as reference but most modules bypass it. Significant duplicate logic. |
| **4** | No factory implementation. Some shared hooks exist but are entity-specific. |
| **3** | No factory. Each module has its own CRUD hooks. Significant duplication. |
| **2** | No shared hook patterns. Every component fetches independently. |
| **1** | No hook abstraction. Direct fetch() calls in components. |
| **0** | Not implemented. |

**Deductions:**
- Bespoke CRUD hook bypassing factory: −3 points per module
- Missing cache invalidation on mutation: −2 points per mutation
- Hardcoded cache key string: −1 point per occurrence
- fetch() call inside component: −2 points per occurrence
- Duplicate CRUD logic across modules: −3 points per pair

---

### Category C: Extreme Modularization (Weight: 15%)

| Score | Criteria |
|-------|----------|
| **10** | Every module has `_components/` and `_hooks/`. Zero cross-feature imports. Import direction strictly enforced (ui/ ← shared/ ← feature/). No barrel exports exposing internals. Shared logic in `components/shared/` or `lib/`. Perfect P3 boundary isolation. |
| **9** | 1 minor cross-feature import that was immediately refactored. All other boundaries clean. |
| **8** | Module structure correct. 1–2 shared utilities misplaced but non-critical. Import direction mostly correct. |
| **7** | Most modules structured correctly. 2–3 cross-feature imports exist. Some shared logic in feature dirs. |
| **6** | Module structure partially implemented. 3–5 cross-feature imports. Mixed concerns in some directories. |
| **5** | Some module boundaries exist but frequently violated. 5+ cross-feature imports. |
| **4** | Minimal module separation. Feature directories exist but contain mixed concerns. |
| **3** | No clear module boundaries. Components and hooks scattered. |
| **2** | Flat structure with no feature separation. |
| **1** | No organizational pattern. |
| **0** | Not implemented. |

**Deductions:**
- Cross-feature import (sideways): −3 points per instance
- Missing `_components/` or `_hooks/` in module: −2 points per module
- Wrong import direction (feature → ui/): −3 points per instance
- Shared logic in feature directory: −2 points per instance
- Barrel export exposing internals: −1 point per instance

---

### Category D: Three-Tier Architecture (Weight: 10%)

| Score | Criteria |
|-------|----------|
| **10** | Public/Dashboard/Admin in separate route groups. Each tier has own layout shell. API namespaces correctly separated (/api/public read-only, /api/cms auth-required). No auth logic in public tier. No public-only data in admin tier. |
| **9** | Tiers correctly separated. 1 minor layout sharing that doesn't violate security. |
| **8** | Tiers exist. 1–2 minor violations (e.g., shared utility imported across tiers). |
| **7** | Tiers partially implemented. 1 tier missing own layout. API separation mostly correct. |
| **6** | 2 tiers implemented, 1 missing. Some auth logic in public tier. |
| **5** | Single tier with some route group separation. Auth mixed into public routes. |
| **4** | No tier separation. All routes in single group. |
| **3** | No route groups. Flat routing structure. |
| **2** | No API namespace separation. |
| **1** | No auth verification on protected routes. |
| **0** | Not implemented. |

**Deductions:**
- Auth logic in public tier: −4 points
- Missing layout shell for a tier: −2 points per tier
- API namespace violation (mutation in /api/public): −4 points
- Missing auth verification on /api/cms route: −3 points per route

---

### Category E: Premium UI Standards (Weight: 20%)

| Score | Criteria |
|-------|----------|
| **10** | Zero hardcoded colors. All semantic OKLCH tokens. Dual light/dark theme working. Glassmorphism on elevated surfaces. Framer Motion stagger on page load. Button hover states (scale + transition). Skeleton loading states. Empty states with illustration + action. Typography hierarchy correct. No generic AI aesthetics. Mobile-first with 44px touch targets. Responsive grid breakpoints. |
| **9** | 1–2 minor issues (e.g., 1 missing hover state). All major checks pass. |
| **8** | 3–5 minor issues. Semantic tokens used 90%+. Motion present but inconsistent. |
| **7** | 5–10 minor issues or 1–2 major issues (e.g., missing dark mode). Tokens used 80%+. |
| **6** | 10–15 minor issues or 3–4 major issues. Some hardcoded colors remain. |
| **5** | Significant UI issues. 15+ minor or 5+ major violations. Generic AI aesthetics present. |
| **4** | UI exists but doesn't meet premium standards. Many hardcoded colors. No motion. |
| **3** | Basic UI. No theming. No animations. Generic appearance. |
| **2** | Minimal UI. No design system. |
| **1** | Placeholder UI only. |
| **0** | No UI implemented. |

**Deductions:**
- Hardcoded color (bg-white, text-black, etc.): −1 point each (max −4)
- Missing dark mode: −3 points
- No Framer Motion on page load: −2 points
- Spinner instead of skeleton: −1 point per instance
- Missing empty state: −1 point per page
- Generic AI aesthetics (purple gradients, flat cards): −3 points
- Touch target < 44px: −1 point per instance
- Missing hover state on interactive element: −0.5 points per instance

---

### Category F: End-to-End Type Safety (Weight: 10%)

| Score | Criteria |
|-------|----------|
| **10** | `strict: true` in tsconfig. Zero `any` anywhere. All API responses typed. Zod validates all request bodies. Form data typed via `z.infer`. Error states typed. No unsafe type assertions. Type-drift guard passing in CI. |
| **9** | 1–2 minor `any` in non-critical paths (e.g., utility functions). All other checks pass. |
| **8** | 3–5 `any` occurrences, all in non-production paths. Most API responses typed. |
| **7** | 5–10 `any` occurrences. Some API responses untyped. Most forms validated. |
| **6** | 10–15 `any` occurrences. Several untyped API responses. |
| **5** | 15–20 `any` occurrences. Significant type gaps. |
| **4** | 20+ `any` occurrences. Type safety is aspirational. |
| **3** | Minimal typing. Most code untyped. |
| **2** | TypeScript used but not strict. |
| **1** | JavaScript with .ts extension. |
| **0** | No type system. |

**Deductions:**
- `any` in production path: −2 points per occurrence
- `any` in non-production path: −0.5 points per occurrence
- Missing Zod validation in API route: −2 points per route
- Unsafe type assertion (`as Type` without validation): −1 point per occurrence
- Untyped API response: −1 point per endpoint
- Type-drift guard failing: −3 points (automatic fail)

---

### Category G: Documentation & Naming (Weight: 5%)

| Score | Criteria |
|-------|----------|
| **10** | All complex functions have JSDoc. Non-obvious decisions have inline comments. File names kebab-case. Components PascalCase. Hooks useVerbNoun. Constants SCREAMING_SNAKE_CASE. No generic names. Module has architecture comment. |
| **9** | 1–2 missing JSDoc on complex functions. All naming conventions correct. |
| **8** | 3–5 missing JSDoc. Minor naming inconsistencies. |
| **7** | 5–10 missing JSDoc. Some naming violations. |
| **6** | 10+ missing JSDoc. Multiple naming violations. |
| **5** | Minimal documentation. Inconsistent naming. |
| **4** | Sparse documentation. Generic names used. |
| **3** | No documentation. Poor naming. |
| **2** | No comments. Inconsistent naming throughout. |
| **1** | No documentation. Random naming. |
| **0** | Not implemented. |

**Deductions:**
- Missing JSDoc on complex function: −0.5 points per function (max −3)
- Generic name (data, item, thing, stuff, foo): −0.5 points per occurrence
- Wrong naming convention: −0.5 points per occurrence

---

## 2. Audit Checklist — Phase-Specific

### Phase A — Foundation

```
SCOPE: Monorepo, shared types, Docker Compose, CI pipeline

SCHEMA-FIRST (P1):
[ ] supabase/migrations/ directory exists with versioned SQL files
[ ] supabase gen types command exists in package.json scripts
[ ] Generated types output to packages/shared/types/
[ ] No Drizzle ORM schema definitions (only raw SQL migrations)
[ ] Entity config scaffold exists (config/entities.ts)
[ ] Query Key Factory scaffold exists

FACTORY PATTERN (P2):
[ ] Factory hook scaffolds exist (useList, useDoc, useCreate, useUpdate, useDelete)
[ ] API factory handler scaffolds exist (createListHandler, etc.)
[ ] Entity registry pattern documented

MODULARIZATION (P3):
[ ] packages/shared/ exists with types/, schemas/, config/
[ ] apps/web/ structure follows ui/ ← shared/ ← feature/ direction
[ ] apps/api/ structure follows route factory pattern
[ ] Turborepo pipeline configured correctly

THREE-TIER (D):
[ ] Route groups scaffolded: (public)/, (dashboard)/, (admin)/
[ ] Each tier has layout shell placeholder
[ ] API namespaces scaffolded: /api/public/, /api/cms/

PREMIUM UI (E):
[ ] OKLCH token system initialized (globals.css or theme config)
[ ] Semantic tokens defined (bg-background, bg-card, text-foreground, etc.)
[ ] No hardcoded colors in scaffold files
[ ] Font stack configured (Geist, Inter, or Outfit)

TYPE SAFETY (F):
[ ] tsconfig.json has strict: true
[ ] No `any` in scaffold files
[ ] Type-drift guard script exists and passes
[ ] CI pipeline includes typecheck step

DOCUMENTATION (G):
[ ] Architecture decision records exist for key choices
[ ] File naming follows conventions
[ ] Package.json scripts documented

AUDIT IDS TO VERIFY:
[ ] B1 — Single source of truth for data model (SQL migrations only, no Drizzle schema)
[ ] H1 — docker.sock NOT mounted in app containers (socket-proxy used instead)
[ ] H7 — Healthchecks and mem_limit defined in compose

GATE CHECKLIST:
[ ] type-drift guard passing
[ ] raw docker.sock mounted in NO app container
[ ] Turborepo build/typecheck passing
[ ] Generated types match current migrations
```

### Phase B — API + Hermes Bridge

```
SCOPE: Auth, CRUD factory, WebSocket, secrets, RLS

SCHEMA-FIRST (P1):
[ ] All entity types generated from migrations
[ ] Zod create schemas exist for all POST routes
[ ] Zod update schemas exist (partial of create)
[ ] All entities registered in config/entities.ts
[ ] Query Key Factory entries for all entities
[ ] RLS policies use JWT claims (not correlated subqueries)

FACTORY PATTERN (P2):
[ ] CRUD route factory implemented and tested
[ ] All entity routes use factory handlers (not bespoke)
[ ] Non-CRUD routes (chat stream, service control) documented as exceptions
[ ] Error envelope standardized across all routes
[ ] Pagination contract implemented

MODULARIZATION (P3):
[ ] API routes organized by entity in separate files
[ ] Middleware in shared location (not duplicated per route)
[ ] Auth middleware separate from business logic

THREE-TIER (D):
[ ] /api/public/ routes are read-only (no mutations)
[ ] /api/cms/ routes verify authentication
[ ] Auth verification uses Supabase Auth (not custom JWT minting)
[ ] Tenant context correctly scoped

PREMIUM UI (E):
[ ] N/A for API phase (no UI components)

TYPE SAFETY (F):
[ ] All API response types defined and used
[ ] Zod validates all request bodies
[ ] Error states typed (not caught as `any`)
[ ] WebSocket message types defined
[ ] Environment variables validated via Zod

DOCUMENTATION (G):
[ ] API contract documented for each endpoint
[ ] Auth flow documented (Supabase Auth → JWT → verification)
[ ] Error codes documented

AUDIT IDS TO VERIFY:
[ ] B2 — Factory layer fully implemented (CRUD factory + entity registry)
[ ] B5 — Auth model standardized (Supabase Auth mints JWTs, API verifies only)
[ ] H3 — Integration secrets encrypted (AES-256-GCM or Supabase Vault)
[ ] H4 — RLS uses O(1) JWT claims (not correlated subqueries)

GATE CHECKLIST:
[ ] Chat round-trip works end-to-end
[ ] Factory CRUD + pagination + error envelope verified
[ ] Secrets never returned to client in API responses
[ ] Auth handshake on WebSocket connections
[ ] All mutations invalidate correct query keys
```

### Phase C — Web Dashboard

```
SCOPE: Design system, factory hooks, all dashboard pages

SCHEMA-FIRST (P1):
[ ] Query Key Factory used in all hooks (no hardcoded strings)
[ ] Entity config drives hook creation
[ ] Types imported from @jarvis/shared (not handwritten)

FACTORY PATTERN (P2):
[ ] useList/useDoc/useCreate/useUpdate/useDelete used from factory
[ ] No bespoke fetch() calls in components
[ ] All mutations call qc.invalidateQueries on success
[ ] Cache invalidation uses EntityKeys.all()

MODULARIZATION (P3):
[ ] Each page group has own directory under (dashboard)/
[ ] _components/ and _hooks/ in each module
[ ] No cross-feature imports between page modules
[ ] Shared UI components in ui/ directory
[ ] Import direction: ui/ ← shared/ ← feature/

THREE-TIER (D):
[ ] Dashboard layout shell implemented
[ ] No auth logic in dashboard components (handled by middleware)
[ ] Dashboard routes only accessible with authentication

PREMIUM UI (E):
[ ] Zero hardcoded colors (color-gate grep returns zero)
[ ] All surfaces use semantic OKLCH tokens
[ ] Light + dark mode both function correctly
[ ] Glassmorphism on elevated surfaces (modals, popovers, sidebars)
[ ] Framer Motion stagger entrance on page load
[ ] Button hover states (scale or color transition)
[ ] Loading states use skeleton (not spinner)
[ ] Empty states have illustration + description + action button
[ ] Typography hierarchy correct (h1 > h2 > h3 > body > caption)
[ ] No generic AI aesthetics (purple gradients, flat layouts)
[ ] Mobile-first: 44px touch targets, responsive grid

TYPE SAFETY (F):
[ ] No `any` in any component or hook
[ ] All API responses typed and used
[ ] Form data typed via z.infer<typeof createEntitySchema>
[ ] Error states typed (not caught as `any`)
[ ] tsc --noEmit clean

DOCUMENTATION (G):
[ ] Complex components have JSDoc
[ ] Page architecture comments explain data flow
[ ] File naming follows conventions

AUDIT IDS TO VERIFY:
[ ] B2 (client side) — Query-key factory + generic hooks implemented
[ ] All 10 pages render real data (not mock)
[ ] Skeleton/empty/error states present on all pages

GATE CHECKLIST:
[ ] color-gate grep returns zero hardcoded colors
[ ] All 10 pages render real data
[ ] Skeleton/empty/error states present
[ ] tsc clean with zero errors
[ ] Dual theme verified manually
```

### Phase D — Mobile App

```
SCOPE: Expo shell, chat, tabs, push notifications

SCHEMA-FIRST (P1):
[ ] Types imported from @jarvis/shared (not handwritten)
[ ] Query Key Factory used in mobile hooks

FACTORY PATTERN (P2):
[ ] Mobile hooks use same factory pattern as web
[ ] No bespoke fetch() in mobile components
[ ] Cache invalidation correct

MODULARIZATION (P3):
[ ] Expo router structure follows modular pattern
[ ] Each tab has own directory
[ ] Shared hooks adapted for React Native

THREE-TIER (D):
[ ] Mobile auth uses SecureStore (no plaintext tokens)
[ ] Session gating on protected screens

PREMIUM UI (E):
[ ] OKLCH tokens adapted for mobile
[ ] Dark mode works correctly
[ ] Touch targets ≥ 44px
[ ] Loading states use skeleton
[ ] Empty states present

TYPE SAFETY (F):
[ ] No `any` in mobile code
[ ] tsc clean
[ ] SecureStore types correct

DOCUMENTATION (G):
[ ] Mobile-specific patterns documented
[ ] Navigation structure documented

GATE CHECKLIST:
[ ] Phone → streaming response works
[ ] SecureStore used (no plaintext tokens)
[ ] tsc clean
[ ] Push notifications wired
```

### Phase E — Skills & Workflows

```
SCOPE: Skill documents, MCP servers, cron schedules

SCHEMA-FIRST (P1):
[ ] Skill documents follow Part 4 structure
[ ] MCP package names verified and pinned
[ ] Model IDs verified at openrouter.ai/models

FACTORY PATTERN (P2):
[ ] N/A for documentation phase

MODULARIZATION (P3):
[ ] Skills organized by category (foundational vs workflow)
[ ] MCP servers isolated in own containers
[ ] Hermes code-exec sandbox separate and resource-capped

THREE-TIER (D):
[ ] N/A for documentation phase

PREMIUM UI (E):
[ ] N/A for documentation phase

TYPE SAFETY (F):
[ ] MCP package names correct and pinned
[ ] Model IDs verified
[ ] Skill documents internally consistent

DOCUMENTATION (G):
[ ] All 18 skills documented
[ ] Canonical skill list reconciled across all docs
[ ] MCP package names correct (@supabase/mcp-server-supabase, etc.)
[ ] Model IDs verified

AUDIT IDS TO VERIFY:
[ ] C4 — MCP package names corrected and pinned
[ ] C5 — Model IDs verified
[ ] H2 — MCP servers pinned versions, prebuilt image, mem_limit

GATE CHECKLIST:
[ ] All 18 skills load successfully
[ ] Morning-audit + ship-feature end-to-end works
[ ] Every MCP server answers POST /v1/mcp/test
[ ] Cron schedules trigger correctly
```

### Phase F — Deploy & Polish

```
SCOPE: TLS, backups, observability, VPS deployment

SCHEMA-FIRST (P1):
[ ] Migrations versioned and documented
[ ] Backup includes migration history

FACTORY PATTERN (P2):
[ ] N/A for deployment phase

MODULARIZATION (P3):
[ ] Deployment scripts in scripts/ directory
[ ] Backup/restore scripts separate from app code

THREE-TIER (D):
[ ] TLS terminates at nginx
[ ] 80 → 443 redirect working
[ ] HSTS header present
[ ] Public routes accessible without auth

PREMIUM UI (E):
[ ] N/A for deployment phase

TYPE SAFETY (F):
[ ] Environment variables validated
[ ] No secrets in code or compose files

DOCUMENTATION (G):
[ ] Deployment runbook documented
[ ] Backup/restore procedures documented
[ ] Rollback procedures documented
[ ] SPOF trade-off explicitly stated

AUDIT IDS TO VERIFY:
[ ] B3 — nginx limit_req_zone in http{} block (not server{})
[ ] B4 — TLS on 443, 80→443 redirect, HSTS
[ ] H5 — Backup/restore scripts exist and tested
[ ] H6 — Observability live (pino → system_logs, /metrics, Sentry/GlitchTip)
[ ] H7 — Healthchecks and mem_limit on all containers
[ ] H8 — SPOF trade-off documented with recovery path

GATE CHECKLIST:
[ ] TLS live on VPS
[ ] Restore drill passes
[ ] Errors land in tracker
[ ] Mobile connects to VPS
[ ] All healthchecks passing
[ ] Backup produced and verified
```

---

## 3. Audit ID Tracking

### ID Registry

| ID | Description | Phase Closed | Verification Method |
|----|-------------|--------------|---------------------|
| **B1** | Dual source of truth for data model | A | `grep -r "Drizzle" apps/ packages/` returns zero. Only `supabase/migrations/` exists. Types generated via `supabase gen types`. |
| **B2** | Factory layer missing | B + C | Factory hooks exist in `packages/shared/hooks/factory/`. All entity routes use `createXHandler()`. Query Key Factory used in all hooks. |
| **B3** | Invalid nginx rate-limit config | F | `limit_req_zone` in `http {}` block of nginx.conf. `limit_req` only in `location` blocks. nginx starts without error. |
| **B4** | No TLS in compose topology | F | Port 443 exposed. Certs mounted. 80→443 redirect. HSTS header present. Let's Encrypt/certbot flow documented. |
| **B5** | Auth model ambiguity | B | Supabase Auth mints JWTs. API verifies only (never mints). `JWT_SECRET` = Supabase JWT secret. Auth flow documented. |
| **H1** | docker.sock mounted in app containers | A | `docker.sock` NOT in api or hermes volumes. Socket-proxy (Tecnativa) fronts the socket. API only has containers:read+restart. |
| **H2** | MCP servers unpinned | E | All MCP packages pinned to exact versions. Prebuilt image with deps installed at build. `mem_limit` per container. Optional servers behind compose `profiles`. |
| **H3** | Integration secrets unencrypted | B | AES-256-GCM encryption via `MASTER_ENCRYPTION_KEY` or Supabase Vault. Encrypt/decrypt boundary documented. No plaintext tokens in `integrations.config`. |
| **H4** | RLS uses correlated subquery | B | RLS policies use `(auth.jwt() ->> 'tenant_id')::uuid`. `auth.uid()` wrapped as `(select auth.uid())`. No correlated subqueries. |
| **H5** | No backup/restore/versioning | F | `scripts/backup.sh` exists. Nightly `pg_dump` to off-box storage. `supabase/migrations` as versioned change log. Restore documented and tested. |
| **H6** | No observability | F | Structured `pino` logs → `system_logs`. `/metrics` endpoint. Health aggregation in `/api/admin/health`. Sentry/GlitchTip configured. |
| **H7** | Missing healthchecks + resource limits | A + F | All services have `healthcheck` in compose. All services have `mem_limit`. Healthchecks pass. |
| **H8** | Single VPS = SPOF | F | SPOF trade-off explicitly stated. Recovery path documented (rebuild from compose + restore from backup). RTO documented. |

### Tracking Matrix

```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Audit ID │ Phase A │ Phase B │ Phase C │ Phase D │ Phase E │ Phase F │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ B1      │ CLOSED  │    —    │    —    │    —    │    —    │    —    │
│ B2      │ scaffold│ CLOSED  │ CLOSED  │    —    │    —    │    —    │
│ B3      │    —    │    —    │    —    │    —    │    —    │ CLOSED  │
│ B4      │    —    │    —    │    —    │    —    │    —    │ CLOSED  │
│ B5      │    —    │ CLOSED  │    —    │    —    │    —    │    —    │
│ H1      │ CLOSED  │    —    │    —    │    —    │    —    │    —    │
│ H2      │    —    │    —    │    —    │    —    │ CLOSED  │    —    │
│ H3      │    —    │ CLOSED  │    —    │    —    │    —    │    —    │
│ H4      │    —    │ CLOSED  │    —    │    —    │    —    │    —    │
│ H5      │    —    │    —    │    —    │    —    │    —    │ CLOSED  │
│ H6      │    —    │    —    │    —    │    —    │    —    │ CLOSED  │
│ H7      │ CLOSED  │    —    │    —    │    —    │    —    │ CLOSED  │
│ H8      │    —    │    —    │    —    │    —    │    —    │ CLOSED  │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

### Verification Commands

```bash
# B1 — Single source of truth
grep -r "Drizzle" apps/ packages/ --include="*.ts" --include="*.tsx"
# Expected: zero matches

# B2 — Factory usage
grep -r "useList\|useDoc\|useCreate\|useUpdate\|useDelete" apps/web/src/ --include="*.ts" --include="*.tsx"
# Expected: all imports from @jarvis/shared/hooks/factory

# B5 — Auth model
grep -r "JWT_SECRET" apps/api/src/ --include="*.ts"
# Expected: only in verification middleware, never in token minting

# H1 — Socket proxy
grep -r "docker.sock" docker-compose*.yml
# Expected: only in socket-proxy service, NOT in api or hermes

# H4 — RLS performance
grep -r "SELECT tenant_id FROM profiles" supabase/migrations/
# Expected: zero matches (should use JWT claims)

# Type-drift guard
pnpm typecheck && pnpm type-drift:check
# Expected: both pass
```

---

## 4. Gate Enforcement

### The 8.5 Floor — Codified Gate

```
MERGE DECISION MATRIX:

Score ≥ 9.5  → Exemplary    → Merge immediately. Flag as Golden Template candidate.
Score 8.5–9.4 → Strong      → Merge allowed. Suggestions noted but non-blocking.
Score 7.0–8.4 → Acceptable  → BLOCKED. Required fixes → re-audit → re-evaluate.
Score 5.0–6.9 → Below Std   → BLOCKED. Multiple violations. Full re-work required.
Score < 5.0   → Unacceptable→ BLOCKED. Reject. Major rework. Escalate to Tech Lead.
```

### Enforcement Protocol

1. **CI Gate (Automated):**
   ```yaml
   # .github/workflows/phase-gate.yml
   - name: Type-drift guard
     run: pnpm type-drift:check
   
   - name: TypeScript strict check
     run: tsc --noEmit --strict
   
   - name: Color gate (Phase C+)
     run: |
       if grep -rn "bg-white\|bg-black\|text-gray-\|text-black\|text-white" apps/web/src/; then
         echo "FAIL: Hardcoded colors found"
         exit 1
       fi
   
   - name: Any gate
     run: |
       if grep -rn ": any\|as any\|<any>" apps/ packages/ --include="*.ts" --include="*.tsx"; then
         echo "FAIL: TypeScript 'any' found"
         exit 1
       fi
   ```

2. **Auditor Gate (Manual):**
   - Auditor produces scored report using this framework
   - Report must include audit ID closure verification
   - Score < 8.5 = merge blocked, regardless of Code Review approval
   - Score ≥ 8.5 + 0 Code Review blockers = merge allowed

3. **Kidus Verify Gate (Human):**
   - Human sign-off on phase gate
   - Run the app, confirm behavior matches spec
   - Approve `phase/* → develop` PR

### Gate Failure Protocol

```
IF score < 8.5:
  1. Auditor produces report with Required Fixes
  2. Execute sub-agent addresses fixes on same feat/* branch
  3. Code Review re-reviews
  4. Auditor re-audits
  5. IF still < 8.5:
     a. Tech Lead reviews the abstraction
     b. Re-plan the work package
     c. Escalate to Kidus if architectural decision needed
  6. NEVER force-merge below 8.5
```

---

## 5. Type-Drift Guard

### Implementation

```typescript
// scripts/type-drift-check.ts
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const MIGRATIONS_DIR = 'supabase/migrations';
const GENERATED_TYPES = 'packages/shared/types/database.types.ts';
const HASH_FILE = '.type-drift-hash';

/**
 * Type-Drift Guard
 * 
 * Ensures generated types match current migrations.
 * Blocks merge if types are stale.
 * 
 * DNA Pillar: P1 (Schema-First) + P6 (End-to-End Type Safety)
 */

function getMigrationsHash(): string {
  const migrations = execSync(`find ${MIGRATIONS_DIR} -name "*.sql" -type f | sort`)
    .toString()
    .trim()
    .split('\n');
  
  const content = migrations
    .map(f => readFileSync(f, 'utf-8'))
    .join('\n');
  
  return createHash('sha256').update(content).digest('hex');
}

function getStoredHash(): string | null {
  try {
    return readFileSync(HASH_FILE, 'utf-8').trim();
  } catch {
    return null;
  }
}

function regenerateTypes(): void {
  console.log('Regenerating types from migrations...');
  execSync('supabase gen types typescript --local > ' + GENERATED_TYPES, { stdio: 'inherit' });
}

function main(): void {
  const currentHash = getMigrationsHash();
  const storedHash = getStoredHash();
  
  if (currentHash !== storedHash) {
    console.error('TYPE-DRIFT DETECTED:');
    console.error('  Migrations have changed but types have not been regenerated.');
    console.error('  Run: pnpm type-drift:fix');
    console.error('');
    console.error('  This is a merge blocker regardless of audit score.');
    process.exit(1);
  }
  
  console.log('Type-drift guard: PASS');
}

main();
```

```json
// package.json scripts
{
  "type-drift:check": "tsx scripts/type-drift-check.ts",
  "type-drift:fix": "supabase gen types typescript --local > packages/shared/types/database.types.ts && tsx scripts/type-drift-check.ts --update-hash"
}
```

### CI Integration

```yaml
# .github/workflows/ci.yml
jobs:
  type-drift-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Start Supabase
        run: supabase start
      
      - name: Check type drift
        run: pnpm type-drift:check
      
      - name: Upload types artifact
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: stale-types
          path: packages/shared/types/database.types.ts
```

### Enforcement Rules

1. **Red drift check blocks merge** regardless of audit score (per `V1.5-BUILD-HANDOFF.md` §7)
2. **CI runs on every PR** to `phase/*` and `develop` branches
3. **Fix is automated:** `pnpm type-drift:fix` regenerates types and updates hash
4. **No manual override** — if types are stale, they must be regenerated

---

## 6. Phase-Specific Audits

### Phase A Audit Focus

| Priority | Check | Weight |
|----------|-------|--------|
| CRITICAL | B1 closed (single source of truth) | 30% |
| CRITICAL | Type-drift guard exists and passes | 25% |
| HIGH | H1 closed (socket-proxy, not raw docker.sock) | 20% |
| HIGH | Monorepo structure correct | 15% |
| MEDIUM | CI pipeline configured | 10% |

**Phase A Minimum Score:** 8.5/10 on foundation checks

### Phase B Audit Focus

| Priority | Check | Weight |
|----------|-------|--------|
| CRITICAL | B2 closed (factory layer implemented) | 30% |
| CRITICAL | B5 closed (auth model standardized) | 25% |
| HIGH | H3 closed (secrets encrypted) | 15% |
| HIGH | H4 closed (O(1) RLS) | 15% |
| MEDIUM | API contracts documented | 10% |
| MEDIUM | Error envelope standardized | 5% |

**Phase B Minimum Score:** 8.5/10 on API + auth checks

### Phase C Audit Focus

| Priority | Check | Weight |
|----------|-------|--------|
| CRITICAL | B2 client side closed (factory hooks) | 25% |
| CRITICAL | Premium UI standards (P4) | 30% |
| HIGH | All pages render real data | 20% |
| HIGH | Skeleton/empty/error states | 15% |
| MEDIUM | Motion and interactions | 10% |

**Phase C Minimum Score:** 8.5/10 on UI + data layer checks

### Phase D Audit Focus

| Priority | Check | Weight |
|----------|-------|--------|
| CRITICAL | Mobile auth secure (SecureStore) | 30% |
| HIGH | Streaming chat works | 25% |
| HIGH | Shared hooks adapted correctly | 20% |
| MEDIUM | Push notifications wired | 15% |
| MEDIUM | Mobile UI meets standards | 10% |

**Phase D Minimum Score:** 8.5/10 on mobile-specific checks

### Phase E Audit Focus

| Priority | Check | Weight |
|----------|-------|--------|
| CRITICAL | C4 closed (MCP names correct) | 25% |
| CRITICAL | H2 closed (MCP pinned + prebuilt) | 25% |
| HIGH | All 18 skills load | 25% |
| HIGH | C5 closed (model IDs verified) | 15% |
| MEDIUM | Cron schedules work | 10% |

**Phase E Minimum Score:** 8.5/10 on skills + MCP checks

### Phase F Audit Focus

| Priority | Check | Weight |
|----------|-------|--------|
| CRITICAL | B3 closed (nginx config valid) | 20% |
| CRITICAL | B4 closed (TLS live) | 20% |
| CRITICAL | H5 closed (backup/restore tested) | 20% |
| HIGH | H6 closed (observability live) | 15% |
| HIGH | H8 documented (SPOF trade-off) | 10% |
| MEDIUM | All healthchecks passing | 10% |
| MEDIUM | Mobile connects to VPS | 5% |

**Phase F Minimum Score:** 8.5/10 on deployment + hardening checks

---

## 7. Remediation Protocol

### When Score < 8.5

```
STEP 1: Auditor produces detailed report
├── Required Fixes (blockers)
├── Suggestions (non-blockers)
└── Audit ID closure status

STEP 2: Orchestrator routes to Execute
├── Execute addresses Required Fixes on same feat/* branch
├── Each fix references the specific audit finding
└── Self-mark-off DoD updated

STEP 3: Code Review re-reviews
├── Focus on the specific fixes
├── Verify no new violations introduced
└── Approve if blockers cleared

STEP 4: Auditor re-audits
├── Verify Required Fixes resolved
├── Check for regression
├── Update score
└── IF still < 8.5 → repeat STEP 2–4

STEP 5: Escalation (if 3 cycles fail)
├── Tech Lead reviews the abstraction
├── Identify if pattern is wrong or implementation is wrong
├── Options:
│   a. Refactor to match DNA pattern
│   b. Document deviation as conscious decision (P5)
│   c. Re-plan work package entirely
└── Kidus approves any deviation from DNA
```

### Escalation Triggers

| Trigger | Action |
|---------|--------|
| 3 consecutive audits < 8.5 | Tech Lead review |
| Same category scoring < 6 repeatedly | Architectural review |
| Audit ID cannot be closed | Kidus decision required |
| Type-drift guard failing | Block all merges until fixed |
| Code Review blockers persisting | Debug agent engaged |

### Deviation Protocol

If a conscious deviation from DNA is required:

1. **Document in PR body:** What, why, what DNA pillar is affected
2. **Tech Lead approval:** Strategic deviation requires review
3. **Kidus sign-off:** Any deviation from Six Pillars requires architect approval
4. **Add to ARCHITECTURE-AUDIT.md:** Track as accepted deviation
5. **Score impact:** Deviation reduces category score by 1–2 points (not full deduction)

---

## 8. Reporting Format

### Standard Phase Audit Report

```markdown
# Phase [X] Audit Report: [Phase Name]
**Auditor:** Architecture Auditor (Kidus Abdula Architectural DNA v1.0)
**Scope:** Phase [X] — [Phase Description]
**Date:** [date]
**Branch:** `phase/[x]-[name]` → `develop`

---

## Score Summary

| Category | Weight | Score | Weighted Score |
|---|---|---|---|
| A. Schema-First Compliance | 20% | X/10 | X.XX |
| B. Factory Pattern | 20% | X/10 | X.XX |
| C. Extreme Modularization | 15% | X/10 | X.XX |
| D. Three-Tier Architecture | 10% | X/10 | X.XX |
| E. Premium UI Standards | 20% | X/10 | X.XX |
| F. End-to-End Type Safety | 10% | X/10 | X.XX |
| G. Documentation & Naming | 5% | X/10 | X.XX |

### **OVERALL SCORE: X.X / 10**
### **Verdict: [Exemplary / Strong / Acceptable / Below Standard / Unacceptable]**
### **Merge Decision: [APPROVED / BLOCKED]**

---

## Audit ID Closure Status

| ID | Description | Status | Evidence |
|----|-------------|--------|----------|
| [B1–H8] | [Description] | [CLOSED / OPEN / N/A] | [Verification method + result] |

### **Audit IDs Required for This Phase: X/X CLOSED**

---

## 🚨 Required Fixes (Must Resolve Before Merge)

### Fix 1: [Short title]
**Violation:** [Exact issue]
**File:** `path/to/file.ts` (line X if possible)
**DNA Pillar Violated:** [P1–P6]
**Required Action:** [Exact what to do]
**Audit ID Impact:** [Which ID this blocks]

---

## 💡 Suggestions (Non-blockers)

1. **[Title]:** [Explanation and improvement]

---

## ✅ What Was Done Well

1. [Specific praise for strong adherence]

---

## Gate Verification

```
[ ] Type-drift guard: [PASS/FAIL]
[ ] TypeScript strict: [PASS/FAIL]
[ ] Color gate: [PASS/FAIL] (Phase C+)
[ ] Any gate: [PASS/FAIL]
[ ] Part 5 checklist: [X/Y items passed]
[ ] Code Review blockers: [0/N]
```

---

## Phase [X] → Develop Merge Authorization

**Auditor:** [Name]
**Date:** [date]
**Score:** X.X / 10
**Audit IDs Required:** X/X CLOSED
**Gate Checks:** ALL PASS
**Decision:** [APPROVED / BLOCKED]

**Signature:** ____________________
```

### Release Audit Report (Phase F Complete)

```markdown
# JARVIS v1.5 — Release Audit Report
**Auditor:** Architecture Auditor (Kidus Abdula Architectural DNA v1.0)
**Scope:** Full Release (Phases A–F)
**Date:** [date]
**Target:** `develop` → `main` (tag v1.5.0)

---

## Phase Score Summary

| Phase | Score | Audit IDs Closed | Gate Status |
|-------|-------|------------------|-------------|
| A — Foundation | X.X/10 | X/X | [PASS/FAIL] |
| B — API + Bridge | X.X/10 | X/X | [PASS/FAIL] |
| C — Web Dashboard | X.X/10 | X/X | [PASS/FAIL] |
| D — Mobile App | X.X/10 | X/X | [PASS/FAIL] |
| E — Skills & Workflows | X.X/10 | X/X | [PASS/FAIL] |
| F — Deploy & Polish | X.X/10 | X/X | [PASS/FAIL] |

### **RELEASE AVERAGE: X.X / 10**

---

## Complete Audit ID Closure

| ID | Description | Phase Closed | Final Status |
|----|-------------|--------------|--------------|
| B1 | Dual source of truth | A | CLOSED |
| B2 | Factory layer missing | B + C | CLOSED |
| B3 | Invalid nginx config | F | CLOSED |
| B4 | No TLS | F | CLOSED |
| B5 | Auth model ambiguity | B | CLOSED |
| H1 | docker.sock mounted | A | CLOSED |
| H2 | MCP unpinned | E | CLOSED |
| H3 | Secrets unencrypted | B | CLOSED |
| H4 | RLS subquery | B | CLOSED |
| H5 | No backups | F | CLOSED |
| H6 | No observability | F | CLOSED |
| H7 | No healthchecks | A + F | CLOSED |
| H8 | SPOF undocumented | F | CLOSED |

### **ALL AUDIT IDS: CLOSED**

---

## Release Definition of Done

```
[ ] All six phase gates green
[ ] Every audit blocker B1–B5 closed
[ ] Every hardening H1–H8 closed or explicitly deferred
[ ] Full system live on VPS over TLS
[ ] Mobile + web + Telegram all reach Hermes
[ ] Backup produced AND restore drill passed
[ ] Observability live
[ ] CHANGELOG.md v1.5.0 written
[ ] README.md updated
[ ] AGENTS.md current
[ ] Type-drift guard green on develop
[ ] Tag v1.5.0 on main
[ ] Phase/* branches deleted
```

---

## Final Verdict

**Release Score:** X.X / 10
**Audit IDs:** ALL CLOSED
**Gate Checks:** ALL PASS
**Code Review Blockers:** 0

### **RELEASE DECISION: [APPROVED FOR v1.5.0 / BLOCKED]**

**Auditor:** ____________________
**Date:** ____________________
**Kidus Approval:** ____________________
```

---

## 9. The 8.5 vs 9.2 Decision

### 8.5 — Codified Gate (Merge Floor)

- **Purpose:** Minimum quality threshold for merge
- **Enforcement:** Automated in CI + manual auditor check
- **Consequence:** Score < 8.5 blocks merge regardless of other factors
- **Rationale:** Ensures Six Pillars compliance while allowing minor imperfections

### 9.2 — Exemplary Bar ("Impresses Everyone")

- **Purpose:** Gold standard for what "excellent" looks like
- **Enforcement:** Aspirational, not enforced
- **Consequence:** Achieving 9.2+ flags module as Golden Template candidate
- **Rationale:** Sets the target for reusable patterns across projects

### Decision Framework

```
Score 8.5–9.4: Merge approved. Work is production-quality.
                Suggestions noted for future improvement.

Score 9.5+:    Merge approved. Flag as Golden Template.
                Copy patterns to other modules/projects.

Score < 8.5:   Merge blocked. Required fixes must be addressed.
                Re-audit after fixes. No exceptions.
```

### Why 8.5 is the Right Floor

1. **Pragmatic:** Allows minor imperfections that don't affect production quality
2. **Achievable:** Teams can consistently hit 8.5 with discipline
3. **Meaningful:** Still requires strong Six Pillars compliance
4. **Enforceable:** Clear pass/fail threshold for CI and auditors

### Why 9.2 is the Aspirational Bar

1. **Exemplary:** Represents near-perfect DNA compliance
2. **Reusable:** Modules at 9.2+ become Golden Templates
3. **Impressive:** Demonstrates mastery of the methodology
4. **Rare:** Not every module needs to be exemplary, but the best should be

---

## 10. Preventing Architectural Drift

### Drift Detection Mechanisms

1. **Type-Drift Guard (CI):**
   - Runs on every PR
   - Blocks merge if types don't match migrations
   - Automated fix via `pnpm type-drift:fix`

2. **Color Gate (CI):**
   - Runs on Phase C+ PRs
   - Blocks merge if hardcoded colors found
   - Grep for `bg-white`, `text-black`, etc.

3. **Any Gate (CI):**
   - Runs on every PR
   - Blocks merge if `any` found in production paths
   - Grep for `: any`, `as any`, `<any>`

4. **Factory Usage Check (CI):**
   - Runs on Phase B+ PRs
   - Warns if bespoke CRUD hooks detected
   - Pattern match for non-factory hook imports

5. **Import Direction Check (CI):**
   - Runs on every PR
   - Blocks merge if wrong import direction detected
   - AST analysis for feature → ui/ imports

### Parallel Development Guards

1. **Module Boundaries (P3):**
   - Each module has hard boundaries
   - No cross-feature imports
   - Enables parallel work without conflicts

2. **Shared Foundation First:**
   - Types, factory, design system built serially first
   - Dependent work fans out after foundation is stable
   - Reduces merge conflicts

3. **Phase Branches:**
   - Short-lived branches per phase
   - Deleted after merge
   - Prevents long-lived branch drift

4. **Query Key Factory:**
   - Centralized cache key management
   - Prevents cache invalidation drift
   - Single source of truth for query keys

### Six Pillars Compliance Checks

| Pillar | Check | Frequency |
|--------|-------|-----------|
| P1 | Type-drift guard | Every PR |
| P1 | Generated types verification | Phase A gate |
| P2 | Factory usage audit | Phase B + C gates |
| P3 | Import direction check | Every PR |
| P3 | Cross-feature import scan | Every PR |
| P4 | Color gate | Phase C+ PRs |
| P4 | Premium UI audit | Phase C gate |
| P5 | Documentation check | Phase gates |
| P6 | Any gate | Every PR |
| P6 | TypeScript strict check | Every PR |

---

## Appendix A: Quick Reference Card

### Auditor Checklist (Per Phase)

```
BEFORE AUDIT:
[ ] Read the phase plan document
[ ] Read the relevant Part 1–5 sections
[ ] Read ARCHITECTURE-AUDIT.md for this phase's IDs
[ ] Load architectural-dna skill
[ ] Load ui-auditor skill (Phase C+)

DURING AUDIT:
[ ] Run automated checks (type-drift, color-gate, any-gate)
[ ] Review all files changed in the phase
[ ] Check each category (A–G) against rubric
[ ] Verify audit ID closure
[ ] Score each category 0–10
[ ] Calculate weighted overall score

AFTER AUDIT:
[ ] Produce report using template
[ ] Include Required Fixes if score < 8.5
[ ] Include Suggestions regardless of score
[ ] Include What Was Done Well
[ ] Verify gate checks pass
[ ] Make merge decision (APPROVED / BLOCKED)
```

### Score Calculation

```
Overall = (A × 0.20) + (B × 0.20) + (C × 0.15) + (D × 0.10) + (E × 0.20) + (F × 0.10) + (G × 0.05)

Example:
A = 9, B = 8, C = 9, D = 8, E = 9, F = 8, G = 9
Overall = (9 × 0.20) + (8 × 0.20) + (9 × 0.15) + (8 × 0.10) + (9 × 0.20) + (8 × 0.10) + (9 × 0.05)
        = 1.80 + 1.60 + 1.35 + 0.80 + 1.80 + 0.80 + 0.45
        = 8.60
Verdict: Strong → Merge approved
```

### Merge Decision Tree

```
Is type-drift guard green?
├── NO → BLOCKED (fix types first)
└── YES ↓

Is any-gate green?
├── NO → BLOCKED (remove any)
└── YES ↓

Is color-gate green? (Phase C+)
├── NO → BLOCKED (use semantic tokens)
└── YES ↓

Are Code Review blockers = 0?
├── NO → BLOCKED (fix blockers)
└── YES ↓

Is Auditor score ≥ 8.5?
├── NO → BLOCKED (fix required issues, re-audit)
└── YES ↓

Are required audit IDs closed?
├── NO → BLOCKED (close audit IDs)
└── YES ↓

MERGE APPROVED
```

---

*JARVIS v1.5 Auditor Assessment Framework — © 2026 Kidus Abdula / VersaLabs Studio.*
*Authority: Architectural DNA v1.0.0*
