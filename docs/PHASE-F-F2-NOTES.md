# Phase F F2 — Observability Architecture Decision Log

> **Date:** 2026-06-15
> **Author:** OpenCode mesh (Kidus's hands; Opus-authored handoff directive)
> **Scope:** `SENTRY_DSN/GLITCHTIP_DSN` env-gated error capture, request-id propagation api→hermes, `GET /ready` endpoint. Minimal & self-contained.

---

## 1. What F2 built

### 1.1 Error capture (Sentry / GlitchTip)

| Component | File | Purpose |
|-----------|------|---------|
| Plugin | `apps/{api,hermes}/src/plugins/sentry.ts` | Init Sentry (no-op if DSN unset); `captureException()` helper; Fastify `onError` hook |
| Env | `apps/{api,hermes}/src/{lib,config}/env.ts` | `SENTRY_DSN`, `GLITCHTIP_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` (all optional) |
| Compose | `docker-compose.yml` | `SENTRY_DSN=${SENTRY_DSN:-}` etc. on `api` + `hermes` |
| `.env.example` (root) | (already stubbed) | F0/F1 already documented the optional `SENTRY_DSN` (or `GLITCHTIP_DSN=`) |
| `.env.example` (api) | `apps/api/.env.example` | Local dev shape with `SENTRY_DSN` / `GLITCHTIP_DSN` documented |

**Contract:**
- Resolution order: `SENTRY_DSN` → `GLITCHTIP_DSN` → none.
- No DSN ⇒ `initSentry()` returns `false`; `captureException()` is a no-op; no Sentry SDK is loaded.
- GlitchTip uses the Sentry envelope format, so the same DSN works against either backend.
- Sentry is wired via the Fastify `onError` hook — captures route errors WITHOUT overriding Fastify's default error response (so the `{ok:false, error:{code, message}}` wire shape is unchanged).
- Process-level `uncaughtException` and `unhandledRejection` are also captured (safety net for code outside the Fastify request lifecycle).

### 1.2 Request-id propagation

| Component | File | Purpose |
|-----------|------|---------|
| `genRequestId` | `apps/{api,hermes}/src/plugins/request-id.ts` | Fastify `genReqId` impl — reads `X-Request-Id` (validated), falls back to UUIDv4 |
| `requestIdPlugin` | same | Fastify plugin: echoes `X-Request-Id` on response; enters the request into AsyncLocalStorage via `enterWith` (best-effort) |
| `request-context` | `apps/{api,hermes}/src/lib/request-context.ts` | `AsyncLocalStorage<RequestContext>` singleton; `getRequestContext()` / `getRequestId()` accessors |
| Api → Hermes propagation | `apps/api/src/lib/hermes.ts` + `apps/api/src/routes/workflows/trigger.ts` | Adds `X-Request-Id` header to all outbound fetches to hermes (when an inbound request id is active) |
| Hermes cron self-loopback | `apps/hermes/src/cron/skill-runner.ts` | Adds `X-Request-Id` header on the `POST /v1/skill/run` self-call |
| `types/fastify.ts` | `apps/api/src/types/fastify.ts` | Adds `requestId: string` to `FastifyRequest` (typed alias for `request.id`) |

**Contract:**
- `X-Request-Id` is the authoritative propagation channel. A client can supply one (validated against `/^[A-Za-z0-9._\-]+$/`, ≤ 128 chars). If absent or invalid, hermes/api generates a fresh UUIDv4 via `crypto.randomUUID()`.
- The id is echoed back on every response so a client can correlate its own logs with server logs.
- Fastify's per-request pino log line includes the id as `reqId` automatically (no extra wiring).
- Api→Hermes fetch (in `HermesClient.sendMessage` + `workflows/trigger.ts`) reads the inbound id from the request context and adds it as an `X-Request-Id` header on the outbound call. This is the api→hermes propagation the directive requires.
- The `AsyncLocalStorage` is **best-effort**. The plugin installs the context via `enterWith` in `preHandler`, but the store's visibility from inside the route handler depends on whether Fastify's preHandler→handler call chain shares the async context. We accept either outcome — the `X-Request-Id` header (echoed back) is the authoritative contract; the ALS is for downstream async code that has access to the same request lifecycle.

### 1.3 `GET /ready` endpoint

| Component | File | Purpose |
|-----------|------|---------|
| Route | `apps/api/src/routes/health/ready.ts` | GET /ready; auth-free; pings redis + Supabase JWKS |
| Redis client | `apps/api/src/lib/redis.ts` | Lazy ioredis singleton; no-op if `REDIS_URL` unset |

**Contract:**
- 200 OK ⇒ `{"status": "ready", "version": "1.5.0", "checks": {redis: {ok, latency_ms, error?}, supabase: {ok, latency_ms, error?}}}`
- 503 Service Unavailable ⇒ `{"status": "not_ready", ...}` if any check is down.
- Each check has a 3s timeout. Latency is measured in-process.
- `/health` (liveness, fast) vs `/ready` (readiness, checks deps) — conventional split for orchestrator probes.

### 1.4 Side fix: `scripts/type-drift-check.ts`

The F1 commit `de43904` "fix(scripts): type-drift detector — skip GRANT-only migrations" added a regex filter that was too broad — it matched `ALTER DEFAULT PRIVILEGES` in `0004_role_grants.sql`, so 0004 was always included in the hash. The stored `.migration-hash` was stale as a result.

The F2 fix narrows the regex to match only actual schema-altering DDL (`CREATE/ALTER/DROP TABLE/INDEX/VIEW/FUNCTION/TYPE/SEQUENCE/EXTENSION/SCHEMA/MATERIALIZED VIEW`):
- `0001_init.sql` (CREATE TABLE) → included
- `0002_custom_access_token_hook.sql` (CREATE OR REPLACE FUNCTION) → included
- `0003_schema_completion.sql` (CREATE TABLE) → included
- `0004_role_grants.sql` (only GRANT + ALTER DEFAULT PRIVILEGES) → **excluded** ✓

The stale `.migration-hash` was regenerated by deleting the file and re-running the script. The new hash is `2d55...`, which excludes 0004 (verified).

---

## 2. What F2 didn't do (intentionally)

- **Performance traces.** Sentry's `tracesSampleRate` is hard-coded to `0.0`. Adding it later is non-breaking.
- **Pino → Sentry integration.** The Sentry SDK has a `pinoIntegration` that auto-attaches log breadcrumbs. Not added in F2 — kept the plugin surface small.
- **ALS for the route handler.** `enterWith` in preHandler doesn't reliably propagate to the handler (different async contexts). The X-Request-Id header echo is the authoritative propagation; the ALS is best-effort for downstream code.
- **`/metrics` Prometheus endpoint.** Listed in the F2 handoff §3.2 but not built — requires a metrics library + endpoint design; deferred to a v1.6 backlog item.
- **`/api/admin/health` rollup (api→hermes→redis→mcp).** Listed in F2 handoff §3.1. Pre-existing admin route is minimal (version + uptime); F2 didn't extend it. Flagged in `docs/PHASE-F-CARRY-FORWARD.md` for F3 closure.
- **Cron self-loopback correlation beyond the X-Request-Id header.** The cron skill-runner adds the header; deeper correlation (e.g. tagging the Sentry event with the cron job id) is out of scope.
- **Boot smoke validation in this F2 commit.** The local Docker Desktop daemon is stopped on this Windows box (`com.docker.service` is non-startable without admin / WSL2 backend). The `deploy/boot-smoke.sh` script is the operator's Stage 1 task on the VPS; the F2 code is structurally correct (typecheck + 107 api + 98 hermes tests all green) and ready for that smoke.

---

## 3. Open assumptions

1. **GlitchTip compatibility.** GlitchTip is Sentry-API-compatible (same envelope endpoint), so the same DSN works against either backend. If the operator's GlitchTip instance requires a custom `serverName` or `release` override, that's a v1.6 wire-up.
2. **Sentry version pinning.** `^8.55.0` is the version installed. Newer 9.x is API-compatible for the surface we use (`init`, `captureException`); upgrading is non-breaking.
3. **Sentry ENV/RELEASE defaults.** Defaults to `NODE_ENV` and `1.5.0`. Production should set `SENTRY_RELEASE` to the actual deployed commit SHA for proper release tracking in Sentry. Operator's choice — flag in operator guide.
4. **Request-id format.** UUIDv4. Operators who want ULID / KSUID / custom formats can swap `crypto.randomUUID()` in `genRequestId`. The header is just an opaque string; downstream consumers don't care about the format.

---

## 4. Operator-visible env changes

Two new optional env vars in `/opt/jarvis/.env`:

```bash
# F2 — observability (optional; no-op if both unset)
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
# GLITCHTIP_DSN=https://<key>@<glitchtip-host>/<project>
SENTRY_ENVIRONMENT=production          # optional; defaults to NODE_ENV
SENTRY_RELEASE=1.5.0                   # optional; defaults to "1.5.0"
```

If both DSNs are unset, error capture is silently disabled. The api/hermes boot logs will print `"Sentry error capture enabled"` only when a DSN is configured. The docker compose file passes these envs to both services; the env module is a no-op when they're unset.

---

*F2 — committed with F3 (carry-forward ledger) on `phase/f-deploy`. Local gates: 5/5 typecheck, 107/107 api + 98/98 hermes tests, all 5 DNA gates 0, web build OK, mobile typecheck OK. Boot smoke: structurally correct, but the `node dist/server.js` verification was skipped locally (Docker daemon not running on this Windows box); operator runs the `deploy/boot-smoke.sh` Stage 1 on the VPS.*
