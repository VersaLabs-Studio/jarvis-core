# JARVIS v1.5 — Phase A Audit Report & Remediation Directive

> **Auditor verdict:** **6.5 / 10 — NOT approved for merge** (merge floor 8.5).  
> **Status:** Required fixes → re-audit before `phase/a-foundation → develop`.  
> **Architect decisions (locked):** (1) **Hosted Supabase** per Part 1. (2) **Fix defects, commit true Phase A only;** quarantine B/C/D scaffolding for its own phase gates.  
> **Date:** June 2026

---

## 1. Scorecard

| Area | Score | Notes |
|------|:----:|-------|
| Monorepo foundation (A1) | 9/10 | Turbo + pnpm + packages/config/shared — solid |
| Single source of truth (A2/B1) | 9/10 | ✅ generated types + drift guard. Best part of the phase. |
| CI / DNA guards (A4) | 9/10 | ✅ Exceeds spec: drift + color + any + factory + import gates |
| Schema + RLS | 7/10 | Clean schema; RLS works but uses unhardened pattern + dead 0002 (see F4) |
| Docker topology (A3) | 3/10 | ⛔ Wrong topology (self-hosted Supabase; Hermes/Redis/MCP absent); broken build contexts |
| Socket-proxy security (H1) | 4/10 | ⛔ Over-broad reads + no POST (Services control silently broken) |
| Process / git hygiene | 2/10 | ⛔ Nothing committed; no branches/PRs/mark-off; B/C/D scope-creep |

---

## 2. Required Fixes (blockers — all must clear to reach 8.5)

### F1 — Restore the architecture topology (hosted Supabase)
- Rewrite `docker-compose.yml` to the **Part 1 §1.4 topology**: `hermes`, `api`, `web`, `redis`, `nginx`, `docker-socket-proxy`, and the MCP servers behind compose `profiles`.
- **Supabase is hosted** → no Supabase containers in the prod compose; only env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`).
- Move the self-hosted Supabase stack (db/kong/auth/rest/storage/realtime) into a **new `docker-compose.dev.yml`**, clearly labeled "optional local-dev Supabase emulation — not used in production."
- Restore `redis:7-alpine` (maxmemory 128mb, allkeys-lru) and `hermes` (`hermes-data` volume, port `127.0.0.1:8765`). Hermes reaches Docker **only via the socket-proxy**, never a direct mount.

### F2 — Fix broken build contexts
- `api`/`web` services must build from the **monorepo root**: `build: { context: ., dockerfile: apps/api/Dockerfile }` (and `apps/web/Dockerfile`). The current `context: ./api` / `./web` paths don't exist → build fails.

### F3 — Socket-proxy least privilege (closes H1 correctly)
- Set exactly: `CONTAINERS=1`, `POST=1`, `INFO=1`; everything else **`0`** (`EXEC=0 IMAGES=0 VOLUMES=0 NETWORKS=0 BUILD=0 TASKS=0 SERVICES=0`).
- Add `read_only: true` to the proxy container.
- `POST=1` is required so the API can restart/start/stop containers (Part 2 §2.7) — without it the Services feature is dead.
- Confirm **no** container mounts `/var/run/docker.sock` directly; `api` (and `hermes`) use `DOCKER_HOST=tcp://docker-socket-proxy:2375`.

### F4 — Reconcile RLS to the hardened claim pattern (closes H4)
- Switch policies to read the JWT claim: define `current_tenant_id()` as `select nullif(auth.jwt() ->> 'tenant_id','')::uuid` and use it in `USING`/`WITH CHECK` (Part 2 §2.2). Keep the `0002` access-token hook — it now has a consumer.
- Remove the `get_user_tenant_id()` profiles-subquery, OR if you deliberately keep it, **delete the unused `0002` hook** so the migrations don't contradict each other. Preferred: the claim pattern (matches Part 2, O(1), and makes `0002` meaningful).
- Regenerate types + update `.migration-hash` so the drift guard stays green.

### F5 — Un-ignore `.env.example`
- Remove `.env.example` from `.gitignore` (line 8). It is a committed template; only real `.env*` files stay ignored. Verify it is tracked.

### F6 — Commit true Phase A through the branching model
- Create the Phase A `feat/*` branches and commit the **in-scope** files (see §3) with **Conventional Commits** and the `Co-Authored-By` trailer, each PR carrying the §6 sub-agent **mark-off** block:
  - `feat/a-monorepo` — turbo/pnpm workspace, `packages/config`, root configs, dev scripts
  - `feat/a-shared-types` — `packages/shared` (migrations consumer: types, schemas, config, query-keys, lib)
  - `feat/a-compose` — `docker-compose.yml` (hosted topology) + `docker-compose.dev.yml` + `nginx/`
  - `feat/a-ci` — `.github/workflows/ci.yml` + `scripts/*-check.ts` gate scripts + `supabase/migrations` + `.migration-hash`
- PR each into `phase/a-foundation`.

---

## 3. Scope Boundary — what to commit vs quarantine

**✅ TRUE Phase A — commit now:**
```
turbo.json · pnpm-workspace.yaml · package.json · tsconfig.json
packages/config/** · packages/shared/**            (types, schemas, config, query-keys, lib)
supabase/migrations/** · .migration-hash
docker-compose.yml (hosted) · docker-compose.dev.yml · nginx/**
.github/workflows/ci.yml · scripts/*-check.ts · scripts/dev.sh · scripts/stop.sh · scripts/health-check.sh
.env.example · .gitignore · plans/** · docs/**
```

**⛔ QUARANTINE — do NOT commit into Phase A** (move to a holding branch, e.g. `wip/early-bcd-scaffolding`; rebuild through each phase's own Plan→Execute→Code Review→Auditor gate):
```
apps/api/src/{factory,middleware,routes,entities,server.ts,types}   → Phase B
apps/web/src/{app,components,features,hooks,lib} beyond bare scaffold → Phase C
apps/mobile/src/**                                                   → Phase D
```
> Rationale: this code was written with no Plan doc, no Code Review, no audit — exactly the scope-creep the protocol forbids. Proven snippets may be cherry-picked into the proper phase later, but nothing ungated merges. (The CRUD **config/entities/query-keys in `packages/shared`** are legitimate foundation and stay.)

---

## 4. Re-Audit Gate (before merging to `develop`)

```
[ ] F1–F6 complete
[ ] docker compose config validates; core services (hermes, redis, nginx, socket-proxy) start healthy
[ ] No Supabase containers in prod compose; hosted env vars present
[ ] Socket-proxy: CONTAINERS+POST+INFO only, read_only; no direct docker.sock mounts
[ ] RLS reads the JWT claim; 0002 reconciled; drift guard green
[ ] type-drift + color + any + factory + import gates all green in CI
[ ] turbo build + typecheck pass
[ ] Phase A files committed on feat/* with mark-off blocks; B/C/D quarantined
[ ] Auditor re-score ≥ 8.5
```
Only on a green re-audit does `phase/a-foundation → develop` merge, and only then does Phase B planning begin.

---

## 5. VPS Tasks (this phase)

**None.** Phase A is local foundation; VPS provisioning is Phase F. With **hosted Supabase** locked, the 8 GB VPS budget from Part 1 holds (no Supabase containers to host) — no capacity change needed. Tracked for Phase F: `setup-vps.sh`, `ssl-setup.sh`, firewall/fail2ban, domain + TLS.

---

*JARVIS v1.5 Phase A Audit — © 2026 Kidus Abdula / VersaLabs Studio.*
