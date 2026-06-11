# JARVIS v1.5 — Phase D Live Gate: Findings & Remediation Tracks

> **From:** Kidus Abdula (Architect / Opus BRAIN) — first-ever live, authenticated exercise of the API on `phase/d-mobile`.
> **Context:** The deferred live smoke call (`GET /api/cms/workflows → 200`) that gates `phase/d-mobile → develop`. It was run for real against the hosted Supabase project (`rofvgnvhmwsgrqewcbci`) with a real operator user.
> **Verdict:** The Phase D **client contract is proven correct**, but the **live 200 is blocked by Phase B API plumbing + Supabase project provisioning** — neither is Phase D code. The smoke test did exactly its job: it surfaced a cluster of foundational defects that every prior static gate was blind to.
> **Date:** June 2026.

---

## 0. What the live test PROVED (Phase D is sound)

- API boots and is LAN-reachable: `Server listening at http://10.194.86.158:3001` (`HOST=0.0.0.0`, `PORT=3001`).
- `/health` → 200.
- Old client path `/api/workflows` → **404**; new path `/api/cms/workflows` → resolves. The D2 `/api/cms/` path-contract fix was necessary and is correct.
- After fixing the CRUD auth scope (below), `/api/cms/workflows` with no token → **401 UNAUTHENTICATED** (was 500). The data-layer surface is now correctly authenticated.
- The operator token mints and verifies: **ES256 + JWKS** (asymmetric signing keys enabled), correct `iss`/`aud`. The crypto path is healthy.

The only thing standing between us and a 200 is server-side infra + project config — **not** the mobile/web data layer.

---

## 1. Fixes APPLIED this session (scoped override, in the working tree, UNCOMMITTED)

All in `apps/api`, applied here under explicit hands-on permission to run the live test:

| # | File | Change | Why |
|---|------|--------|-----|
| **L1** | `src/lib/env.ts` | `getEnv()` now `return _env ?? validateEnv()` | ESM evaluates imported module bodies before the importer's. `auth-verify.ts:5` reads `env.SUPABASE_JWKS_URL` at import-time, before `server.ts` calls `validateEnv()` → deterministic boot crash "Env not validated". Self-initializing `getEnv` kills the whole class. **The API had never successfully booted.** |
| **L2** | `package.json` | `dev`: `tsx watch --env-file=.env src/server.ts` | No env loader existed (no dotenv, no `--env-file`), so `validateEnv()` exited on missing vars. |
| **L3** | `src/factory/register-entities.ts` | Register all CRUD routes inside an encapsulated scope that owns a `tenantMiddleware` preHandler | The `/api/cms/*` surface had **no auth guard** — see §2. This is the self-contained fix for the data-layer surface. |

> Decision needed: commit L1–L3 as `fix(api): boot + cms auth scope` (they are net-positive, no regression), **or** fold L3 into the systemic fix in §2 and commit L1+L2 alone. Recommendation: commit L1+L2 now (pure unblock), and let the §2 WP supersede/absorb L3.

---

## 2. BLOCKER A (Phase B code → OpenCode) — Fastify plugin encapsulation: shared decorations & hooks never propagate

**Root cause (systemic).** Shared plugins are registered **without `fastify-plugin` (fp)**, so everything they `decorate`/`addHook` is trapped in their own encapsulated child scope and is invisible to sibling route plugins:

- `plugins/supabase.ts` — `fastify.decorate("supabaseAdmin", ...)` and the `onRequest` hook that sets `request.supabase`. Neither reaches the route modules. → `fastify.supabaseAdmin` is `undefined` in `routes/auth/bootstrap.ts` (`TypeError: Cannot read properties of undefined (reading 'auth')`), and `request.supabase` was undefined on CRUD routes (the original 500).
- `middleware/protected.ts` (`protectedPlugin`) — adds `tenantMiddleware` as a `preHandler` in its own child scope; the routes are registered on the parent. **The auth guard never runs.** Proven empirically — every "protected" route returns 500/502, **none return 401**, on an unauthenticated request:
  `500 /api/auth/me · 500 /api/services · 502 /api/models · 500 /api/secrets · 500 /api/cms/integrations`.

**Consequence:** the entire HTTP API has, until now, performed **no app-layer JWT verification**, returned **no 401s**, and left `request.tenantId` **undefined everywhere** (tenant-scoped queries broken). Only the WS handshake verifies independently. This survived A/B/C/D gates because **no authenticated live HTTP call had ever been made** — every gate was static.

**Fix (route to OpenCode — `fix/api-foundation`):**
1. Wrap `supabasePlugin` with `fastify-plugin` so `supabaseAdmin` + the `request.supabase` hook apply at the root and propagate to all routes.
2. Make protection actually encapsulate its routes — either (a) the §1-L3 pattern everywhere (hook + routes on the same instance), or (b) a global `preHandler` with an explicit public-route allowlist (`/health`, `/api/auth/bootstrap`, WS upgrade). Pick ONE pattern and apply it uniformly across: `me`, `services`, `secrets`, `models`, `analytics`, `logs`, `admin`, `workflows/trigger`, `integrations/test`, `chat/*`, and the CRUD factory.
3. Fix the misleading catch in `middleware/tenant.ts`: "No tenant associated" is relabeled as 401 "Invalid token" — give it a distinct code/message (`NO_TENANT`) so this never costs an hour again.
4. Re-run the §0 live checks: unauth → 401 everywhere; authed (post-§3 provisioning) → 200.

---

## 3. BLOCKER B (Supabase project provisioning → Architect, SQL editor) — grants, RPC, token hook, bootstrap

The hosted project schema is not in the expected state. Run in the **Supabase SQL Editor** (executes as a privileged role, not `service_role`):

```sql
-- 1) service_role is denied on app tables (the API's admin client uses service_role)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;  -- includes bootstrap_user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

-- 2) confirm anon/authenticated grants exist too (RLS still enforces tenant isolation)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 3) sanity: do the entity tables + functions actually exist? (migrations 0001-0003 applied?)
SELECT tablename FROM pg_tables WHERE schemaname='public';
SELECT proname  FROM pg_proc WHERE proname IN ('bootstrap_user','custom_access_token');
```

Then, in **Dashboard → Authentication → Hooks**: enable the **Customize Access Token (JWT) Claims** hook and point it at `public.custom_access_token`. Without this, `tenant_id` is never injected into the JWT and every authenticated API call 401s with "No tenant associated".

Finally **bootstrap the operator** (so `custom_access_token` has a `profiles.tenant_id` to read). Easiest as postgres in the SQL editor:
```sql
SELECT public.bootstrap_user(
  'b129c48c-6226-4bc8-86f3-7ee0220c2fe2'::uuid,  -- operator auth uid (kidus489@gmail.com)
  'kidus489@gmail.com', 'Kidus Abdula');
```
(Or, once Blocker A is fixed, `POST /api/auth/bootstrap` with the operator token does this through the app.)

---

## 4. The green path (order matters)

1. **Architect** runs §3 in Supabase (grants → enable token hook → bootstrap operator).
2. **OpenCode** lands §2 `fix/api-foundation` on `apps/api` (+ commit §1 boot fixes, or fold them in). Re-gate: unauth → 401 across all routes; `expo`/web typecheck still 0.
3. **Re-mint** the operator token (so the now-enabled hook injects `tenant_id`).
4. **Smoke:** `curl -H "Authorization: Bearer <fresh token>" http://10.194.86.158:3001/api/cms/workflows` → **200 + `{ ok:true, data:[...] }`**.
5. That 200 closes the live item → `phase/d-mobile → develop` phase gate.

Until then: **Phase D static gate = GREEN (merged, 9.0)**; **Phase D live gate = BLOCKED on Blocker A + Blocker B** (both outside Phase D scope). D3∥D4∥D5 fan-out is unaffected and can proceed in parallel — none of them can be *live-verified* until A+B land, but their static gates and the client contract are sound.

---

*JARVIS v1.5 Phase D — Live Gate Findings — © 2026 Kidus Abdula / VersaLabs Studio.*
