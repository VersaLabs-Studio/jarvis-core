# JARVIS Production Deploy — Co-tenant VPS (Phase F F1)

> This directory contains the production deploy infrastructure for JARVIS on
> the **co-tenant VPS** (`91.99.119.239`, host `pana`). The box also runs a
> live bare-metal ERPNext `bench`. **The scripts here are designed for that
> constraint** — they do NOT touch the host's port 80/443 (the existing
> host nginx stays the front door), do NOT enable `ufw` (would sever Frappe's
> `:8080`/`:9000`), and JARVIS's `web` service deploys to **Vercel** (NOT
> this box), not to this compose.
>
> **You are reading this because you (or the mesh) are about to deploy JARVIS
> onto a box that is already running production workloads. Read the whole
> file once before running anything.**

---

## Architecture in one paragraph

```
                          Internet
                             │
                             ▼
                      ┌──────────────┐
                      │ Host nginx   │  nginx 1.18, owns :80 + :443
                      │ (pana)       │
                      │              │  ┌──────────────────────────────────┐
                      │              │  │  Frappe/ERPNext (bare metal)     │
                      │              │  │  http → :80, gunicorn :8000      │
                      │              │  │  socketio :9000, mariadb :3306   │
                      │              │  │  redis :11000 / :13000           │
                      │              │  └──────────────────────────────────┘
                      │              │
                      │              │  + jarvis-api vhost (this dir):
                      │              │    api.jarvis.versalabs-studio.com
                      │              │      → 127.0.0.1:3001 (api container)
                      │              │      → /ws WS upgrade
                      │              │
                      │  JARVIS box  │
                      └──────────────┘
                             │
                             │  127.0.0.1 (loopback only)
                             ▼
                      ┌──────────────┐
                      │ api (3001)   │  Fastify, host-bound 127.0.0.1 only
                      │ hermes (8765)│  INTERNAL ONLY — no host port
                      │ redis (6379) │  INTERNAL ONLY — no host port
                      │ socket-proxy │  INTERNAL ONLY — proxies docker.sock
                      │ mcp-*        │  INTERNAL ONLY, profile: mcp
                      └──────────────┘

                      + Vercel wildcard ALIAS
                        jarvis.versalabs-studio.com → Vercel (web only)
```

**The JARVIS app stack does NOT bind the host's port 80 or 443.** The host
nginx stays the single front door. JARVIS's `api` is bound to host
`127.0.0.1:3001` only; the host nginx vhost (deployed by `certbot-issue.sh`)
reverse-proxies `api.jarvis.versalabs-studio.com` to it. **JARVIS's `web`
service is in this directory's `docker-compose.yml`'s history but is NOT in
the current compose** — web deploys to Vercel
(`https://jarvis.versalabs-studio.com`).

---

## Files in this directory

| File | What it does | Run as |
|------|--------------|--------|
| `setup-vps.sh` | OS hardening (apt, Docker, fail2ban, unattended-upgrades, `/opt/jarvis`, nginx http{} include) | root |
| `setup-swap.sh` | Idempotent 2-4 GB swap file (cushion for co-tenant) | root |
| `boot-smoke.sh` | Brings up the stack; proves both node-booted services (api + hermes) are live | root or the deploy user |
| `certbot-issue.sh` | Idempotent Let's Encrypt cert for `api.jarvis.versalabs-studio.com` (ACME webroot; 80→443 vhost + reverse proxy) | root |
| `nginx-jarvis-http.conf` | http{} context additions (rate limit zones + upstream) — dropped into `/etc/nginx/conf.d/jarvis-http.conf` by `certbot-issue.sh` | (file, not run) |
| `nginx-jarvis-server.conf` | 80-vhost (ACME + redirect to 443) — dropped into `/etc/nginx/conf.d/jarvis-80.conf` by `certbot-issue.sh` | (file, not run) |
| `nginx-jarvis-https.conf` | 443-vhost (TLS + reverse proxy + WS upgrade) — dropped into `/etc/nginx/conf.d/jarvis-https.conf` by `certbot-issue.sh` | (file, not run) |

The old `nginx/nginx.conf` (dedicated-box nginx, in repo root) is **deleted**
— it owned ports 80/443 directly. The host nginx now handles that.

---

## The order of operations (do NOT skip steps)

```bash
# 0. You have:
#    - cloned the repo to /opt/jarvis
#    - created /opt/jarvis/.env (chmod 600) from .env.example
#    - DNS A-record for api.jarvis.versalabs-studio.com → 91.99.119.239
#
# 1. OS hardening (one-time; safe to re-run)
sudo /opt/jarvis/deploy/setup-vps.sh

# 2. Swap (cushion for co-tenant; idempotent)
sudo /opt/jarvis/deploy/setup-swap.sh           # 2 GB default
sudo /opt/jarvis/deploy/setup-swap.sh 4         # OR 4 GB if you prefer

# 3. Bring up the JARVIS app stack
cd /opt/jarvis
docker compose up -d

# 4. Boot-smoke (proves api + hermes are live end-to-end)
sudo /opt/jarvis/deploy/boot-smoke.sh

# 5. Issue TLS (requires DNS from step 0 to be live)
sudo /opt/jarvis/deploy/certbot-issue.sh
```

After step 5, `curl -fsSI https://api.jarvis.versalabs-studio.com/health`
should return 200 with a `Strict-Transport-Security` header.

---

## Why no `ufw`?

The VPS co-hosts Frappe/ERPNext on ports `:8080` and `:9000` (plus a bunch
of others; see the audit in `docs/PHASE-F-OPERATOR-GUIDE.md` §🔎 Box audit).
Enabling `ufw` with a JARVIS-style `22/80/443`-only allow-list would **sever
ERPNext's realtime/secondary ports** and break the live Frappe install. We
rely on the **Hetzner Cloud Firewall** (the cloud-level firewall in front
of the VM) for inbound restrictions; `setup-vps.sh` does not touch iptables
or nftables. The Hetzner Cloud Firewall should allow `22/80/443` inbound
and deny everything else; if it doesn't, set it up in the Hetzner Console.

## Why is `web` not in the compose?

Vercel hosts the web (`https://jarvis.versalabs-studio.com`). The VPS would
just be a slower, more expensive place to run Next.js, and the Vercel
wildcard ALIAS already points the domain there. The web's only env that
matters: `NEXT_PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com`
(set in the Vercel project's env, not here).

## Why are the JARVIS containers bound to 127.0.0.1?

The host nginx is the single front door. JARVIS's `api` listens on the host
loopback only; the host nginx vhost (deployed by `certbot-issue.sh`)
reverse-proxies `api.jarvis.versalabs-studio.com` to it. **If you curl
`http://<public-ip>:3001` from outside, you get nothing** — that's the
point. The 80/443 surface is exactly the vhost.

`hermes` and `redis` are **internal-only** (no host port). They are
reachable from the `api` container (and from other containers on the
`jarvis-internal` docker network) via the docker DNS names
(`http://hermes:8765`, `redis://redis:6379`). They are NOT reachable from
the host directly — use `docker compose exec` for local debugging.

---

## DNS you need before step 5

| Record | Name | Type | Value |
|--------|------|------|-------|
| A | `api.jarvis.versalabs-studio.com` | A | `91.99.119.239` |
| ALIAS (or CNAME) | `*.versalabs-studio.com` | ALIAS | Vercel (already in place) |
| ALIAS (or CNAME) | `versalabs-studio.com` | ALIAS | Vercel (already in place) |

The Vercel side: create a JARVIS project in Vercel, attach the
`versalabs-studio.com` domain (wildcard), and set
`NEXT_PUBLIC_API_URL=https://api.jarvis.versalabs-studio.com` in the
project's env. (Out of scope for this script — Vercel console.)

---

## What to do if a step fails

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `docker compose config` fails | YAML error | Re-check the modified `docker-compose.yml`; commit the diff |
| `api: 'API listening on' NOT in logs` | Crash on boot (env, migration) | `docker compose logs api --tail=100`; check for `MODULE_NOT_FOUND` / `permission denied` |
| `hermes: 'Hermes listening on' NOT in logs` | OpenRouter / skills load failure | `docker compose logs hermes --tail=100`; check for catalog fetch errors |
| `curl -f http://127.0.0.1:3001/health` refuses | Port map issue; api not bound to 127.0.0.1 | `docker compose ps api`; check the `PORTS` column shows `127.0.0.1:3001->3001/tcp` |
| certbot fails with `Error presenting challenge` | DNS not propagated | `nslookup api.jarvis.versalabs-studio.com`; wait for TTL |
| certbot fails with `http-01 challenge for api...` returning 404 | ACME location not in vhost | `cat /etc/nginx/conf.d/jarvis-80.conf`; check the `.well-known/acme-challenge` location |
| `nginx -t` fails | Conflicting vhost | Check `/etc/nginx/sites-enabled` for a `default` vhost; remove or rename |
| CORS errors from the Vercel web | `CORS_ORIGINS` env not set in API | `docker compose exec api env \| grep CORS`; the API fail-loud at boot if `CORS_ORIGINS` is unset in production — so the API won't be up at all. Check the API's logs. |

---

## What this is NOT

- This directory is NOT a complete infrastructure-as-code. It is a set of
  idempotent bash + nginx config files that an operator runs by hand.
- It does NOT manage secrets. Secrets live in `/opt/jarvis/.env` (chmod 600)
  which is gitignored.
- It does NOT manage backups. See `scripts/backup.sh` (F-scope, Phase F §5.6).
- It does NOT deploy Vercel. Vercel console + git push.
- It does NOT install OS packages other than Docker, nginx, certbot,
  fail2ban, unattended-upgrades. Anything else (`htop`, `jq`, `git`, `curl`,
  `wget`, `ca-certificates`, etc.) is a one-time `apt install` and
  pre-existing on most Debian/Ubuntu VPS images.
