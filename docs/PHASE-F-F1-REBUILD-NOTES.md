# Phase F F1 Rebuild — Architecture Decision Log

> **Date:** 2026-06-14
> **Author:** OpenCode mesh (Kidus's hands; Opus-authored handoff directive)
> **Supersedes:** the §5.2 dedicated-box F1 plan in `docs/PHASE-F-HANDOFF.md`
> **Reason:** the target VPS (`91.99.119.239`, host `pana`) is **NOT
> dedicated** — it co-hosts a live bare-metal ERPNext `bench`, and JARVIS's
> web deploys to **Vercel**, not the VPS. Both facts invalidate the
> dedicated-box assumptions in §5.2 (own 80/443 nginx + ufw allow-list).
> This doc is the architectural decision log for the rebuild.

---

## 1. The two facts that invalidated the §5.2 plan

### 1.1 Co-tenancy with ERPNext

`pana` is a Hetzner VPS running a live Frappe `bench` on the bare metal.
Audited footprint (from the Operator Guide §🔎 Box audit):

| Port / Service | Owner | Notes |
|----------------|-------|-------|
| `:80` | host nginx 1.18 (serving Frappe) | **owns** the public :80 |
| `:443` | (free) | nothing is listening — we get to install our cert |
| `:3306` | MariaDB (Frappe) | `127.0.0.1`-bound |
| `:8000` | gunicorn (Frappe) | bare-metal |
| `:8080`, `:9000` | socketio, Frappe realtime | **no ufw or we sever this** |
| `:11000`, `:13000` | Frappe Redis | `127.0.0.1`-bound |
| `:6379` | (free) | JARVIS's Redis is internal-only; no conflict either way |
| `ufw` | inactive | the host's Hetzner Cloud Firewall is the only layer-3 ACL |

The original §5.2 plan assumed a dedicated box and bound the JARVIS nginx
container to host `:80` and `:443`. That would have collided with the
host nginx. The §5.2 `setup-vps.sh` `ufw` block would have severed Frappe
on `:8080`/`:9000`. Both have to change.

### 1.2 Web on Vercel

Vercel hosts `https://jarvis.versalabs-studio.com` (wildcard ALIAS in
place). Reasons:

1. Next.js is the natural fit for Vercel (CDN, image optimization,
   edge functions, instant rollback). The VPS would be a slower, more
   expensive place to run it.
2. The Vercel wildcard ALIAS is already live; the web is the one surface
   that benefits most from the CDN.
3. The mobile app already points at `EXPO_PUBLIC_API_URL`; the Vercel
   project's `NEXT_PUBLIC_API_URL` is the same env, just set in the
   Vercel console instead of `.env`.

Consequence: the `web` service disappears from the VPS `docker-compose.yml`.
The only thing the VPS hosts is **api + hermes + supporting infrastructure
(redis, socket-proxy, mcp-*)** — and the host nginx vhost proxies
**only** the api surface to the public.

---

## 2. The seven changes from §5.2

| # | §5.2 (dedicated box) | F1 rebuild (co-tenant + Vercel) | Why |
|---|----------------------|----------------------------------|-----|
| 1 | `web` service in compose | **dropped** | Web deploys to Vercel |
| 2 | JARVIS nginx container binds host `:80` + `:443` | **dropped**; the host nginx vhost is the front door | Can't grab ports the host nginx already owns for Frappe |
| 3 | `api` host port map `3001:3000` | `127.0.0.1:3001:3001` | Loopback only; the vhost is the public face |
| 4 | `hermes` host port map `127.0.0.1:8765:8765` | **no host port** | Internal-only; reach from api via `http://hermes:8765` on the docker network |
| 5 | `redis` host port map `127.0.0.1:6379:6379` | **no host port** | Internal-only; no need to expose to host |
| 6 | `setup-vps.sh` `ufw` block | **dropped**; rely on Hetzner Cloud Firewall | `ufw` would sever Frappe's `:8080`/`:9000` |
| 7 | `services/nginx/nginx.conf` (the JARVIS nginx) | **deleted** | The host nginx vhost is the front door |

All other §5.2 items (rate-limit zones, mem_limits, healthchecks, the
socket-proxy 0.3.0 pin) are preserved.

---

## 3. The new layout

### 3.1 Container port binding

| Service | Host port | Container port | Why |
|---------|-----------|----------------|-----|
| `api` | `127.0.0.1:3001` | `3001` | Loopback only; the vhost fronts it |
| `hermes` | (none) | `8765` | Internal-only; reachable from api via `http://hermes:8765` |
| `redis` | (none) | `6379` | Internal-only; reachable from api + hermes via `redis://redis:6379` |
| `docker-socket-proxy` | (none) | `2375` | Internal-only; reachable from api + hermes via `http://docker-socket-proxy:2375` |
| `mcp-*` (6 services) | (none) | `8765` (each) | Internal-only; reachable from hermes via `http://mcp-<name>:8765` |

All services are on the `jarvis-internal` bridge network (the only
network in the compose).

### 3.2 Host nginx vhost

`deploy/nginx-jarvis-server.conf` (port 80) and `deploy/nginx-jarvis-https.conf`
(port 443) form the host nginx vhost for `api.jarvis.versalabs-studio.com`.
The http{} context additions (rate limit zones + upstream) are in
`deploy/nginx-jarvis-http.conf`. The three files are dropped into
`/etc/nginx/conf.d/jarvis-{http,80,https}.conf` by `deploy/certbot-issue.sh`.

| Path on host | Proxied to | Notes |
|--------------|-----------|-------|
| `/.well-known/acme-challenge/*` | `/var/www/certbot` | certbot ACME challenge (certbot-issue.sh) |
| `/health` (port 80 + 443) | `http://127.0.0.1:3001/health` | For monitoring; auth-free |
| `/api/*` (port 443) | `http://127.0.0.1:3001` | The main API surface |
| `/ws` (port 443) | `http://127.0.0.1:3001/ws` | WebSocket upgrade |
| Everything else | `444` (nginx drop) | Domain never serves a non-API surface |

TLS: Let's Encrypt (certbot) for `api.jarvis.versalabs-studio.com`. CAA
already permits `letsencrypt.org`. The certs are at
`/etc/letsencrypt/live/api.jarvis.versalabs-studio.com/`.

### 3.3 CORS

The Vercel web origin (`https://jarvis.versalabs-studio.com`) is the
only cross-origin caller in production. The API's CORS is driven by
`CORS_ORIGINS` (comma-separated) and is **REQUIRED in production** — the
Zod schema in `apps/api/src/lib/env.ts` fail-loud at boot if
`NODE_ENV=production && !CORS_ORIGINS` (a `.refine()` on the env schema).
Multiple origins (e.g. Vercel preview deployments) are supported by
comma-separating them.

### 3.4 Resource budget

| Component | mem_limit | Notes |
|-----------|-----------|-------|
| `api` | 512m | Fastify; nothing fancy |
| `hermes` | 1700m | §5.5 budget; bumped from the prior 512m in the F1 rebuild to accommodate the 29-skill loader + agentic loop |
| `redis` | 128m | `--maxmemory 128mb` matches |
| `docker-socket-proxy` | 64m | Tiny Go binary |
| `jarvis-mcp-base` | 96m | Build only |
| `mcp-github/notion/supabase/filesystem/gmail` | 128m each | Node stdio servers |
| `mcp-browser` | 512m | Chromium |
| **JARVIS total (no MCP)** | **~2.4 GB** | + Frappe's ~1.6 GB = 4 GB; fits in 5.7 GB free |
| **JARVIS total (all MCP)** | **~3.7 GB** | + Frappe = 5.3 GB; tight — add 2-4 GB swap |

The `setup-swap.sh` script (idempotent, 2-4 GB) is the cushion. Swappiness
is tuned to `10` (prefer RAM; consensus for app servers).

---

## 4. What F1 doesn't touch

- **Migration `0004_role_grants.sql`** — already applied+verified on the
  hosted project (2026-06-13). The migration is in the repo
  (`supabase/migrations/0004_role_grants.sql`) for fresh-dev replay, but
  the F1 deploy scripts **do not re-run it**. The directive is explicit.
- **`mcp-*` services** — unchanged from E3. Profile-gated; opt-in with
  `--profile mcp`. The operator wires the per-server `.env` files when
  the F4 creds arrive.
- **Vercel web deploy** — out of scope. Vercel console + git push.
- **F2 observability**, **F3 carry-forward ledger**, **F4 live integrations**,
  **F5 go-live gate** — Phase F work after F1.
- **Backup/restore (`scripts/backup.sh` / `restore.sh`)** — F-scope §5.6.

---

## 5. Open assumptions (flagged for the brain)

1. **Memory budget for hermes** — bumped to `1700m` to fit the 29-skill
   loader + agentic loop + tool dispatcher (F1 §5.5 budget). Tight
   without swap; the swap is the cushion. If a 10-concurrent-chat load
   test (F5 §5.9) OOMs hermes, the bump goes higher.
2. **CORS for the Vercel web only** — no Vercel preview deployments are
   in `CORS_ORIGINS` by default. Add them per-preview if the web team
   needs them. Mobile (`expo://localhost`, `exp://`) is not a CORS
   caller (it uses `EXPO_PUBLIC_API_URL` directly with no preflight).
3. **Hetzner Cloud Firewall** — assumed to allow `22/80/443` inbound and
   deny everything else. The operator guide has a row for this; the F1
   scripts do not touch it.
4. **Domain `api.jarvis.versalabs-studio.com`** — confirmed live by the
   2026-06-14 directive. The A-record points at `91.99.119.239`. If the
   box's public IP changes, the A-record changes with it; the F1 scripts
   do not embed the IP (the DNS is the source of truth).
5. **Mobile (Expo) `EXPO_PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com`**
   — set in the Expo project's env (EAS Build env or `app.json`); out of
   scope for F1.
6. **TLS cert auto-renewal** — `certbot renew` runs from `/etc/cron.daily/`
   (installed by the `certbot` Debian package). Renewal reloads nginx
   automatically via the `--deploy-hook` flag. The F1 scripts do not
   touch the cron; if the operator wants a custom deploy hook, they add it.

---

*F1 rebuild — supersedes the §5.2 dedicated-box plan; matches the
2026-06-14 directive. Boot-smoke target: both `api` and `hermes` must
show "listening" in their logs AND respond on their health endpoints.*
