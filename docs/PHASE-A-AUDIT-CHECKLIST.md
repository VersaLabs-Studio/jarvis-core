# JARVIS v1.5 — Phase A Audit Checklist

> **Authority:** Architectural DNA v1.0.0 (`ARCHITECTURAL_DNA.md`)
> **Scope:** Phase A — Foundation (WP A1–A4)
> **Merge Floor:** 8.5/10
> **Exemplary Bar:** 9.2/10
> **Auditor:** Architecture Auditor (Kidus Abdula Architectural DNA v1.0)
> **Date:** June 2026

---

## 0. Phase A Scope

Phase A establishes the **foundation** for all subsequent phases. It is schema-heavy and infrastructure-heavy, with minimal UI. The scoring rubric is reweighted to reflect Phase A priorities.

| WP | Branch | Scope | Depends On |
|----|--------|-------|------------|
| A1 | `feat/a-monorepo` | Turborepo + pnpm workspace, `packages/config`, root scripts | — |
| A2 | `feat/a-shared-types` | `packages/shared`: migrations → `supabase gen types` → generated types + Zod scaffolding (closes **B1**) | A1 |
| A3 | `feat/a-compose` | Docker Compose (hermes, redis, nginx-http, docker-socket-proxy), healthchecks, `mem_limit` (closes **H1/H7**) | A1 |
| A4 | `feat/a-ci` | CI: `turbo build/typecheck` + type-drift guard + color gate + any gate | A2 |

**Parallelization:** `A1 → (A2 ∥ A3) → A4`

---

## 1. Phase A Scoring Rubric

### Reweighted for Phase A

| Category | Standard Weight | Phase A Weight | Rationale |
|----------|:-:|:-:|-----------|
| A. Schema-First Compliance | 20% | **25%** | Phase A's primary deliverable is the single source of truth (types, migrations, Zod scaffolding) |
| B. Factory Pattern | 20% | **15%** | Scaffolding only in Phase A; full implementation in Phase B |
| C. Extreme Modularization | 15% | **20%** | Monorepo structure, package boundaries, import direction must be correct from day one |
| D. Three-Tier Architecture | 10% | **—** | Not applicable to Phase A (no routes/UI yet); scored as N/A |
| E. Premium UI Standards | 20% | **10%** | Minimal: OKLCH token system initialized, semantic tokens defined, no hardcoded colors in scaffold |
| F. End-to-End Type Safety | 10% | **20%** | Type-drift guard, strict tsconfig, zero `any` in scaffold files — all critical in Phase A |
| G. Documentation & Naming | 5% | **10%** | Architecture decision records, package.json scripts documented, naming conventions enforced |

**Phase A Weight Sum:** 25 + 15 + 20 + 0 + 10 + 20 + 10 = **100%**

### Score Calculation (Phase A)

```
Overall = (A × 0.25) + (B × 0.15) + (C × 0.20) + (E × 0.10) + (F × 0.20) + (G × 0.10)

Category D is N/A — excluded from calculation.
```

### Per-Category 0–10 Criteria (Phase A Specific)

#### A. Schema-First Compliance (25%)

| Score | Criteria |
|-------|----------|
| **10** | `supabase/migrations/` exists with versioned SQL. `supabase gen types` produces `database.types.ts`. Zero hand-written entity types. Entity config scaffold exists. Query Key Factory scaffold exists. CI type-drift guard configured and passing. No Drizzle schema references anywhere. |
| **9** | Minor deviation: 1–2 hand-written utility types (not entity types). All other checks pass. |
| **8** | Generated types used. 1–2 missing Zod schema scaffolds. Query Key Factory scaffold exists but incomplete. |
| **7** | Most types generated, but 1–3 entity types hand-written. Some hardcoded query keys. Drizzle reference remains in one file. |
| **6** | Mixed generated/handwritten types. Missing centralized config. No Query Key Factory. |
| **5** | Majority of types handwritten. No Zod schemas. No entity config. Drizzle schema still present. |
| **0–4** | Not implemented or fundamentally broken. |

**Deductions:**
- Hand-written entity type: **−3 points** per occurrence
- Drizzle schema file exists: **−4 points** (B1 violation — this is the primary Phase A blocker)
- Missing `supabase gen types` script: **−3 points**
- Missing type-drift guard: **−3 points**
- Missing entity config scaffold: **−2 points**
- Missing Query Key Factory scaffold: **−2 points**

#### B. Factory Pattern (15%)

| Score | Criteria |
|-------|----------|
| **10** | Factory hook scaffolds exist (`useList`, `useDoc`, `useCreate`, `useUpdate`, `useDelete`). API factory handler scaffolds exist. Entity registry pattern documented. All scaffolds import from shared types. |
| **9** | Scaffolds exist for 4/5 hooks. Entity registry pattern documented. |
| **8** | Scaffolds exist for 3/5 hooks. Pattern documented but not scaffolded. |
| **7** | Partial scaffolding. Pattern mentioned in docs but not implemented. |
| **6** | Minimal scaffolding. Factory pattern referenced but no code. |
| **5** | Factory pattern mentioned in architecture docs only. No code scaffolding. |
| **0–4** | Not implemented. |

**Deductions:**
- Missing factory hook scaffold: **−1 point** per missing hook
- Missing API factory handler scaffold: **−1 point** per missing handler
- No entity registry pattern: **−2 points**
- Factory hooks not importing from shared types: **−2 points**

#### C. Extreme Modularization (20%)

| Score | Criteria |
|-------|----------|
| **10** | `packages/shared/` exists with `types/`, `schemas/`, `config/`. `apps/web/` structure follows `ui/ ← shared/ ← feature/` direction. `apps/api/` structure follows route factory pattern. Turborepo pipeline configured correctly. No cross-package imports violating boundaries. |
| **9** | All package boundaries correct. 1 minor import direction issue. |
| **8** | Package structure correct. 1–2 misplaced utilities. Turborepo mostly configured. |
| **7** | Most packages structured correctly. 2–3 boundary violations. |
| **6** | Package structure partially implemented. 3–5 boundary violations. |
| **5** | Some package boundaries exist but frequently violated. |
| **0–4** | Not implemented or flat structure. |

**Deductions:**
- Cross-package import violating boundary: **−3 points** per instance
- Missing `_components/` or `_hooks/` directory in app: **−2 points** per app
- Wrong import direction (feature → ui/): **−3 points** per instance
- Turborepo pipeline misconfigured: **−3 points**
- Missing `packages/shared/` structure: **−4 points**

#### E. Premium UI Standards (10%)

| Score | Criteria |
|-------|----------|
| **10** | OKLCH token system initialized in `globals.css` or theme config. All semantic tokens defined (`bg-background`, `bg-card`, `text-foreground`, `border-border`, etc.). Font stack configured (Geist, Inter, or Outfit). Zero hardcoded colors in any scaffold file. |
| **9** | Token system initialized. 1–2 minor token gaps. Font configured. |
| **8** | Token system partially initialized. 3–5 missing tokens. Font configured. |
| **7** | Some tokens defined. 5–10 missing. Font not configured. |
| **6** | Minimal token setup. Many missing. |
| **5** | CSS variables exist but not semantic. No font configuration. |
| **0–4** | Not implemented. |

**Deductions:**
- Hardcoded color in scaffold file: **−1 point** each (max −3)
- Missing OKLCH token system: **−3 points**
- Missing font stack: **−2 points**
- Missing semantic token definition: **−0.5 points** per missing token (max −3)

#### F. End-to-End Type Safety (20%)

| Score | Criteria |
|-------|----------|
| **10** | `tsconfig.json` has `strict: true` (no overrides). Zero `any` in all scaffold files. Type-drift guard script exists and passes. CI pipeline includes typecheck step. All package exports typed. No unsafe type assertions. |
| **9** | 1–2 minor `any` in non-critical paths. All other checks pass. |
| **8** | 3–5 `any` occurrences, all in non-production paths. Type-drift guard exists. |
| **7** | 5–10 `any` occurrences. Some untyped exports. |
| **6** | 10–15 `any` occurrences. Type-drift guard missing. |
| **5** | 15+ `any` occurrences. Type safety aspirational. |
| **0–4** | Not implemented. |

**Deductions:**
- `any` in production path: **−2 points** per occurrence
- `any` in non-production path: **−0.5 points** per occurrence
- Missing type-drift guard: **−4 points** (critical for Phase A)
- `tsconfig.json` missing `strict: true`: **−5 points** (automatic fail)
- Unsafe type assertion: **−1 point** per occurrence
- Type-drift guard failing: **−5 points** (automatic fail)

#### G. Documentation & Naming (10%)

| Score | Criteria |
|-------|----------|
| **10** | Architecture decision records exist for key choices (monorepo tool, DB, auth model). File names kebab-case. Components PascalCase. Constants SCREAMING_SNAKE_CASE. Package.json scripts documented with descriptions. Turborepo pipeline documented. No generic names. |
| **9** | 1–2 missing ADRs. All naming conventions correct. |
| **8** | 3–5 missing ADRs. Minor naming inconsistencies. |
| **7** | 5–10 missing items. Some naming violations. |
| **6** | Minimal documentation. Multiple naming violations. |
| **5** | Sparse documentation. Inconsistent naming. |
| **0–4** | Not implemented. |

**Deductions:**
- Missing ADR for key architectural decision: **−1 point** per decision (max −3)
- Generic name (`data`, `item`, `thing`, `stuff`, `foo`): **−0.5 points** per occurrence
- Wrong naming convention: **−0.5 points** per occurrence
- Undocumented package.json scripts: **−1 point**

---

## 2. Phase A Specific Checks

### A1 — Monorepo (`feat/a-monorepo`)

```
WORK PACKAGE: A1  ·  IMPLEMENTS: Part 1 §1.3  ·  CLOSES: —

STRUCTURE:
[ ] pnpm-workspace.yaml exists and defines packages/*
[ ] turbo.json exists with correct pipeline (build, typecheck, lint, dev)
[ ] packages/config/ exists (shared configuration)
[ ] packages/shared/ exists (types, schemas, config)
[ ] apps/web/ exists (Next.js app)
[ ] apps/api/ exists (API server)
[ ] Root package.json has correct scripts (build, typecheck, lint, dev, type-drift:check, type-drift:fix)
[ ] .gitignore covers node_modules, .turbo, .next, dist, .env
[ ] pnpm install works cleanly
[ ] turbo build succeeds
[ ] turbo typecheck succeeds

VERIFICATION COMMANDS:
  pnpm install
  pnpm turbo build
  pnpm turbo typecheck
```

### A2 — Shared Types (`feat/a-shared-types`) — **Closes B1**

```
WORK PACKAGE: A2  ·  IMPLEMENTS: Part 2 §2.0–§2.1  ·  CLOSES: B1

SCHEMA-FIRST:
[ ] supabase/migrations/ directory exists
[ ] Versioned SQL migration files present (0001_*.sql format)
[ ] supabase gen types command exists in package.json scripts
[ ] supabase gen types produces packages/shared/types/database.types.ts
[ ] Generated types file is NOT hand-written (verify with comment header)
[ ] No Drizzle ORM schema files exist (grep returns zero)
[ ] No apps/api/src/db/schema.ts file exists
[ ] Entity config scaffold exists (packages/shared/config/entities.ts)
[ ] Query Key Factory scaffold exists (packages/shared/config/query-keys.ts)
[ ] Zod schema scaffold exists (packages/shared/schemas/)
[ ] Types exported from @jarvis/shared package

TYPE SAFETY:
[ ] tsconfig.json has strict: true in all packages
[ ] No `any` in packages/shared/ (grep returns zero)
[ ] Generated types match current migrations (type-drift guard passes)

VERIFICATION COMMANDS:
  # B1 — Single source of truth (MUST return zero)
  find . -name "schema.ts" -path "*/db/*" | wc -l
  # Expected: 0

  # Drizzle removal (MUST return zero)
  grep -r "Drizzle\|drizzle" apps/ packages/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
  # Expected: 0

  # Generated types exist
  test -f packages/shared/types/database.types.ts && echo "PASS" || echo "FAIL"

  # Type-drift guard
  pnpm type-drift:check
  # Expected: PASS

  # Strict mode
  grep -r '"strict": true' packages/*/tsconfig.json apps/*/tsconfig.json
  # Expected: all packages present

  # No any in shared
  grep -rn ": any\|as any\|<any>" packages/shared/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
  # Expected: 0
```

### A3 — Docker Compose (`feat/a-compose`) — **Closes H1, H7**

```
WORK PACKAGE: A3  ·  IMPLEMENTS: Part 1 §1.4–§1.6  ·  CLOSES: H1, H7

DOCKER COMPOSE:
[ ] docker-compose.yml defines all services (gateway, mcp-*, nginx, redis, socket-proxy)
[ ] docker-socket-proxy service exists (Tecnativa or equivalent)
[ ] Raw docker.sock NOT mounted in api or hermes containers
[ ] docker.sock ONLY mounted in socket-proxy service
[ ] All services have healthcheck defined
[ ] All services have mem_limit defined
[ ] nginx service configured (HTTP only for Phase A; TLS in Phase F)
[ ] redis service configured with healthcheck
[ ] Networks defined (jarvis-network)
[ ] Volumes defined for persistent data
[ ] Environment variables reference .env (not hardcoded)
[ ] Compose profiles used for optional services (mcp-gmail, etc.)

FUNCTIONAL:
[ ] docker compose config validates (no YAML errors)
[ ] Supabase local dev works (supabase start)
[ ] API server starts correctly
[ ] All healthchecks pass after startup
[ ] Socket-proxy containers endpoint works (API can list/restart containers)

VERIFICATION COMMANDS:
  # H1 — Socket proxy (MUST return 0 for api/hermes)
  grep "docker.sock" docker-compose.yml
  # Expected: only in socket-proxy service, NOT in api or gateway

  # Healthchecks present
  grep -c "healthcheck:" docker-compose.yml
  # Expected: matches number of services

  # mem_limit present
  grep -c "mem_limit:" docker-compose.yml
  # Expected: matches number of services

  # Validate compose
  docker compose config --quiet
  # Expected: no errors

  # Services start
  docker compose up -d && sleep 30 && docker compose ps
  # Expected: all services healthy
```

### A4 — CI Pipeline (`feat/a-ci`)

```
WORK PACKAGE: A4  ·  IMPLEMENTS: Part 5 §5.1  ·  CLOSES: —

CI PIPELINE:
[ ] .github/workflows/ci.yml exists
[ ] Workflow triggers on PR to phase/* and develop branches
[ ] Type-drift guard step runs on every PR
[ ] TypeScript strict check step runs on every PR (tsc --noEmit)
[ ] Color gate step runs on every PR (grep for hardcoded colors)
[ ] Any gate step runs on every PR (grep for `any` in production paths)
[ ] Turborepo build step runs
[ ] Turborepo typecheck step runs
[ ] Steps fail-fast (one failure blocks the PR)

GATES:
[ ] Type-drift guard: pnpm type-drift:check
[ ] TypeScript strict: tsc --noEmit --strict
[ ] Color gate: grep -rn "bg-white\|bg-black\|text-gray-\|text-black\|text-white" apps/web/src/
[ ] Any gate: grep -rn ": any\|as any\|<any>" apps/ packages/ --include="*.ts" --include="*.tsx"

VERIFICATION COMMANDS:
  # CI file exists
  test -f .github/workflows/ci.yml && echo "PASS" || echo "FAIL"

  # CI contains required gates
  grep -c "type-drift\|typecheck\|color-gate\|any-gate" .github/workflows/ci.yml
  # Expected: ≥ 4

  # Run all gates locally
  pnpm type-drift:check && pnpm turbo typecheck
  # Expected: all pass
```

---

## 3. Audit ID Closure for Phase A

### Required Closures

| ID | Description | Closure Criteria | Verification |
|----|-------------|-----------------|--------------|
| **B1** | Dual source of truth for data model | **MUST be CLOSED in A2.** SQL migrations are the single source. `supabase gen types` produces types. No Drizzle schema. No hand-written entity types. | `grep -r "Drizzle\|drizzle" apps/ packages/ --include="*.ts"` returns zero. `test -f packages/shared/types/database.types.ts` returns true. |
| **H1** | `docker.sock` mounted in app containers | **MUST be CLOSED in A3.** Socket-proxy fronts the socket. API only gets containers:read+restart. | `grep "docker.sock" docker-compose.yml` shows only socket-proxy service. |
| **H7** | Missing healthchecks + resource limits | **Partial closure in A3.** All Phase A services have healthcheck + `mem_limit.** Full closure in Phase F when all services are defined. | `grep -c "healthcheck:" docker-compose.yml` matches service count. |

### Deferred to Later Phases

| ID | Phase | Notes |
|----|-------|-------|
| B2 | Phase B + C | Factory layer full implementation |
| B3 | Phase F | nginx rate-limit fix |
| B4 | Phase F | TLS wiring |
| B5 | Phase B | Auth model standardization |
| H2 | Phase E | MCP pinned versions |
| H3 | Phase B | Integration secrets encryption |
| H4 | Phase B | RLS O(1) JWT claims |
| H5 | Phase F | Backup/restore |
| H6 | Phase F | Observability |
| H8 | Phase F | SPOF documentation |

### Closure Verification Script

```bash
#!/bin/bash
# scripts/verify-phase-a-ids.sh
# Run after Phase A integration on phase/a-foundation

echo "=== Phase A Audit ID Closure Verification ==="
echo ""

PASS=0
FAIL=0

# B1 — Single source of truth
echo "[B1] Checking single source of truth..."
DRIZZLE_COUNT=$(grep -r "Drizzle\|drizzle" apps/ packages/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ "$DRIZZLE_COUNT" -eq 0 ]; then
  echo "  ✅ No Drizzle references found"
  PASS=$((PASS + 1))
else
  echo "  ❌ Drizzle references found: $DRIZZLE_COUNT"
  FAIL=$((FAIL + 1))
fi

if [ -f "packages/shared/types/database.types.ts" ]; then
  echo "  ✅ Generated types file exists"
  PASS=$((PASS + 1))
else
  echo "  ❌ Generated types file missing"
  FAIL=$((FAIL + 1))
fi

TYPE_DRIFT=$(pnpm type-drift:check 2>&1)
if [ $? -eq 0 ]; then
  echo "  ✅ Type-drift guard passes"
  PASS=$((PASS + 1))
else
  echo "  ❌ Type-drift guard fails"
  FAIL=$((FAIL + 1))
fi

# H1 — Socket proxy
echo ""
echo "[H1] Checking socket proxy..."
SOCK_IN_API=$(grep -A 20 "api:" docker-compose.yml | grep "docker.sock" | wc -l)
SOCK_IN_PROXY=$(grep -A 20 "socket-proxy:" docker-compose.yml | grep "docker.sock" | wc -l)
if [ "$SOCK_IN_API" -eq 0 ] && [ "$SOCK_IN_PROXY" -gt 0 ]; then
  echo "  ✅ docker.sock only in socket-proxy"
  PASS=$((PASS + 1))
else
  echo "  ❌ docker.sock incorrectly mounted"
  FAIL=$((FAIL + 1))
fi

# H7 — Healthchecks
echo ""
echo "[H7] Checking healthchecks..."
SERVICES=$(grep -c "^\s\s[a-z]" docker-compose.yml | head -1)
HEALTHCHECKS=$(grep -c "healthcheck:" docker-compose.yml)
MEM_LIMITS=$(grep -c "mem_limit:" docker-compose.yml)
echo "  Services: ~$SERVICES, Healthchecks: $HEALTHCHECKS, mem_limit: $MEM_LIMITS"
if [ "$HEALTHCHECKS" -gt 0 ] && [ "$MEM_LIMITS" -gt 0 ]; then
  echo "  ✅ Healthchecks and mem_limit present"
  PASS=$((PASS + 1))
else
  echo "  ❌ Missing healthchecks or mem_limit"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  echo "❌ Phase A audit IDs NOT fully closed"
  exit 1
else
  echo "✅ All Phase A audit IDs closed"
  exit 0
fi
```

---

## 4. Phase A Gate Checklist

### Pre-Merge Gate (ALL must pass)

```
WORK PACKAGES:
[ ] A1 — Monorepo complete (Turborepo, pnpm, packages structure)
[ ] A2 — Shared types complete (migrations, gen types, Zod scaffold, closes B1)
[ ] A3 — Docker Compose complete (socket-proxy, healthchecks, closes H1/H7)
[ ] A4 — CI pipeline complete (type-drift, color-gate, any-gate)

AUDIT IDS:
[ ] B1 — CLOSED (single source of truth verified)
[ ] H1 — CLOSED (socket-proxy verified)
[ ] H7 — PARTIAL (healthchecks on Phase A services)

QUALITY GATES:
[ ] Auditor score ≥ 8.5
[ ] Zero Code Review blockers
[ ] TypeScript compiles with zero errors (tsc --noEmit)
[ ] No `any` in production paths
[ ] Type-drift guard passing
[ ] Color gate passing (zero hardcoded colors in scaffold)
[ ] Any gate passing (zero `any` in apps/ and packages/)
[ ] All packages build successfully (turbo build)
[ ] All packages typecheck successfully (turbo typecheck)
[ ] docker compose config validates
[ ] All services start and pass healthchecks

DOCUMENTATION:
[ ] Architecture decision records exist for:
    [ ] Monorepo tool choice (Turborepo)
    [ ] Database choice (Supabase/PostgreSQL)
    [ ] Auth model decision (Supabase Auth)
    [ ] Package structure rationale
[ ] Package.json scripts documented
[ ] Turborepo pipeline documented
```

### Gate Verification Commands (Run in Order)

```bash
# 1. Install dependencies
pnpm install

# 2. Build all packages
pnpm turbo build

# 3. Typecheck all packages
pnpm turbo typecheck

# 4. Type-drift guard
pnpm type-drift:check

# 5. Any gate
grep -rn ": any\|as any\|<any>" apps/ packages/ --include="*.ts" --include="*.tsx" 2>/dev/null
# Expected: zero matches

# 6. Color gate
grep -rn "bg-white\|bg-black\|text-gray-\|text-black\|text-white" apps/web/src/ 2>/dev/null
# Expected: zero matches

# 7. B1 verification
grep -r "Drizzle\|drizzle" apps/ packages/ --include="*.ts" --include="*.tsx" 2>/dev/null
# Expected: zero matches

# 8. H1 verification
grep "docker.sock" docker-compose.yml
# Expected: only in socket-proxy service

# 9. Docker validation
docker compose config --quiet

# 10. Full Phase A ID verification
bash scripts/verify-phase-a-ids.sh
```

---

## 5. Remediation Protocol for Phase A

### Decision Matrix

```
┌─────────────────────────────────┬────────────────────────────────────────────┐
│ Condition                       │ Action                                     │
├─────────────────────────────────┼────────────────────────────────────────────┤
│ Score < 8.5                     │ List specific fixes required. Execute      │
│                                 │ addresses on same feat/* branch. Re-audit. │
├─────────────────────────────────┼────────────────────────────────────────────┤
│ B1 not closed                   │ BLOCK MERGE. This is non-negotiable.       │
│                                 │ Remove all Drizzle references. Verify      │
│                                 │ supabase gen types produces output.        │
│                                 │ Re-run type-drift guard.                   │
├─────────────────────────────────┼────────────────────────────────────────────┤
│ H1 not closed                   │ BLOCK MERGE. Raw docker.sock is a          │
│                                 │ container-escape risk. Add socket-proxy.   │
│                                 │ Remove docker.sock from api/gateway.       │
├─────────────────────────────────┼────────────────────────────────────────────┤
│ Type-drift detected             │ BLOCK MERGE. Run: pnpm type-drift:fix      │
│                                 │ This regenerates types from migrations.    │
│                                 │ No manual override permitted.              │
├─────────────────────────────────┼────────────────────────────────────────────┤
│ Any gate failing                │ BLOCK MERGE. Remove all `any` occurrences. │
│                                 │ grep -rn ": any\|as any\|<any>" to find.   │
├─────────────────────────────────┼────────────────────────────────────────────┤
│ Color gate failing              │ BLOCK MERGE. Replace hardcoded colors with │
│                                 │ semantic tokens (bg-background, etc.).     │
├─────────────────────────────────┼────────────────────────────────────────────┤
│ TypeScript errors               │ BLOCK MERGE. Fix all tsc --noEmit errors.  │
├─────────────────────────────────┼────────────────────────────────────────────┤
│ Score ≥ 8.5 + all gates green   │ APPROVE MERGE. Note suggestions for       │
│ + B1/H1 closed                  │ future improvement.                        │
├─────────────────────────────────┼────────────────────────────────────────────┤
│ Score ≥ 9.5 + all gates green   │ APPROVE MERGE. Flag as Golden Template     │
│ + B1/H1 closed                  │ candidate for Phase B+ foundation.         │
└─────────────────────────────────┴────────────────────────────────────────────┘
```

### Remediation Loop

```
IF score < 8.5 OR gate failing OR audit ID open:
  1. Auditor produces report with Required Fixes
  2. Orchestrator routes to Execute (same feat/* branch)
  3. Execute addresses fixes, updates self-mark-off
  4. Code Review re-reviews
  5. Auditor re-audits
  6. IF still failing after 3 cycles:
     a. Tech Lead reviews the abstraction
     b. Re-plan the work package
     c. Escalate to Kidus if architectural decision needed
  7. NEVER force-merge below 8.5
```

### Escalation Triggers

| Trigger | Action |
|---------|--------|
| 3 consecutive audits < 8.5 | Tech Lead review |
| B1 cannot be closed (Drizzle persists) | Escalate to Kidus — architectural decision needed |
| Type-drift guard failing after fix attempt | Debug agent engaged — investigate migration/types mismatch |
| Docker socket-proxy not functioning | Debug agent engaged — check Tecnativa image compatibility |

---

## 6. Phase A Audit Report Template

```markdown
# Phase A Audit Report: Foundation
**Auditor:** Architecture Auditor (Kidus Abdula Architectural DNA v1.0)
**Scope:** Phase A — Foundation (WP A1–A4)
**Date:** [date]
**Branch:** `phase/a-foundation` → `develop`

---

## Score Summary

| Category | Phase A Weight | Score | Weighted Score |
|---|---|---|---|
| A. Schema-First Compliance | 25% | X/10 | X.XX |
| B. Factory Pattern | 15% | X/10 | X.XX |
| C. Extreme Modularization | 20% | X/10 | X.XX |
| D. Three-Tier Architecture | N/A | — | — |
| E. Premium UI Standards | 10% | X/10 | X.XX |
| F. End-to-End Type Safety | 20% | X/10 | X.XX |
| G. Documentation & Naming | 10% | X/10 | X.XX |

### **OVERALL SCORE: X.X / 10**
### **Verdict: [Exemplary / Strong / Acceptable / Below Standard / Unacceptable]**
### **Merge Decision: [APPROVED / BLOCKED]**

---

## Audit ID Closure Status

| ID | Description | Status | Evidence |
|----|-------------|--------|----------|
| B1 | Dual source of truth | [CLOSED/OPEN] | [verification result] |
| H1 | docker.sock mounted | [CLOSED/OPEN] | [verification result] |
| H7 | Healthchecks + mem_limit | [PARTIAL/CLOSED] | [verification result] |

### **Phase A Audit IDs Required: X/X CLOSED**

---

## Gate Verification

```
[ ] Type-drift guard: [PASS/FAIL]
[ ] TypeScript strict: [PASS/FAIL]
[ ] Color gate: [PASS/FAIL]
[ ] Any gate: [PASS/FAIL]
[ ] Turbo build: [PASS/FAIL]
[ ] Turbo typecheck: [PASS/FAIL]
[ ] Docker compose validate: [PASS/FAIL]
[ ] Code Review blockers: [0/N]
```

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

## Phase A → Develop Merge Authorization

**Auditor:** [Name]
**Date:** [date]
**Score:** X.X / 10
**Audit IDs Required:** X/X CLOSED
**Gate Checks:** ALL PASS
**Decision:** [APPROVED / BLOCKED]

**Signature:** ____________________
```

---

## 7. Quick Reference — Phase A at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE A AUDIT QUICK REF                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WEIGHTS:  Schema 25% · Factory 15% · Modular 20%               │
│            UI 10% · TypeSafe 20% · Docs 10%                     │
│                                                                  │
│  MERGE FLOOR: 8.5/10                                            │
│  EXEMPLARY:   9.2/10                                            │
│                                                                  │
│  MUST CLOSE:  B1 (Drizzle gone) · H1 (socket-proxy)            │
│  PARTIAL:     H7 (healthchecks)                                 │
│                                                                  │
│  BLOCKERS:                                                      │
│    • Score < 8.5                                                │
│    • B1 open (Drizzle exists)                                   │
│    • H1 open (raw docker.sock)                                  │
│    • Type-drift guard failing                                   │
│    • Any gate failing                                           │
│    • TypeScript errors                                          │
│                                                                  │
│  COMMANDS:                                                      │
│    pnpm turbo build          # build all                        │
│    pnpm turbo typecheck      # typecheck all                    │
│    pnpm type-drift:check     # types match migrations           │
│    bash scripts/verify-phase-a-ids.sh  # ID closure              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

*JARVIS v1.5 Phase A Audit Checklist — © 2026 Kidus Abdula / VersaLabs Studio.*
*Authority: Architectural DNA v1.0.0*
