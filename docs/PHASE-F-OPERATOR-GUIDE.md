# Phase F — Operator Runbook (for Kidus, personal)

> This is **your** step-by-step guide, separate from `PHASE-F-HANDOFF.md` (which is for the OpenCode mesh). That one says *what to build*; this one says *what you do with your hands* to get v1.5 onto the VPS. Read it top to bottom once before you start.
>
> Written by the Opus brain, 2026-06-13. Reflects the current architecture (hosted Supabase, Hermes sandbox, socket-proxy) — not the stale `.env.example`.

---

## ⛔ Two ground rules — internalize these before anything else

**RULE 1 — Do NOT bring up the application stack until F0 is merged to `develop`.**
The current build crashes on boot (`@jarvis/shared` ships raw TypeScript; `node dist/server.js` cannot load it — both `api` and `hermes` die immediately). Running `docker compose up -d` on the full stack today gives you a restart-looping mess and tells you nothing. **Everything in Stage 0 below is safe to do now** because it's OS/DNS/secret prep that never starts the broken app. The app stack waits for Stage 1.

**RULE 2 — Never run `ufw enable` before allowing SSH.**
Always `ufw allow 22/tcp` **first**. If you enable the firewall with SSH not allowed, you lock yourself out of your own box and have to use the provider's web console to recover. The order in Stage 0.3 is correct — don't reorder it.

---

## The three stages (mental model)

```
STAGE 0  (NOW — runs in parallel with the mesh building F0)
  Resolve VPS identity + host key · DNS · OS hardening · clone repo · gather secrets · Supabase prod-readiness · Telegram bot
        │
        ▼   (wait here until: mesh reports F0 boot-smoke green AND phase/f-deploy is ready)
STAGE 1  (AFTER F0)
  Pull · finalize .env · build images · docker compose up -d · health checks
        │
        ▼
STAGE 2  (AFTER the stack is healthy on HTTP)
  TLS (certbot) · the §5.9 live go-live gate · backup+restore drill · load test · flip to MVP
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

TLS will not issue for a bare IP — Let's Encrypt needs a name. Point a domain at the **confirmed** VPS IP:
- Create an `A` record: `jarvis.versalabs.dev` → `<confirmed VPS IP>` (TTL 300 while setting up).
- Optionally a second `A` record for a bare/`www` as you prefer.
- Verify propagation before Stage 2: `nslookup jarvis.versalabs.dev` should return your IP.

DNS can take minutes to hours to propagate — that's why it's step one.

## 0.3 — VPS OS hardening (safe now; no app involved)

The mesh will formalize this as `scripts/setup-vps.sh` (it doesn't exist yet — only `deploy.sh`/`health-check.sh` do). You can run the equivalent now. SSH in as a user with sudo, then:

```bash
# 1. System updates
sudo apt update && sudo apt upgrade -y

# 2. Docker Engine + Compose v2 (official convenience script)
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # log out/in after this so 'docker' works without sudo

# 3. Base tooling
sudo apt install -y git curl wget htop jq ufw fail2ban unattended-upgrades

# 4. FIREWALL — allow SSH BEFORE enabling (RULE 2)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose          # confirm 22/80/443 allowed, default deny incoming

# 5. SSH brute-force protection
sudo systemctl enable --now fail2ban

# 6. Automatic security updates
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
```

> **If your VPS provider also has a cloud firewall** (Hetzner Cloud Firewall, etc.), it sits in front of `ufw` — make sure 22/80/443 are open there too, or the box is unreachable regardless of `ufw`.

## 0.4 — Clone the repo on the VPS

```bash
sudo mkdir -p /opt/jarvis && sudo chown "$USER":"$USER" /opt/jarvis
cd /opt/jarvis
git clone git@github.com:kidusabdula/jarvis-core.git .
git checkout develop          # you'll pull the F0 merge here in Stage 1
```
This needs the VPS's SSH deploy key registered on GitHub (or use an HTTPS clone with a PAT). Cloning now is harmless — you're just staging the code; you won't `compose up` until Stage 1.

## 0.5 — Gather production secrets (the authoritative list)

⚠️ The committed `.env.example` is **stale** (Phase-A, assumes self-hosted Supabase). Ignore it. Gather **these** instead — this is the real set the current architecture needs. Create `/opt/jarvis/.env` with them (chmod 600; never commit).

**Supabase (hosted — project `rofvgnvhmwsgrqewcbci`):**
- `SUPABASE_URL=https://rofvgnvhmwsgrqewcbci.supabase.co`
- `SUPABASE_ANON_KEY=` — Supabase dashboard → Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY=` — same page (⚠️ server-only; never in web/mobile/sandbox)
- `SUPABASE_JWKS_URL=https://rofvgnvhmwsgrqewcbci.supabase.co/auth/v1/.well-known/jwks.json`
- `DATABASE_URL=` — the Postgres connection string (Settings → Database) — used by `backup.sh` `pg_dump`

**Auth / crypto (generate strong, ≥32 chars):**
- `JWT_SECRET=` — must match what Supabase signs with (or your API's verification config)
- `MASTER_ENCRYPTION_KEY=` — AES-256-GCM key for sealing integration secrets (Part 2 §2.6). Generate: `openssl rand -base64 32`

**LLM:**
- `OPENROUTER_API_KEY=` — openrouter.ai dashboard

**Redis (the cron/BullMQ + queue backend):**
- `REDIS_URL=redis://:<password>@redis:6379`
- `REDIS_PASSWORD=` — `openssl rand -base64 24`

**Hermes service auth (loopback factory writes):**
- `HERMES_SERVICE_TOKEN=` — shared secret the cron uses on `POST /api/cms/workflow_runs`. Generate: `openssl rand -hex 32`

**MCP credentials (live integrations — F4):**
- `GITHUB_TOKEN=` — fine-grained or classic PAT, scopes: `repo`, `workflow`, `read:org`
- `NOTION_API_KEY=` — Notion integration token (share the relevant pages with the integration)
- `VERCEL_TOKEN=` — or the OAuth flow when the mesh wires it
- Gmail: OAuth client creds (F4 — keep flagged until you trust the community server)
- Linear: OAuth (F4)

**Telegram (notifications):**
- `TELEGRAM_BOT_TOKEN=` — from @BotFather (Stage 0.7)
- `TELEGRAM_ALLOW_FROM=` — your numeric Telegram user/chat id (allowlist)

**App / runtime:**
- `NODE_ENV=production`
- `SITE_URL=https://jarvis.versalabs.dev` (your domain — used for auth redirects)

**Observability (F2 — optional but recommended):**
- `SENTRY_DSN=` or `GLITCHTIP_DSN=`

> **Forbidden-to-sandbox set (FYI, no action):** Hermes deliberately strips `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `JWT_SECRET`, `SUPABASE_JWKS_URL`, `MASTER_ENCRYPTION_KEY`, `DOCKER_HOST`, `REDIS_URL`, `REDIS_PASSWORD` before spawning untrusted code. You still put them in `.env`; the runtime guarantees they never reach a sandboxed snippet. Nothing for you to configure — just know it's enforced.

## 0.6 — Supabase production readiness (verify these are done)

The Phase-D live gate found these missing once before — confirm they're true now (Supabase dashboard / SQL editor):
- [ ] All `supabase/migrations/*.sql` applied to the hosted project (`supabase db push` or via dashboard).
- [ ] **Custom access token hook enabled** — injects `tenant_id` into the JWT. Without it, every authenticated API call 401s with "no tenant."
- [ ] `service_role` has grants on `tenants` / `profiles`; `bootstrap_user` execute granted to `service_role`.
- [ ] Generated types committed and matching migrations (`type-drift:check` is green — it is, as of the E gate).

## 0.7 — Create the Telegram bot (5 minutes, unblocks a gate line)

1. Open Telegram → @BotFather → `/newbot` → name it → copy the **bot token** into `TELEGRAM_BOT_TOKEN`.
2. Message your new bot once, then get your numeric id: open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `message.from.id` → put it in `TELEGRAM_ALLOW_FROM`.

---

# STAGE 1 — After the mesh reports F0 boot-smoke green

> Gate to enter Stage 1: mesh confirms `node dist/server.js` boots clean for **both** api and hermes in a container, F0 is merged to `develop`, and `phase/f-deploy` carries the deploy infra (F1).

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

## 1.3 — Create volumes + build + bring up
```bash
docker volume create hermes-data
docker volume create redis-data
docker compose build            # builds api/web/hermes/mcp images (now boots clean post-F0)
docker compose up -d
docker compose ps               # ALL services should reach 'healthy' (not 'restarting')
```

## 1.4 — Health checks (must all pass before Stage 2)
```bash
docker compose ps                                  # no service in 'restarting'/'unhealthy'
docker compose logs --tail=50 api hermes           # no boot crash, no MODULE_NOT_FOUND
curl -fsS http://localhost:8765/health             # Hermes → 200 + model + uptime
curl -fsS http://localhost:3001/api/admin/health   # API rollup → ok (hermes/redis/db/mcp)
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping   # → PONG
```
If `api` or `hermes` is restart-looping here, **F0 is not actually fixed** — stop, capture `docker compose logs`, and route it back to the mesh. Do not proceed to TLS on a broken stack.

---

# STAGE 2 — After the stack is healthy on HTTP

## 2.1 — TLS (needs DNS from 0.2 resolving to this box)
The mesh builds `scripts/ssl-setup.sh` + the nginx 443 config (F1). Once present:
```bash
cd /opt/jarvis
./scripts/ssl-setup.sh jarvis.versalabs.dev      # certbot webroot issue
docker compose restart nginx
```
Then verify:
```bash
curl -fsSI https://jarvis.versalabs.dev            # 200 over TLS
curl -fsSI http://jarvis.versalabs.dev             # 301 → https
curl -fsS  https://jarvis.versalabs.dev/api/admin/health   # ok through nginx
```
Confirm the response carries `Strict-Transport-Security` (HSTS).

## 2.2 — The §5.9 live go-live gate (this is the MVP gate)
Walk the Part 5 §5.9 checklist with me:
- [ ] Dashboard over TLS; login works; http→https redirect; HSTS present
- [ ] Chat streams (< 3s to first token); services page shows real container statuses; restart works via socket-proxy
- [ ] Expo app connects to the VPS (not localhost) — `EXPO_PUBLIC_API_URL=https://jarvis.versalabs.dev`; full mobile→Hermes→MCP round trip
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
- **Locked out by firewall:** use the provider's web console (Hetzner Cloud Console → the VM → Console) to log in and `sudo ufw allow 22/tcp`.
- **TLS won't issue:** confirm DNS resolves to the box AND ports 80/443 are open in BOTH `ufw` and any provider cloud firewall; certbot needs port 80 reachable for the ACME challenge.
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
# Health
curl -fsS http://localhost:8765/health
curl -fsS http://localhost:3001/api/admin/health
# Cron sanity (after deploy)
docker compose exec hermes sh -c 'echo check the cron registry / BullMQ keys in redis'
```

---

## What I (Claude) can drive for you vs. what's only yours

| Task | Who |
|------|-----|
| Decide which IP is the real VPS; confirm the host-key change is a legitimate rebuild | **You** (security decision) |
| Point DNS; create Telegram bot; gather/enter secrets; OAuth consent screens | **You** (creds & accounts) |
| Run the OS-hardening commands (0.3), clone (0.4), health checks, TLS | **Me, over SSH** — once 0.1 is settled and you say go (I run them batch-by-batch, confirming each outward step), **or** you paste the blocks yourself |
| Approve `develop → main` promotion | **You** (architect) |

### Letting me drive (if you want it)
After you've settled 0.1, tell me: **(a)** the confirmed IP, **(b)** that the rebuild was intentional (so the host-key reset is safe), and **(c)** "go." I'll then:
1. Verify reachability with a read-only probe (`whoami`, OS, docker version).
2. Run Stage 0.3–0.4 in small batches, showing you output and pausing on anything outward-facing or destructive.
3. **Stop at the Stage 0/1 boundary** and not bring up the app stack until you confirm F0 is merged.

I cannot type into interactive prompts (sudo password, ssh passphrase, certbot questions) — so for me to drive, your SSH must be **key-based with no passphrase prompt**, and `sudo` should be passwordless for your user (or you run the `sudo` steps yourself and I do the rest). If either isn't true, the cleanest split is: you run the handful of `sudo`/interactive lines, I drive everything else.

---

*Phase F operator runbook — © 2026 Kidus Abdula / VersaLabs Studio. Stage 0 now; Stages 1–2 after F0. The app stack does not come up until `node dist` boots clean.*
