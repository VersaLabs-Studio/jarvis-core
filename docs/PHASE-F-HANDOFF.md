# Phase F — Deploy & Polish — HANDOFF (final phase of v1.5)

> **From:** Architect (Kidus / Opus 4.8 brain) → Orchestrator → OpenCode mesh
> **Standard:** Architectural DNA v1.0.0 — Six Pillars. Merge floor: Code Review 0 blockers + Auditor ≥ 8.5.
> **Base branch:** cut `phase/f-deploy` from `develop` **after** `phase/e-skills → develop` is promoted.
> **Master refs:** Part 5 §5.1 (Phase F gate), §5.2 (hardened compose + nginx TLS), §5.3 (VPS scripts), §5.4 (observability), §5.6 (backup/restore), §5.9 (go-live checklist).
> **Build model:** one large unit on `phase/f-deploy`, holistic gate once — EXCEPT F0, which is a hard serial prerequisite (see §1).

---

## 0. Short message (read first)

Phase E is signed off at **9.0/10** and promoted to `develop`. Phase F is the last phase of v1.5. It is **NOT** a normal "build a feature" unit — it is "make the system actually run on the VPS and survive contact with reality." There is one hard ordering constraint: **F0 (production-boot fix) blocks everything.** Until `node dist/server.js` boots clean for both `apps/api` and `apps/hermes` in a container, nothing deploys and no live gate line can pass. Build F0 first, prove it with a containerized boot smoke test, then fan out F1–F4, then run the F5 end-to-end gate on the live VPS. Kidus is doing the manual ops prep (DNS, VPS, secrets, OAuth) in parallel starting now — coordinate the live-gate steps (F4/F5) with him because they need real creds.

---

## 1. F0 — Production-boot blockers (HARD serial prerequisite — do this first, alone)

**Why first:** every dev gate (typecheck, vitest, tsx) is green because those transpile TS on the fly. Production runs `node dist/server.js`, which does not. The phase cannot proceed past F0.

### F0.1 — `@jarvis/shared` is not production-consumable (BLOCKER, JARVIS-wide)

**Defect:** `packages/shared/package.json` sets `"main": "./src/index.ts"` and all `exports` point at `./src/*.ts`, with no build step. `node` cannot import `.ts`. Both node-booted services have a **runtime value import** from shared and will crash on boot:
- `apps/api/src/factory/register-entities.ts:2` → `import { entities } from "@jarvis/shared"`
- `apps/hermes/src/lib/skill-loader.ts:13` → `import { skillDocSchema } from "@jarvis/shared"` (runs at boot)

Additionally, `packages/shared/src` has 6 extensionless relative imports (`config/entities.ts` → `../schemas/*.schema`; `lib/query-keys.ts` → `../config/entities`) that break Node's NodeNext ESM resolver even after compilation.

**Required fix (intent + acceptance — the mesh's plan/refactor agent owns the exact mechanics):**
1. Add explicit `.js` extensions to **all** relative imports inside `packages/shared/src` (TS permits `.js` specifiers in `.ts` source under NodeNext).
2. Give `@jarvis/shared` a real build: `"build": "tsc"` emitting `dist/` with `module: NodeNext` + `declaration: true`.
3. Update `package.json` `exports`/`main`/`types` so the `node`/production condition resolves **`./dist/*.js`** + `./dist/*.d.ts`, while preserving the source path for Next.js/Expo `transpilePackages` dev consumption (use the `exports` conditions map — do not break web/mobile).
4. `apps/api/Dockerfile` and `apps/hermes/Dockerfile`: build `@jarvis/shared` before the app build, and copy shared's compiled `dist` (not raw `src`) into the runner image.
5. **Acceptance:** in a clean container, `node apps/api/dist/server.js` and `node apps/hermes/dist/server.js` both boot to the listening state with **no** `ERR_UNKNOWN_FILE_EXTENSION`, `ERR_MODULE_NOT_FOUND`, or `Cannot find module` — verified by a new boot-smoke step (can be a Docker build + `--entrypoint node ... -e "import('./dist/server.js')"` health probe, or a compose `up` + `/health` curl in CI).

> ⚠️ **Risk to manage:** changing shared's `exports` can break `apps/web` (Next `transpilePackages`) and `apps/mobile` (Expo/Metro). Re-run `apps/web` build and `apps/mobile` typecheck as part of F0 acceptance. This is a refactor-strategist-grade change — plan it, don't hack it.

### F0.2 — `apps/api/tsconfig.json` does not override root `noEmit:true` (E0-F4, P1 build blocker)
The API image build emits nothing because the root tsconfig sets `noEmit:true` and the API config doesn't override it. Add `"noEmit": false` to `apps/api/tsconfig.json`. Acceptance: `pnpm --filter @jarvis/api build` produces `apps/api/dist/server.js`.

### F0.3 — dangling test import (P2 test rot)
`apps/api/tests/integration.test.ts:5` imports `../src/middleware/protected.js`, deleted in WP-0. Fix the import (point at the real guard) or remove the dead test. Acceptance: the full api test file loads and runs.

**F0 gate (must pass before F1–F5 start):** containerized boot smoke green for api + hermes; `apps/web` build + `apps/mobile` typecheck still green; all existing DNA gates still 0; full test suite green.

---

## 2. F1 — Deploy infrastructure (mesh builds; Kidus runs on the VPS)

> 🚨 **CO-TENANCY CONSTRAINT (audited 2026-06-13 — supersedes the Part 5 §5.2 dedicated-box compose).** The target VPS (`91.99.119.239`, host `pana`) is **NOT dedicated** — it runs a live bare-metal ERPNext/Frappe `bench`. Audited footprint: **host nginx 1.18.0 owns port 80** (Frappe), MariaDB `:3306`, Frappe Redis `:11000`/`:13000`, gunicorn `:8000`, socketio `:9000`; **Docker not installed; `:443` and `:6379` are free; `ufw` inactive.** Therefore F1's nginx/compose MUST change:
> 1. **JARVIS does NOT bind host `80`/`443`.** Drop the published `nginx` service from JARVIS's compose (or bind it to `127.0.0.1` only). JARVIS `web`/`api`/`hermes` publish on **loopback** (`127.0.0.1:3000` / `:3001` / `:8765`).
> 2. **Front door = the EXISTING host nginx.** Deliver a vhost snippet (`server_name jarvis.versalabs.dev`) that reverse-proxies to the loopback ports (incl. the `/ws` upgrade), to be `include`d into the host nginx — **find and never clobber the Frappe bench config first** (`sites-enabled` is empty; config lives in `conf.d`/bench-generated).
> 3. **TLS on the host nginx** via certbot for `jarvis.versalabs.dev` (port 443 is free). The `limit_req_zone` (fix B3) goes in the host nginx `http{}`.
> 4. **JARVIS Redis stays internal** to the compose network — no host `6379` publish.
> 5. **No `ufw` step** on this box (would sever Frappe's `:8080`/`:9000`); document reliance on the Hetzner Cloud Firewall instead.
> 6. **Resource budget is tight:** 7.6 GB RAM, ~5.7 GB free with Frappe running, **0 B swap.** Add a 2–4 GB swapfile in the deploy script; keep the existing `mem_limit`s (they sum to ~4 GB — fits with swap headroom).
>
> The original §5.2 nginx (own 80/443 server) and the `setup-vps.sh` `ufw` block are **dedicated-box artifacts — do not apply them verbatim here.**
>
> 🌐 **WEB-ON-VERCEL SPLIT + CONCRETE DOMAINS (confirmed 2026-06-14; DNS live).** `apps/web` deploys to **Vercel**, NOT the VPS — **drop the `web` service from the VPS compose entirely**; the host-nginx vhost proxies **only the API + `/ws`**. Final wiring:
> - **Web:** `https://jarvis.versalabs-studio.com` → Vercel (covered by the existing `*` wildcard ALIAS; attach to the JARVIS web project at deploy).
> - **API/Hermes:** `https://api.jarvis.versalabs-studio.com` → **A-record → `91.99.119.239` (live)** → host nginx vhost → `127.0.0.1:3001` (api) + `/ws` upgrade. certbot issues here (CAA already permits `letsencrypt.org`).
> - **API env:** public base URL + **CORS allow-origin `https://jarvis.versalabs-studio.com`** (the Vercel web origin) + WS origin allow; the Fastify API must accept cross-origin from the Vercel domain.
> - **Web env (Vercel):** `NEXT_PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com`; WS `wss://api.jarvis.versalabs-studio.com/ws`.
> - **Mobile (Expo):** `EXPO_PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com`.

Per Part 5 §5.2–§5.3. Audit what already exists before writing (compose already has all 6 app services + 6 MCP services + nginx + socket-proxy; `scripts/` has `deploy.sh`, `health-check.sh`, `docker-*`).

1. **`services/nginx/` does not exist yet** — create `nginx.conf` (with `limit_req_zone` in `http{}` — fix B3) + `conf.d/default.conf` (TLS on 443, 80→443 redirect except ACME, HSTS + security headers, `/ws` upgrade, chat/api rate-limit zones) exactly per §5.2.
2. **Hardened compose:** add `mem_limit` to **every** service (hermes 1700m, api 512m, web 600m, nginx 96m, socket-proxy 64m, redis, each mcp-*), add healthchecks for `web` + `nginx`. Confirm no raw `docker.sock` on api/hermes (H1 — already true; re-assert).
3. **VPS scripts:** `scripts/setup-vps.sh` (apt, Docker, ufw deny-by-default 22/80/443, fail2ban, unattended-upgrades, clone, volumes), `scripts/ssl-setup.sh <domain>` (certbot webroot), per §5.3.
4. **Backup/restore (§5.6):** `scripts/backup.sh` (nightly `pg_dump` → gzip → off-box, 14-day prune) + `scripts/restore.sh <dump>`. The restore drill is an F5 gate line.

**Acceptance:** `docker compose config` validates; nginx config passes `nginx -t`; scripts are shellcheck-clean and idempotent.

---

## 3. F2 — Observability (Part 5 §5.4 — light, single-VPS)

1. `GET /api/admin/health` — roll up hermes/redis/db/mcp/socket-proxy into one payload (route dir `apps/api/src/routes/admin/` exists — verify/complete it).
2. `GET /metrics` — Prometheus text: request count/latency, model spend, container health.
3. Error tracking: wire a Sentry or self-hosted GlitchTip DSN for API + web + mobile (env-gated; no-op if unset).
4. Structured logs → `system_logs` sink confirmed for api + hermes (pino already in place).

**Acceptance:** `/api/admin/health` returns the rollup; `/metrics` scrapes; a forced error appears in the tracker; a log line lands in `system_logs`.

---

## 4. F3 — Carry-forward ledger (close or re-defer with reason; no recircle)

| ID | Item | Severity | Action |
|----|------|----------|--------|
| **C-D3** | Dashboard `api.getRaw<ServiceHealth[]>("/api/services")` likely receives the `{ok,data}` envelope, not the array | **P1 latent** | Fix the unwrap; verify the services page renders real statuses |
| **E0-F3** | Budget gate inert (`estimateCostUsd→0`) + not wired into chat | P2 | Wire `checkAndIncrement` into `chat-stream.ts`; drop the `void getResolved;` keepalive |
| **C-D1** | `apps/mobile/lib/websocket.ts` hardcoded `:4000` fallback | P2 | Unify with config |
| **C-D2** | `getExpoPushTokenAsync({ projectId: undefined })` stub | P2 | Wire `extra.eas.projectId`; document the EAS-build requirement |
| **C-D4** | Workflow runs = N parallel requests under one cache key | P2 | Add `GET /api/workflows/runs?ids=` batch endpoint |
| **E0-F5** | `docker-control.stats()` single-sample cpu%, unused `BOOT_CHECK_INTERVAL_MS`, `corepack prepare pnpm@latest` unpinned | P3 | Opportunistic; pin pnpm to `9.15.0` to match §5.3 |
| **NEW** | socket-proxy `EXEC=0` etc. unverified end-to-end | P3 | Runtime verify during F5 |

---

## 5. F4 — Live integrations (mesh wires; Kidus authorizes the creds/OAuth)

These need Kidus's manual prep (see his task list). The mesh wires the code so it's live the moment creds land.
1. **Telegram bot:** replace the v1.5 structured-log placeholder with a real bot send (token + chat_id from env). Cron morning/weekly audits notify chat + Telegram.
2. **Hosted MCP OAuth:** Vercel (`https://mcp.vercel.com`) + Linear (`https://mcp.linear.app`) OAuth flow; store sealed tokens.
3. **Gmail:** community-server trust review + OAuth consent; keep flagged until reviewed.
4. **slack:** decide — archived upstream; pick a maintained fork or leave `MCP_PENDING`.
5. **Production cron:** confirm 8AM daily audit + Mon 9AM weekly review register and fire on the VPS (Redis-gated).

**Acceptance:** §5.1 Phase F lines 4–5 verified live; `POST /v1/mcp/test` per server returns `ok:true` with `tools[]` (slack = pending) against running containers.

---

## 6. F5 — End-to-end gate + go-live (Part 5 §5.1 Phase F + §5.9)

Run on the live VPS, with Kidus, once F0–F4 are in. All 9 §5.1 Phase F lines + the full §5.9 checklist:
- `git pull` on VPS → `docker compose up -d` → all services healthy
- `https://<domain>` serves the dashboard over valid TLS; 80→443 redirect; HSTS present
- `https://<domain>/api/admin/health` → ok; WS works through nginx (wss)
- Expo app connects to the VPS (not localhost); full mobile→Hermes→MCP round trip
- Telegram responds; cross-device (start on mobile, view on web)
- Security: unauth rejected; nginx rate-limit blocks floods
- Backup produces a restorable `pg_dump` off-box — **restore drill tested**
- Observability: errors in tracker; `/metrics` scrapes; logs in `system_logs`
- Perf/load: chat starts streaming < 3s; dashboard < 2s; **10 concurrent chats stable**
- Update `CHANGELOG.md` (v1.5.0) + `README.md`; commit & push docs

**Phase F gate = MVP gate.** When §5.9 is green on the VPS, v1.5 is shipped.

---

## 7. Sequencing summary

```
F0 (serial, blocks all) ──► containerized boot smoke green for api + hermes
        │
        ├─► F1 deploy infra ──┐
        ├─► F2 observability  ├─► F5 end-to-end gate on the live VPS ──► §5.9 green = v1.5 MVP
        ├─► F3 ledger close   │      (with Kidus; needs his DNS/VPS/secrets/OAuth)
        └─► F4 live integ. ───┘
```

Kidus's manual ops (DNS, VPS provision, `.env`, OAuth, Telegram bot) run in **parallel** with F0 so the VPS is ready the moment F0 lands.

## 8. Gate & promotion

- Holistic gate on `phase/f-deploy` once F0–F5 are in: all DNA gates 0, full suite green, §5.1 Phase F + §5.9 green on the VPS, Auditor ≥ 8.5.
- Promotion `phase/f-deploy → develop → main` is the **architect's** call (Kidus), never the mesh's. Never push to `main` directly.
- Carry nothing past F — F is the last v1.5 phase. Anything genuinely post-MVP (multi-VPS, GitHub Actions CD, the 30-use-case tuning) goes to a v1.6 backlog, explicitly.

---

*Phase F handoff — © 2026 Kidus Abdula / VersaLabs Studio. F0 is a hard serial prerequisite; the rest fans out; F5 is the MVP gate.*
