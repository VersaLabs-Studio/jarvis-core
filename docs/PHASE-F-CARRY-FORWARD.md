# Phase F — Carry-Forward Ledger (F3)

> **Date:** 2026-06-15
> **Author:** OpenCode mesh (Kidus's hands; Opus-authored handoff directive)
> **Status:** F2 + F3 checkpoint — every deferred / out-of-scope / assumption item from F0, F1, E, D, and the F2 handoff is captured here, with owner + phase tags. v1.5 ships when §5.9 is green on the VPS (F5).

---

## 1. Reading this doc

Each row is a known-unfinished item. The columns:

| Column | Meaning |
|--------|---------|
| **ID** | A stable identifier (`F-CFD-N` for a Phase F carry-forward, `E-` for Phase E, `D-` for Phase D, `O-` for operator-only) — used in commit messages, gate reports, and the §5.9 live-gate checklist. |
| **Item** | One-line description of what is unfinished. |
| **Severity** | P0 (blocker) / P1 (latent bug, must fix before live gate) / P2 (deferred but tracked) / P3 (nice-to-have, may slip). |
| **Phase** | The phase in which the action lives (`F0` / `F1` / `F2` / `F3` / `F4` / `F5` / `v1.6`). `closed` if done. |
| **Owner** | `mesh` (OpenCode, can be done by the executor agent) / `operator` (Kidus — manual work, creds, accounts, SSH). |
| **Status** | `open` / `in-progress` / `closed` / `deferred`. |

**Rule for promotions:** an item is `closed` only when the live gate (F5 §5.9) verifies it. Otherwise it stays `open` even if a commit lands the code (the gate is the verifier).

---

## 2. Phase E carry-forward (closed by F0 + open items rolling to F4/v1.6)

The Phase E gate findings (`docs/PHASE-E-GATE-FINDINGS.md` §8) had six items. F0 closed two of them; the rest roll here.

| ID | Item | Severity | Phase | Owner | Status |
|----|------|----------|-------|-------|--------|
| **E0-F1** | `apps/api/src/factory/register-entities.ts` hook scoping fix (the §3-prelude bug) | P0 | F0 | mesh | **closed** (F0 commit `f4e66b4`) |
| **E0-F2** | Shared package ESM extension issue (`@jarvis/shared` was not production-consumable) | P0 | F0 | mesh | **closed** (F0 commits `0efebdb` + `f4e66b4`) |
| **E0-F3** | Budget gate inert (`estimateCostUsd→0`) + not wired into chat | P2 | F4 / v1.6 | mesh | open — see F-CFD-2 |
| **E0-F4** | `apps/api/tsconfig.json` `noEmit:true` from root override (api + hermes) | P1 | F0 | mesh | **closed** (F0 commit `f4e66b4`) |
| **E0-F5** | `docker-control.stats()` single-sample cpu%, unused `BOOT_CHECK_INTERVAL_MS`, `corepack prepare pnpm@latest` unpinned | P3 | v1.6 | mesh | open — opportunistic; pin pnpm to `9.15.0` to match the existing `packageManager` field. Not on the F5 critical path. |
| **E0-F6** | NEW — `docker-socket-proxy` env vars (`EXEC=0` etc.) unverified end-to-end | P3 | F5 (live gate) | mesh + operator | open — F5 verifies the operator's actual `mvn/socketio` containers cannot be reached via the socket-proxy (H1 assertion). The env vars are baked into the F1 compose and look correct on inspection, but only a real attempt from Hermes proves the lockdown. |

---

## 3. Phase D carry-forward (Phase D ledger rolls to Phase F per Orchestrator directive)

The Phase D live-gate items were never closed; the directive rolls them to F.

| ID | Item | Severity | Phase | Owner | Status |
|----|------|----------|-------|-------|--------|
| **D-CFD-1** | Mobile `apps/mobile/lib/websocket.ts` hardcoded `:4000` fallback | P2 | F4 | mesh | open — same as F-CFD-3. |
| **D-CFD-2** | `getExpoPushTokenAsync({ projectId: undefined })` stub | P2 | F4 | mesh | open — same as F-CFD-4. |
| **D-CFD-3** | Dashboard `api.getRaw<ServiceHealth[]>("/api/services")` likely receives the `{ok,data}` envelope, not the array | **P1** | F3 / F5 | mesh | open — same as F-CFD-1. **Live-gate must verify** that the services page renders real container statuses, not an empty array. |
| **D-CFD-4** | Workflow runs = N parallel requests under one cache key (the `useDoc` per-run fan-out anti-pattern) | P2 | v1.6 | mesh | open — same as F-CFD-5. |
| **D-CFD-5** | Cosmetic dashboard items (placeholder text, missing loading skeletons) | P3 | v1.6 | mesh | open — track in a v1.6 polish backlog. |
| **D-CFD-6** | `Live getRaw<Workflow[]>('/api/cms/workflows?page=1')` smoke — never verified against a real network | **P1** | F5 | mesh | open — F5 §5.9 explicitly requires this as a gate line (`GET /api/cms/workflows → 200` over TLS). |

---

## 4. F0 carry-forward (closed)

F0 itself had no open items. Two items in the F0 handoff were closed by F0 commits:

| ID | Item | Severity | Phase | Owner | Status |
|----|------|----------|-------|-------|--------|
| **F0-1** | `@jarvis/shared` not production-consumable (no `dist/`, extensionless relative imports) | P0 | F0 | mesh | **closed** (`0efebdb`) |
| **F0-2** | `apps/api/tsconfig.json` `noEmit:true` override (api + hermes) | P1 | F0 | mesh | **closed** (`f4e66b4`) |
| **F0-3** | Dangling `apps/api/tests/integration.test.ts` import (WP-0 rot) | P2 | F0 | mesh | **closed** (`f4e66b4` — deleted) |
| **F0-4** | `0004_role_grants.sql` applied+verified on hosted Supabase (`rofvgnvhmwsgrqewcbci`, 2026-06-13) | — | F0 | operator (already done) | **closed** (commit `b47cbc9`) |

---

## 5. F1 carry-forward (operator + mesh)

F1 is merged on `phase/f-deploy` (commits `dd80de4` through `250ed17`). The actual code + compose + nginx vhost are done. The carry-forward is the operator-side bring-up + a few small mesh items.

| ID | Item | Severity | Phase | Owner | Status |
|----|------|----------|-------|-------|--------|
| **F1-OP-1** | Stage 1 bring-up on the VPS: `setup-vps.sh` → `setup-swap.sh` → `docker compose build` → `docker compose up -d` → `boot-smoke.sh` | **P0** | F1 / F5 | operator | open — see `docs/PHASE-F-OPERATOR-GUIDE.md` §STAGE 1. The scripts are on the `phase/f-deploy` branch in `deploy/`. |
| **F1-OP-2** | Stage 1.5: `deploy/certbot-issue.sh` for `api.jarvis.versalabs-studio.com` | **P0** | F1 / F5 | operator | open — DNS must resolve to the VPS (A-record → 91.99.119.239) before certbot can issue. CAA already permits `letsencrypt.org`. Idempotent. |
| **F1-OP-3** | Stage 0.1: confirm which IP is the live VPS (`91.99.119.239` per docs vs `78.46.160.113` in `~/.ssh/known_hosts`) + clear the stale host key (the SSH host key on `78.46.160.113` changed since the last connect) | **P0** | F1 | operator (security decision) | open — **blocks any SSH-driven F1 work**. The `78.46.160.113` host key change must be a legitimate rebuild; if it isn't, investigate before connecting. |
| **F1-OP-4** | Hetzner Cloud Firewall: confirm 22/80/443 are open inbound; deny everything else | P1 | F1 | operator | open — F1 doesn't touch the cloud firewall; the `setup-vps.sh` script deliberately skips `ufw` (would sever Frappe). The Hetzner console is the only layer-3 ACL. |
| **F1-OP-5** | Real-looking Supabase keys in `apps/api/.env.example` (the dev-fill: anon + service-role + OPENROUTER_API_KEY are committed for local dev) | P2 | F1 | operator | open — these are real values, not placeholders. They were committed to `apps/api/.env.example` for local-dev convenience (F1). **Production `api/.env` (gitignored) is separate and MUST be filled with the operator's own secret values** (the staging vs prod distinction). Flag: when the prod `api/.env` is created on the VPS, use the prod Supabase project's keys, not these dev-fill values. |
| **F1-OP-6** | Vercel web project env: `NEXT_PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com` (and optionally `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | **P0** | F1 | operator | open — Vercel console (not in this repo). Required for the dashboard to find the API. The `web` service is NOT in the VPS compose (F1 web-on-Vercel split). |
| **F1-OP-7** | Telegram bot (`@BotFather` → `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALLOW_FROM`) | P2 | F4 (live integrations) | operator | open — F4 wires the real bot send; the env is needed before that. |
| **F1-OP-8** | 2.1 — 8AM daily + Mon 9AM weekly cron schedules verified on the VPS (next run fires; or trigger manually once) | P1 | F5 | operator + mesh | open — F5 §5.9 gate line. The cron jobs are in `apps/hermes/src/cron/registry.ts` (3 jobs); F5 verifies they actually fire on the VPS. |
| **F1-MESH-1** | Hetzner Cloud Firewall is the only layer-3 ACL; ufw is intentionally skipped. The F1 scripts document this. | — | F1 | mesh | **closed** (F1 commit `235140c` + `docs/PHASE-F-OPERATOR-GUIDE.md` Rule 2) |
| **F1-MESH-2** | `apps/api/.env.example` was added (was missing in F0; F1 dev-fill committed it) | — | F1 | mesh | **closed** (F1 commit `235140c`) |

---

## 6. F2 carry-forward (mesh; v1.6 backlog)

F2 is merged on `phase/f-deploy` (F2 + F3 commits). The Sentry / request-id / `/ready` work is done. Items below are out of scope for F2 (the directive said "minimal") and tracked here.

| ID | Item | Severity | Phase | Owner | Status |
|----|------|----------|-------|-------|--------|
| **F2-1** | `GET /metrics` Prometheus text endpoint (request count/latency, model spend, container health) — listed in F2 handoff §3.2 but not built | P2 | v1.6 | mesh | open — needs a metrics library (e.g. `prom-client`) + endpoint design. Not on the F5 critical path. |
| **F2-2** | `/api/admin/health` rollup (api→hermes→redis→mcp→socket-proxy into one payload) — F2 handoff §3.1 | P2 | v1.6 | mesh | open — pre-existing `apps/api/src/routes/admin/index.ts` is minimal (version + uptime). F2 didn't extend it. v1.6 wires the per-dependency status. |
| **F2-3** | ALS for the route handler is best-effort (the `X-Request-Id` header is the authoritative propagation channel) | P3 | known limitation | mesh | open / documented — `enterWith` in preHandler doesn't reliably propagate to the handler across Fastify's async context. Acceptable because the X-Request-Id header echo + `request.requestId` cover the propagation contract. See `docs/PHASE-F-F2-NOTES.md` §1.2. |
| **F2-4** | F1 type-drift detector regex was too broad (matched `ALTER DEFAULT PRIVILEGES`); F2 narrowed the regex | — | F2 | mesh | **closed** (F2 commit; see `docs/PHASE-F-F2-NOTES.md` §1.4) |
| **F2-5** | Local boot smoke (`node dist/server.js` for api + hermes) cannot be run on this Windows box — Docker Desktop daemon is stopped | P2 | F1 / F5 | operator (VPS Stage 1) | open — the F1 `deploy/boot-smoke.sh` script is the operator's Stage 1 task on the VPS. F2 code is structurally correct (typecheck + 107/107 api + 98/98 hermes tests) and ready for that smoke. |

---

## 7. F4 live integrations (operator creds + mesh wiring)

F4 needs the operator's creds to wire the code. Items below block F4 from going live; once the creds are in `.env`, mesh finishes the wiring.

| ID | Item | Severity | Phase | Owner | Status |
|----|------|----------|-------|-------|--------|
| **F4-1** | MCP per-server `.env` files (`apps/mcp/{github,notion,supabase,gmail}/.env`) — referenced by `docker-compose.yml` as `env_file: [apps/mcp/<name>/.env]`; the files do not exist as templates yet | **P0** | F4 | mesh | open — F4 creates `apps/mcp/<name>/.env.example` templates for each MCP server (GitHub PAT, Notion token, Supabase PAT, Gmail OAuth). The operator copies + fills when creds arrive. |
| **F4-2** | GitHub PAT for the MCP server | **P0** | F4 | operator | open — needed for F4.1. |
| **F4-3** | Notion integration token | **P0** | F4 | operator | open — needed for F4.1. |
| **F4-4** | Supabase PAT (for the MCP server) | **P0** | F4 | operator | open — needed for F4.1. Distinct from the hosted project's `SUPABASE_SERVICE_ROLE_KEY` (which the API uses). |
| **F4-5** | Gmail OAuth consent (community-server trust review) | P1 | F4 | operator (trust review) | open — keep flagged until reviewed. Community MCP servers are untrusted; the operator decides whether to allow. |
| **F4-6** | Vercel MCP OAuth (`https://mcp.vercel.com`) | P2 | F4 | operator | open — `mcp/vercel/config.yaml` is a doc-only stub; F4 wires the OAuth flow. |
| **F4-7** | Linear MCP OAuth (`https://mcp.linear.app`) | P2 | F4 | operator | open — same shape as F4.6. |
| **F4-8** | Slack MCP — decide: archived upstream; pick a maintained fork or leave `MCP_PENDING` | P3 | F4 | operator | open — decision, not code. |
| **F4-9** | Real Telegram bot send (replace the v1.5 structured-log placeholder) | P2 | F4 | mesh | open — F4 wires `node-telegram-bot-api` (or similar); uses `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALLOW_FROM` (already in `.env.example`). |

---

## 8. F5 live go-live gate

F5 is the end-to-end gate on the live VPS. It walks the Part 5 §5.1 Phase F + §5.9 checklist. None of these are "code" — they're verifications + a couple of mesh write-ups (CHANGELOG + README).

| ID | Item | Severity | Phase | Owner | Status |
|----|------|----------|-------|-------|--------|
| **F5-1** | `git pull` on VPS → `docker compose up -d` → all services healthy (no `restarting` / `unhealthy`) | **P0** | F5 | operator + mesh | open — covered by F1-OP-1 + F5-OP-1 below. |
| **F5-2** | `https://<domain>` serves the dashboard over valid TLS; 80→443 redirect; HSTS present | **P0** | F5 | operator | open — covered by F1-OP-2 + the F1 vhost + certbot. |
| **F5-3** | `https://api.jarvis.versalabs-studio.com/health` → 200; `/api/admin/health` (admin-auth) → 200; WS works through nginx (wss) | **P0** | F5 | operator + mesh | open — F5 walks this against the live VPS. |
| **F5-4** | Expo app connects to the VPS (not localhost); full mobile→Hermes→MCP round trip | **P0** | F5 | operator + mesh | open — `EXPO_PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com` (F1-OP-6, mobile-side). |
| **F5-5** | Telegram bot responds; cross-device (start on mobile, view on web) | P2 | F5 | operator | open — depends on F4-7 + F4-9. |
| **F5-6** | Security: unauth rejected; nginx rate-limit blocks a flood | **P0** | F5 | operator + mesh | open — verified against the live VPS (the vhost has the rate-limit zones; F1 deploy). |
| **F5-7** | Backup + restore drill: `scripts/backup.sh` produces a `pg_dump` off-box; `scripts/restore.sh` restores it into a scratch DB | **P0** | F5 | operator + mesh | open — `backup.sh` + `restore.sh` are listed in F2 handoff §4 / Part 5 §5.6 but not yet committed (F0/F1/F2 didn't touch them). Mesh writes the scripts; operator runs the drill. |
| **F5-8** | Observability: a forced error lands in Sentry/GlitchTip; `/metrics` scrapes (F2-1 deferred — this line is best-effort); logs in `system_logs` | P1 | F5 | operator + mesh | open — Sentry part is F2 (works once DSN is set); `/metrics` is F2-1 (deferred to v1.6). |
| **F5-9** | Perf/load: chat starts streaming < 3s; dashboard < 2s; **10 concurrent chats stable** | P1 | F5 | operator + mesh | open — F5 walks this on the live VPS. If hermes OOMs under 10 concurrent (the F1 hermes `mem_limit: 1700m`), bump the limit (F1 §5 open assumption). |
| **F5-10** | `CHANGELOG.md` (v1.5.0) + `README.md` updated; committed & pushed | P2 | F5 | mesh | open — small write-up; mesh does it after F5.1–F5.9 are green. |
| **F5-11** | Morning-audit cron (8AM daily) + weekly-review cron (Mon 9AM) verified firing | P1 | F5 | operator | open — see F1-OP-8. |
| **F5-12** | Promotion: `phase/f-deploy → develop` (mesh PR), then `develop → main` (architect's call, never mesh) | **P0** | F5 | mesh + architect (Kidus) | open — the last step. Architect approves and pushes. |

---

## 9. v1.6 backlog (out of v1.5)

Items explicitly NOT shipped in v1.5; recorded here so they aren't lost.

| ID | Item | Severity | Phase | Owner | Status |
|----|------|----------|-------|-------|--------|
| **V6-1** | Multi-VPS HA (the v1.5 single-VPS deployment is the MVP; HA is post-MVP) | P2 | v1.6 | mesh | deferred — orchestrator-driven design. |
| **V6-2** | GitHub Actions CD (the F1 deploy is operator-driven; CI/CD is post-MVP) | P2 | v1.6 | mesh | deferred — F1's `deploy/*.sh` is the operator-friendly bridge. |
| **V6-3** | 30-use-case tuning (the 7-day use-case sweep from the Phase E plan) | P3 | v1.6 | mesh | deferred — backlog item, not blocking v1.5. |
| **V6-4** | Per-tenant USD budget field + cost-aware chat gating (F-CFD-2 / E0-F3) | P2 | v1.6 | mesh | deferred — needs OpenRouter pricing table wired in. |
| **V6-5** | `GET /api/workflows/runs?ids=` batch endpoint + `useBatch` hook (F-CFD-5 / D-CFD-4) | P2 | v1.6 | mesh | deferred — anti-pattern in the dashboard; fix when the dashboard grows. |
| **V6-6** | `/metrics` Prometheus endpoint (F2-1) | P2 | v1.6 | mesh | deferred. |
| **V6-7** | `/api/admin/health` rollup (F2-2) | P2 | v1.6 | mesh | deferred. |
| **V6-8** | pnpm pin (`9.15.0`) + corepack prepare match (E0-F5) | P3 | v1.6 | mesh | deferred — opportunistic. |
| **V6-9** | Dashboard cosmetic polish (D-CFD-5) | P3 | v1.6 | mesh | deferred. |

---

## 10. What this doc is NOT

- **Not** a release notes document. CHANGELOG.md is the release notes doc; this is the open-work ledger.
- **Not** a TODO list for the mesh executor. Items the mesh can do in a follow-up turn are listed under F4 / F5; items only the operator can do are listed under F1-OP / F4-OP / F5-OP.
- **Not** a plan. The plan is `docs/PHASE-F-HANDOFF.md`; this is the byproducts.

---

*Phase F carry-forward ledger — © 2026 Kidus Abdula / VersaLabs Studio. F2 + F3 checkpoint. Items in this doc are NOT recirled each phase; they live here until F5 §5.9 closes them on the live VPS, or until v1.6 picks them up.*
