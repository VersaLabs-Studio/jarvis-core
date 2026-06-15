# Phase F — Operator Runbook (for Kidus, personal)

> This is **your** step-by-step guide, separate from `PHASE-F-HANDOFF.md` (which is for the OpenCode mesh). That one says *what to build*; this one says *what you do with your hands* to get v1.5 onto the VPS. Read it top to bottom once before you start.
>
> Written by the Opus brain, updated 2026-06-14. Reflects the F1 rebuild (co-tenant + Vercel web split) — the dedicated-box plan in §5.2 of the handoff is superseded. Concrete domains: `api.jarvis.versalabs-studio.com` (API/Hermes, this VPS) and `jarvis.versalabs-studio.com` (web, Vercel).

---

## ⛔ Three ground rules — internalize these before anything else

**RULE 1 — Do NOT bring up the application stack until F0 is merged to `develop`.**
The current build crashes on boot (`@jarvis/shared` ships raw TypeScript; `node dist/server.js` cannot load it — both `api` and `hermes` die immediately). Running `docker compose up -d` on the full stack today gives you a restart-looping mess and tells you nothing. **Everything in Stage 0 below is safe to do now** because it's OS/DNS/secret prep that never starts the broken app. The app stack waits for Stage 1.

**RULE 2 — Do NOT enable `ufw` on this box (it's co-tenant with ERPNext).**
The audit (below) shows `ufw` is currently **inactive** and Frappe/ERPNext is serving on several ports (80, 8080, 9000). Turning `ufw` on with a JARVIS-style `22/80/443`-only allow-list would likely **cut off ERPNext's realtime/secondary ports**. Leave `ufw` as-is; rely on the Hetzner Cloud Firewall instead (verify it allows 22/80/443). The original Part 5 `setup-vps.sh` `ufw` block assumes a *dedicated* box — **skip it here.**

**RULE 3 — JARVIS's `web` deploys to Vercel, NOT this VPS.**
The VPS hosts **api + hermes + supporting infra** (redis, socket-proxy, mcp-*). The web (Next.js) is at `https://jarvis.versalabs-studio.com` on Vercel (wildcard ALIAS). The `web` service has been removed from the VPS `docker-compose.yml` — running it on the VPS would just be a slower, more expensive place to run Next.js.

---

## 🔎 Box audit (2026-06-13) — co-tenant with ERPNext: what's NOW vs DEFER vs CHANGED

I drove a read-only audit of `pana` (`91.99.119.239`). Reality:

| Found | Detail |
|---|---|
| **Host nginx** (1.18.0) | **owns port 80** (serving Frappe), also `:8080`. **No `:443` listener, no Let's Encrypt** → ERPNext is currently HTTP-only. **Port 443 is free.** |
| **Frappe/ERPNext** | bare-metal `bench` at `/home/frappe/frappe-bench` (gunicorn `:8000`, node socketio `:9000`, supervisord). **Not dockerized.** |
| **MariaDB** `:3306` + **Redis** `:11000` & `:13000` | Frappe's DB + caches (all `127.0.0.1`). **Redis `6379` is free.** |
| **Docker** | **not installed** → our install is clean/additive, no existing containers/networks to collide with. |
| **Resources** | **7.6 GB RAM, 5.7 GB available** (Frappe uses ~1.6 GB); **63 GB disk free**; 4 cores; **0 B swap.** |
| **ufw** | **inactive.** |

**This box is shared — the runbook's "dedicated box" assumptions change. The classification:**

**✅ DO NOW (safe, no impact on Frappe):**
- **0.2 DNS** — point `api.jarvis.versalabs-studio.com` → `91.99.119.239` (A-record). The web (`*.versalabs-studio.com`) is already on Vercel.
- **0.5 secrets / 0.6 Supabase check / 0.7 Telegram bot** — all off-box prep.
- **Docker install** (`get.docker.com`) — clean, Frappe doesn't use it.
- **Add swap** (recommended before bring-up — see below; 0 B swap + ~4 GB JARVIS need on top of Frappe is too tight without a cushion).

**⛔ DEFER / SKIP (would risk Frappe):**
- **0.3 firewall (`ufw enable`)** — SKIP (RULE 2 above).
- **Any `docker compose up` of the app stack** — wait for F0-merged + the co-tenant compose (below).

**🔧 CHANGED from the original plan (co-tenancy + Vercel split):**
1. **JARVIS does NOT bind host `80`/`443`.** The existing host nginx stays the single front door. JARVIS `api` publishes on **`127.0.0.1:3001` only**; `hermes` + `redis` are **internal-only** (no host port). The host nginx gets a new vhost (`server_name api.jarvis.versalabs-studio.com`) that reverse-proxies to `127.0.0.1:3001` (api) + `/ws` upgrade.
2. **TLS goes on the host nginx**, not a JARVIS nginx container — certbot issues for `api.jarvis.versalabs-studio.com` on port 443 (free). The certbot script (`deploy/certbot-issue.sh`) handles vhost deployment.
3. **JARVIS's nginx container is dropped** (was the dedicated-box pattern). The host nginx does all the public-facing.
4. **JARVIS Redis stays internal** to its docker network — no host `6379` publish (and `6379` is free anyway, so no conflict either way).
5. **JARVIS's `web` service is dropped** — Vercel hosts the web (`https://jarvis.versalabs-studio.com`); see RULE 3.
6. **Add a swapfile** (2–4 GB) for memory headroom before running both stacks together.
7. **CORS** on the Fastify API must allow the Vercel web origin (`https://jarvis.versalabs-studio.com`). The `CORS_ORIGINS` env in `/opt/jarvis/.env` handles this; the API fail-loud at boot if it's unset in production.

> The mesh built F1 assuming a dedicated box. It has been rebuilt for the co-tenant + Vercel split. See `docs/PHASE-F-F1-REBUILD-NOTES.md` for the architectural decision log; `deploy/README.md` for the per-script runbook.

---

## The three stages (mental model)

```
STAGE 0  (NOW — runs in parallel with the mesh building F0)
  Resolve VPS identity + host key · DNS · OS hardening · clone repo · gather secrets · Supabase prod-readiness · Telegram bot
        │
        ▼   (wait here until: mesh reports F0 boot-smoke green AND phase/f-deploy is ready)
STAGE 1  (AFTER F0)
  Pull · finalize .env · build images · docker compose up -d · boot-smoke · certbot issue
        │
        ▼
STAGE 2  (AFTER the stack is healthy on TLS)
  §5.9 live go-live gate · backup+restore drill · load test · flip to MVP
```

You can complete **all of Stage 0 today.** Stages 1–2 need F0 done first.

---

# STAGE 0 — Do this now (parallel with the mesh)

## 0.1 — Resolve which box is "yegeara" and fix the host key ⚠️

There's a conflict I need you to settle before I (or you) connect:
- Your SSH config points at **`78.46.160.113`** (user `kidus`).
- Your master docs (Part 5 §5.2) say the VPS is **`91.99.119.239`**.
- The host key for `78.46.160.113` has **changed** since you last connected (old key cached in `known_hosts` line 1; the box now presents `SHA256:o1UVd39JSby4XSKlz1QUQSkDEhxCv9IWWWZn6FWT0xc`).

**Decide and confirm:**
1. **Which IP is the live VPS?** (If you rebuilt/migrated the box, one of these is stale — update Part 5 §5.2 to match, that's a doc fix.)
2. **Did you reinstall/rebuild the box recently?** If yes, the host-key change is expected and you clear the old key. If you did **not** touch it, stop and investigate — a changed host key on a box you didn't rebuild is a red flag.

**Once you've confirmed a legitimate rebuild,** clear the stale key (replace the IP with the real one):
```bash
ssh-keygen -R 78.46.160.113          # remove the old cached key
ssh kidus@78.46.160.113 'echo ok'    # reconnect; verify the NEW fingerprint when prompted, then accept
```
When you accept the new key, **eyeball the fingerprint** against what your VPS provider's console shows for the box. Don't blind-accept.

> Until 0.1 is settled I will not connect the brain to the box. After it's settled, tell me the confirmed IP and that the rebuild was intentional, and I can drive Stage 0.3+ for you over SSH (see "Letting me drive" at the end).

## 0.2 — DNS (do this first; it has the longest lag)

TLS will not issue for a bare IP — Let's Encrypt needs a name. Point the JARVIS API domain at the **confirmed** VPS IP:

| Record | Name | Type | Value |
|--------|------|------|-------|
| **A** | `api.jarvis.versalabs-studio.com` | A | `<confirmed VPS IP>` (TTL 300 while setting up) |
| (already live) `*.versalabs-studio.com` | (wildcard) | ALIAS / CNAME | Vercel |

Verify propagation before Stage 1: `nslookup api.jarvis.versalabs-studio.com` should return the VPS IP.

The web is on Vercel — set `NEXT_PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com` in the Vercel project's env.

DNS can take minutes to hours to propagate — that's why it's step one.

## 0.3 — VPS OS hardening (safe now; no app involved)

The mesh will formalize this as `deploy/setup-vps.sh` (it's in the F1 commit). You can run it now. SSH in as a user with sudo, then:

```bash
sudo /opt/jarvis/deploy/setup-vps.sh
```

What it does (in order; idempotent):
1. `apt update` + base tooling (`git`, `curl`, `wget`, `htop`, `jq`, `fail2ban`, `unattended-upgrades`, `nginx`, `certbot`, `python3-certbot-nginx`)
2. Install Docker Engine + Compose v2 (official `get.docker.com` script)
3. Configure `fail2ban` (SSH brute-force protection)
4. Enable `unattended-upgrades`
5. Create `/opt/jarvis` (owned by your user)
6. Add an `include /etc/nginx/conf.d/jarvis-http.conf` to the host nginx's http{} block (so the certbot script's rate-limit zones load)

**What it does NOT do** (intentionally — see RULE 2):
- It does NOT enable `ufw` (would sever Frappe's `:8080`/`:9000`).
- It does NOT install the JARVIS app stack.
- It does NOT issue TLS certs.

> **If your VPS provider also has a cloud firewall** (Hetzner Cloud Firewall, etc.), it sits in front of `ufw` — make sure 22/80/443 are open there too, or the box is unreachable regardless of `ufw`.

## 0.4 — Clone the repo on the VPS

```bash
sudo mkdir -p /opt/jarvis && sudo chown "$USER":"$USER" /opt/jarvis
cd /opt/jarvis
git clone git@github.com:kidusabdula/jarvis-core.git .
git checkout phase/f-deploy          # you'll pull F0 + F1 here in Stage 1
```
This needs the VPS's SSH deploy key registered on GitHub (or use an HTTPS clone with a PAT). Cloning now is harmless — you're just staging the code; you won't `compose up` until Stage 1.

## 0.5 — Gather production secrets (the authoritative list)

⚠️ The committed `.env.example` at the repo root was stale (Phase-A, OpenClaw self-hosted Supabase); the F1 commit replaced it with the canonical prod env shape. **Copy it and fill it in:**

```bash
cp /opt/jarvis/.env.example /opt/jarvis/.env
chmod 600 /opt/jarvis/.env
# edit /opt/jarvis/.env
```

What the F1-rebuild `.env` requires (every var here is required in production — `CORS_ORIGINS` fail-loud at api boot if unset):

**Supabase (hosted — project `rofvgnvhmwsgrqewcbci`):**
- `SUPABASE_URL=https://rofvgnvhmwsgrqewcbci.supabase.co`
- `SUPABASE_ANON_KEY=` — Supabase dashboard → Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY=` — same page (⚠️ server-only; never in web/mobile/sandbox)
- `SUPABASE_JWKS_URL=https://rofvgnvhmwsgrqewcbci.supabase.co/auth/v1/.well-known/jwks.json`
- `DATABASE_URL=` — the Postgres connection string (Settings → Database) — used by `backup.sh` `pg_dump`

**Auth / crypto (generate strong, ≥32 chars):**
- `JWT_SECRET=` — optional; only if using legacy HS256 (the default is the JWKS path)
- `MASTER_ENCRYPTION_KEY=` — AES-256-GCM key for sealing integration secrets (Part 2 §2.6). Generate: `openssl rand -base64 32`

**LLM:**
- `OPENROUTER_API_KEY=` — openrouter.ai dashboard

**Redis (the cron/BullMQ + queue backend — internal to the docker network):**
- `REDIS_PASSWORD=` — `openssl rand -base64 24`

**Hermes service auth (loopback factory writes — E4 cron):**
- `HERMES_SERVICE_TOKEN=` — shared secret the cron uses on `POST /api/cms/workflow_runs`. Generate: `openssl rand -hex 32`

**CORS (REQUIRED in production; the API fail-loud at boot if unset):**
- `CORS_ORIGINS=https://jarvis.versalabs-studio.com` — the Vercel web origin. Comma-separate for preview deployments.

**Public base URL of the API:**
- `PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com` — used for OAuth redirects, webhook callbacks, mobile `EXPO_PUBLIC_API_URL`.

**Telegram (notifications — F4):**
- `TELEGRAM_BOT_TOKEN=` — from @BotFather (Stage 0.7)
- `TELEGRAM_ALLOW_FROM=` — your numeric Telegram user/chat id (allowlist)

**Observability (F2 — optional but recommended):**
- `SENTRY_DSN=` or `GLITCHTIP_DSN=` — point at a Sentry project or a GlitchTip host. Either enables error capture for both `api` and `hermes`. GlitchTip uses the same DSN format as Sentry (it speaks the Sentry envelope protocol). If BOTH are unset, error capture is silently disabled (no-op). Optional env tags: `SENTRY_ENVIRONMENT` (defaults to `NODE_ENV`), `SENTRY_RELEASE` (defaults to `1.5.0`; set to the deployed commit SHA for proper release tracking).
- `SENTRY_DSN` takes priority over `GLITCHTIP_DSN` if both are set.

> **Forbidden-to-sandbox set (FYI, no action):** Hermes deliberately strips `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `JWT_SECRET`, `SUPABASE_JWKS_URL`, `MASTER_ENCRYPTION_KEY`, `DOCKER_HOST`, `REDIS_URL`, `REDIS_PASSWORD` before spawning untrusted code. You still put them in `.env`; the runtime guarantees they never reach a sandboxed snippet. Nothing for you to configure — just know it's enforced.

## 0.6 — Supabase production readiness (verify these are done)

The Phase-D live gate found these missing once before — confirm they're true now (Supabase dashboard / SQL editor):
- [ ] All `supabase/migrations/*.sql` applied to the hosted project (`supabase db push` or via dashboard).
  - **Note: `0004_role_grants.sql` is the service_role DML fix; it is already applied+verified on the hosted project (2026-06-13) — do NOT re-run.**
- [ ] **Custom access token hook enabled** — injects `tenant_id` into the JWT. Without it, every authenticated API call 401s with "no tenant."
- [ ] `service_role` has grants on all public tables (the 0004 migration).
- [ ] `bootstrap_user` execute granted to `service_role`.
- [ ] Generated types committed and matching migrations (`type-drift:check` is green — it is, as of the E gate).

## 0.7 — Create the Telegram bot (5 minutes, unblocks a gate line)

1. Open Telegram → @BotFather → `/newbot` → name it → copy the **bot token** into `TELEGRAM_BOT_TOKEN`.
2. Message your new bot once, then get your numeric id: open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `message.from.id` → put it in `TELEGRAM_ALLOW_FROM`.

## 0.8 — Vercel web (in parallel with Stage 0)

Vercel hosts the web at `https://jarvis.versalabs-studio.com`. This is independent of the VPS but needs to be done before the live gate:
1. Create (or import) the JARVIS web project in Vercel, attached to the `versalabs-studio.com` domain (wildcard).
2. Set `NEXT_PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com` in the Vercel project's env.
3. (Optional) Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the hosted Supabase values.
4. Push a deploy (or wait for the F1 commit's deploy hook to push).

---

# STAGE 1 — After the mesh reports F0 boot-smoke green

> Gate to enter Stage 1: mesh confirms `node dist/server.js` boots clean for **both** api and hermes in a container, F0 is merged to `develop`, and `phase/f-deploy` carries the F1 deploy infra.

## 1.1 — Pull the deploy-ready code
```bash
cd /opt/jarvis
git fetch origin
git checkout phase/f-deploy   # or develop, once F merges — confirm with me which to deploy
git pull
```

## 1.2 — Finalize `.env`
- Ensure every var from 0.5 is filled (no placeholder left).
- `chmod 600 .env`
- Sanity-check: `grep -c '=' .env` and skim for blanks.

## 1.3 — Add swap (cushion for co-tenant)
```bash
sudo /opt/jarvis/deploy/setup-swap.sh         # 2 GB default
# OR
sudo /opt/jarvis/deploy/setup-swap.sh 4       # 4 GB cushion
```
Idempotent. Re-runs are no-ops.

## 1.4 — Create volumes + build + bring up + boot-smoke
```bash
cd /opt/jarvis
docker volume create hermes-data
docker compose build                           # builds api + hermes (no web; no nginx)
docker compose up -d
sudo /opt/jarvis/deploy/boot-smoke.sh         # proves both node-booted services are live
```

The boot-smoke target:
- `docker compose config` validates
- All services reach `healthy` (no `restarting` / `unhealthy`)
- **api (Node):** `API listening on` in logs + `GET /health` → 200 + `GET /api/cms/workflows?page=1` → 401 with the real `UNAUTHENTICATED` envelope
- **hermes (Node):** `Hermes listening on` in logs + `GET /health` → 200 (in-container; hermes is internal-only)
- **redis (bonus):** `PING` → `PONG`
- **docker-socket-proxy (bonus):** `GET /_ping` → 200

If `api` or `hermes` is restart-looping here, **F0 is not actually fixed** — stop, capture `docker compose logs`, and route it back to the mesh. Do not proceed to TLS on a broken stack.

Quick sanity (manual):
```bash
docker compose ps                                  # no service in 'restarting'/'unhealthy'
docker compose logs --tail=50 api hermes           # no boot crash, no MODULE_NOT_FOUND
curl -fsS http://127.0.0.1:3001/health             # API → 200 (loopback)
curl -fsS http://127.0.0.1:3001/ready              # API → 200 (readiness; checks redis + Supabase)
docker compose exec hermes wget -qO- http://localhost:8765/health  # Hermes → 200 (internal)
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping     # → PONG
```

> **F2 read vs health.** `/health` is a fast liveness probe (the process is up). `/ready` is a readiness probe that pings outbound dependencies — redis (if `REDIS_URL`) and the hosted Supabase JWKS endpoint. 503 ⇒ not ready (orchestrator should not route traffic). Wire `/ready` into your load balancer / monitoring separately; docker compose healthchecks use `/health` (intentional, fast liveness).

## 1.5 — Issue TLS (requires DNS from 0.2 resolving to this box)
```bash
sudo /opt/jarvis/deploy/certbot-issue.sh
```

The script is idempotent:
1. Drops `nginx-jarvis-http.conf` (rate-limit zones + upstream) into `/etc/nginx/conf.d/jarvis-http.conf`
2. Drops `nginx-jarvis-server.conf` (80-vhost with ACME + redirect) into `/etc/nginx/conf.d/jarvis-80.conf`
3. `nginx -t && systemctl reload nginx`
4. `certbot certonly --webroot` for `api.jarvis.versalabs-studio.com` (skipped if cert already exists)
5. Drops `nginx-jarvis-https.conf` (443-vhost with TLS + reverse proxy + WS) into `/etc/nginx/conf.d/jarvis-https.conf`
6. `nginx -t && systemctl reload nginx`
7. Verifies with `curl -fsSI https://api.jarvis.versalabs-studio.com/health`

Then verify (must all pass before Stage 2):
```bash
curl -fsSI https://api.jarvis.versalabs-studio.com/health             # 200 over TLS (HSTS header present)
curl -fsSI http://api.jarvis.versalabs-studio.com/health              # 301 → https
curl -fsS  https://api.jarvis.versalabs-studio.com/api/cms/workflows?page=1  # 401 with the real auth envelope (proves api through nginx)
```

Confirm the response carries `Strict-Transport-Security` (HSTS).

---

# STAGE 2 — After the stack is healthy on TLS

## 2.1 — The §5.9 live go-live gate (this is the MVP gate)
Walk the Part 5 §5.9 checklist with me:
- [ ] Dashboard (Vercel) over TLS; login works; http→https redirect; HSTS present
- [ ] `https://api.jarvis.versalabs-studio.com/health` → 200; `/api/admin/health` (admin-auth) → 200; WS works through nginx (wss)
- [ ] Chat streams (< 3s to first token); services page shows real container statuses; restart works via socket-proxy
- [ ] Expo app connects to the VPS (not localhost) — `EXPO_PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com`; full mobile→Hermes→MCP round trip
- [ ] Telegram bot responds; cross-device (start on mobile, view on web)
- [ ] Security: unauth requests rejected; nginx rate-limit blocks a flood
- [ ] **Backup + restore drill:** `scripts/backup.sh` produces a `pg_dump` off-box; `scripts/restore.sh` restores it into a scratch DB successfully (this is a real drill, not a checkbox)
- [ ] Observability: a forced error lands in Sentry/GlitchTip; `/metrics` scrapes; logs in `system_logs`
- [ ] Load: 10 concurrent chats stable; dashboard < 2s
- [ ] Morning-audit cron scheduled and fires (verify the next 8 AM, or trigger manually once)
- [ ] CHANGELOG.md (v1.5.0) + README updated, committed, pushed

When §5.9 is green on the box, **v1.5 is shipped.** That's MVP.

---

## Rollback & safety net

- **Bad deploy:** `git checkout <previous-good-commit> && docker compose up -d --build` (RTO ≈ a few minutes). The stack is stateless except Redis + hermes-data; your DB is hosted Supabase, untouched by a code rollback.
- **Locked out by firewall:** use the provider's web console (Hetzner Cloud Console → the VM → Console) to log in. Do NOT enable `ufw` from there (RULE 2); instead, fix the Hetzner Cloud Firewall in the Hetzner console.
- **TLS won't issue:** confirm DNS resolves to the box AND ports 80/443 are open in the Hetzner Cloud Firewall (NOT ufw — RULE 2); certbot needs port 80 reachable for the ACME challenge.
- **DB safety:** never run `restore.sh` against the live project — restore into a scratch DB for the drill.

---

## Quick command reference

```bash
# Status
docker compose ps
docker compose logs --tail=100 -f hermes
# Restart one service
docker compose restart api
# Full bring-up / tear-down
docker compose up -d
docker compose down            # (keeps named volumes)
# Health (loopback — the vhost is the public face)
curl -fsS http://127.0.0.1:3001/health
# Health (TLS, through nginx — once certbot-issue.sh has run)
curl -fsSI https://api.jarvis.versalabs-studio.com/health
# Hermes health (internal — exec into the container)
docker compose exec hermes wget -qO- http://localhost:8765/health
# Cron sanity (after deploy)
docker compose exec hermes sh -c 'echo check the cron registry / BullMQ keys in redis'
```

---

## What I (Claude) can drive for you vs. what's only yours

| Task | Who |
|------|-----|
| Decide which IP is the real VPS; confirm the host-key change is a legitimate rebuild | **You** (security decision) |
| Point DNS; create Telegram bot; gather/enter secrets; OAuth consent screens; Vercel web deploy | **You** (creds & accounts) |
| Run the OS-hardening (`setup-vps.sh`), swap (`setup-swap.sh`), certbot (`certbot-issue.sh`), boot-smoke | **Me, over SSH** — once 0.1 is settled and you say go (I run them batch-by-batch, confirming each outward step), **or** you paste the blocks yourself |
| Approve `develop → main` promotion | **You** (architect) |

### Letting me drive (if you want it)
After you've settled 0.1, tell me: **(a)** the confirmed IP, **(b)** that the rebuild was intentional (so the host-key reset is safe), and **(c)** "go." I'll then:
1. Verify reachability with a read-only probe (`whoami`, OS, docker version).
2. Run Stage 0.3–0.5 + 1.3–1.5 in small batches, showing you output and pausing on anything outward-facing or destructive.
3. **Stop at the Stage 1/2 boundary** and not run the §5.9 live gate until you confirm the stack is healthy on TLS.

I cannot type into interactive prompts (sudo password, ssh passphrase, certbot questions) — so for me to drive, your SSH must be **key-based with no passphrase prompt**, and `sudo` should be passwordless for your user (or you run the `sudo` steps yourself and I do the rest). If either isn't true, the cleanest split is: you run the handful of `sudo`/interactive lines, I drive everything else.

---

*Phase F operator runbook — © 2026 Kidus Abdula / VersaLabs Studio. Stage 0 now; Stages 1–2 after F0. The app stack does not come up until `node dist` boots clean. F1 web-on-Vercel + co-tenancy rebuild is in the F1 commit on `phase/f-deploy`; see `docs/PHASE-F-F1-REBUILD-NOTES.md` for the architectural decision log.*
