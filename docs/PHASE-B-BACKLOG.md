# Phase B — Backlog & Non-Blocking Items

> **Carried from Phase A re-audit**
> **Date:** June 2, 2026

---

## Non-Blocking Items (from Phase A Auditor)

These items were identified as suggestions during the Phase A re-audit. They do not block Phase A merge but should be addressed in Phase B.

### 1. Fix 0002 Migration Header Mismatch

**Issue:** `supabase/migrations/0002_custom_access_token_hook.sql` line 1 says `-- 0003_custom_access_token_hook.sql`. The filename and header should match.

**Action:** Update the header comment to `-- 0002_custom_access_token_hook.sql`

**Priority:** Low (cosmetic)

**Assigned to:** Phase B Execute agent

---

### 2. Comment Out Self-Hosted Supabase Proxy Routes in Nginx

**Issue:** `nginx/nginx.conf` has `proxy_pass` directives to `supabase-auth:9999`, `supabase-realtime:4000`, `supabase-rest:3000`, `supabase-storage:5000`. These services only exist in `docker-compose.dev.yml`, not in prod. In production (hosted Supabase), these routes would 502.

**Action:** Add `# LOCAL DEV ONLY` headers or comment out these routes for production. Consider making nginx.conf environment-aware or creating separate nginx.prod.conf / nginx.dev.conf.

**Priority:** Medium (would cause 502s in production)

**Assigned to:** Phase B Execute agent

---

### 3. Add ADR Documents

**Issue:** Architecture decisions are documented in markdown but not in formal ADR format.

**Action:** Create `docs/adr/` directory with:
- `0001-turborepo-monorepo.md` — Why Turborepo over Nx
- `0002-hosted-supabase.md` — Why hosted Supabase over self-hosted
- `0003-socket-proxy-security.md` — Why docker-socket-proxy over direct socket
- `0004-supabase-auth.md` — Why Supabase Auth over custom auth

**Priority:** Low (documentation improvement)

**Assigned to:** Phase B Execute agent

---

## Phase B Scope (Planned)

**Work Packages:**

| WP | Scope | Closes | Depends On |
|----|-------|--------|------------|
| B1 | Env validation + response envelope | — | A (types, compose) |
| B2 | Auth system (JWT verification, tenant middleware) | B5 | B1 |
| B3 | CRUD factory (API + client hooks) | B2 | B1 |
| B4 | Hermes bridge | — | B1 |
| B5 | WebSocket | — | B2 |
| B6 | Services/Secrets | — | B2 + A3 |
| B7 | RLS verification | — | B2 + A2 |

**Execution Order:** `B1 → (B2 ∥ B3 ∥ B4) → (B5 ∥ B6 ∥ B7)`

**Gate:** Auditor ≥ 8.5 | Code Review: 0 blockers | All assigned audit IDs closed

---

## WIP Code Available

The `wip/early-bcd-scaffolding` branch contains B/C/D scaffolding that was written during Phase A but quarantined for proper phase-gated rebuild. Proven snippets may be cherry-picked into the correct phase:

- `apps/api/src/factory/` — CRUD factory (Phase B)
- `apps/api/src/middleware/` — Auth + tenant middleware (Phase B)
- `apps/api/src/routes/` — Health + bootstrap endpoints (Phase B)
- `apps/web/src/` — Full web app scaffold (Phase C)
- `apps/mobile/` — Expo scaffold (Phase D)

---

*Phase B Backlog — JARVIS v1.5 — © 2026 Kidus Abdula / VersaLabs Studio*
