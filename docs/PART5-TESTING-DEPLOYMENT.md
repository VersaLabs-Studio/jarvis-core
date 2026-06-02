# JARVIS v1.5 — Part 5: Testing, Deployment & Use Cases

> **System:** JARVIS — Autonomous SWE Workflow Platform  
> **Version:** 1.5.0  
> **Author:** Kidus Abdula — Lead Senior Software Engineer & Systems Architect  
> **Architectural Standard:** Architectural DNA v1.0.0  
> **Date:** June 2026  
> **Classification:** Implementation-Ready — Hand to Coding Agent

---

> [!IMPORTANT]
> This document is **Part 5 of 5** of the JARVIS v1.5 Master Architecture. It covers phase-by-phase testing, hardened VPS setup (TLS, socket-proxy, healthchecks, limits), backups, observability, the use-case catalog, timeline, and the go-live checklist.

### Document Index

| Part | Document | Contents |
|------|----------|----------|
| 1 | [PART1-SYSTEM-ARCHITECTURE.md](./PART1-SYSTEM-ARCHITECTURE.md) | VPS, Docker, Hermes, Nginx, Monorepo |
| 2 | [PART2-DATABASE-API.md](./PART2-DATABASE-API.md) | Schema, Generated Types, CRUD Factories, Contracts |
| 3 | [PART3-CLIENT-APPLICATIONS.md](./PART3-CLIENT-APPLICATIONS.md) | Design System, Factory Hooks, Next.js, Expo |
| 4 | [PART4-AGENT-SKILL-SYSTEM.md](./PART4-AGENT-SKILL-SYSTEM.md) | Skill Catalog, Hermes Contract, MCP Catalog, Socket Security |
| **→ 5** | **PART5-TESTING-DEPLOYMENT.md** | **Verification, TLS/Hardening, Backups, Observability, Use Cases** |

> [!NOTE]
> **Changes from the prior draft (audit-driven):** nginx `limit_req_zone` moved to the `http{}` block (fix B3); full TLS/SSL wiring + 80→443 + HSTS (fix B4); backup/restore + migration versioning (fix H5); light observability + error tracking (fix H6); healthchecks + `mem_limit` for all services (fix H7); single-VPS SPOF trade-off stated (fix H8); env-validation + load test added to the gate.

---

## 5.1 Testing & Verification Plan — Per Phase

### Phase A: Foundation Setup
**Build:** Turborepo monorepo, `packages/shared` (with **generated types**, Part 2 §2.0), `apps/api` skeleton, Docker Compose, Hermes + socket-proxy containers.

```
[ ] pnpm install completes; turbo build + turbo typecheck pass (zero errors)
[ ] supabase gen types produces packages/shared/src/types/database.types.ts (committed)
[ ] CI drift guard passes (generated types match migrations — Part 2 §2.0)
[ ] docker compose config validates (no YAML errors)
[ ] docker compose up -d starts hermes, redis, nginx, docker-socket-proxy
[ ] hermes reaches "healthy" within 30s; redis-cli ping → PONG
[ ] socket-proxy reachable from api network; raw docker.sock NOT mounted in api/hermes/web
[ ] curl http://localhost:8765/health → 200 (Hermes)
[ ] Env validation: API refuses to boot with a missing required var (Part 2 §2.5)
```

### Phase B: API Server + Hermes Bridge
**Build:** Fastify server, env validation, **CRUD factory** (Part 2 §2.4), explicit non-CRUD routes, Hermes bridge, WebSocket handler + auth handshake, Supabase client.

```
[ ] GET /health → { ok:true, hermes:"connected", redis:"connected", db:"connected" }
[ ] Supabase signUp + POST /api/auth/bootstrap creates tenant + profile in one tx
[ ] JWT verification: protected routes → 401 without/with bad token, 200 with valid
[ ] tenant_id claim present in JWT (custom access token hook enabled — Part 2 §2.2)
[ ] CRUD factory: workflows/integrations/skills all support list/get/create/update/delete
[ ] Pagination contract honored: { data, page, pageSize, total, hasMore }
[ ] Error envelope honored: 422 returns { ok:false, error:{ code:"VALIDATION", details } }
[ ] WS: connect to /ws?token=… succeeds; bad token → close code 4401
[ ] Chat streaming: send → chunks → done; final message persisted to chat_messages
[ ] Services via socket-proxy: list + restart jarvis-redis actually restarts it
[ ] Integration secret sealed: secret_ciphertext populated, plaintext never returned
[ ] Rate limiting: 31st request/min → 429 RATE_LIMITED
```

### Phase C: Next.js Web Dashboard
**Build:** 10 pages, design system, Supabase auth, **factory hooks** (Part 3 §3.2), WS client.

```
[ ] next build → zero warnings; tsc --noEmit → zero errors (strict)
[ ] Login authenticates via Supabase; session stored; protected pages gated
[ ] All 10 pages render with REAL API data (no mock data), no hydration errors
[ ] Factory hooks: create/update/delete a workflow → list auto-invalidates
[ ] Chat: streaming response renders live; tool-call indicators show on MCP use
[ ] Services: restart button reflects real container state (verify docker ps)
[ ] Logs: real-time SSE entries appear without refresh
[ ] NO hardcoded colors — grep returns ZERO (see command below)
[ ] Every data view has skeleton + empty + error states; Framer Motion on mount
```
```bash
# Hardcoded-color gate (must return ZERO)
grep -rn "bg-white\|bg-black\|text-white\|text-black\|text-gray-" \
  apps/web/app apps/web/components --include="*.tsx" --include="*.ts"
```

### Phase D: Expo Mobile App
**Build:** 4-tab nav, chat streaming, dashboard, workflows, settings, push, SecureStore session.

```
[ ] expo start launches; app loads in Expo Go (iOS/Android)
[ ] Supabase auth; session in SecureStore (not plaintext AsyncStorage)
[ ] Dashboard shows real status; pull-to-refresh works
[ ] Chat: send → streaming response; quick-command chips send
[ ] Workflows: list from API; trigger executes
[ ] Push: receives a test notification (WS `notification` event)
[ ] Deep link jarvis://chat opens chat tab; tsc --noEmit zero errors
```

### Phase E: Skills & Workflows
**Build:** 18 workflow skill docs + 11 foundational (Part 4 §4.1–4.2), workflow DB records, cron.

```
[ ] All 18 workflow skill documents valid + loaded by Hermes (GET /v1/skills)
[ ] "morning audit" via chat → real GitHub/Notion/Gmail summary
[ ] "ship feature X" → branch + PR created (never pushes to main directly)
[ ] "deploy to Vercel" → Vercel hosted MCP confirms deployment
[ ] Cron morning audit fires 8AM → notifies chat + Telegram
[ ] Skill auto-create on novel task; auto-refine after 3+ uses
[ ] Each MCP server responds to a tool call (POST /v1/mcp/test per server)
[ ] Sub-agent spawning: complex task → isolated sub-agent → result collected
```

### Phase F: Full Deployment & Polish
**Build:** VPS deploy, TLS, end-to-end, backups verified, observability live, docs updated.

```
[ ] git push → VPS git pull → docker compose up -d; all services healthy
[ ] https://<domain> serves dashboard over TLS (valid cert); http→https redirect works
[ ] https://<domain>/api/admin/health → ok; WS works through Nginx (wss)
[ ] Expo app connects to the VPS (not localhost); full mobile→Hermes→MCP round trip
[ ] Telegram bot responds; cross-device (start on mobile, view on web)
[ ] Security: unauth requests rejected; Nginx rate-limit blocks floods; HSTS header present
[ ] Backup: scripts/backup.sh produces a restorable pg_dump off-box (restore tested)
[ ] Observability: errors appear in Sentry/GlitchTip; /metrics scrapes; logs in system_logs
[ ] Perf: chat starts streaming < 3s; dashboard loads < 2s; 10 concurrent chats stable
```

---

## 5.2 Hardened Compose Additions

> [!IMPORTANT]
> These supersede the relevant parts of Part 1 §1.4: add the **socket-proxy**, **TLS on nginx**, **healthchecks for web + nginx**, and **`mem_limit` on every service**. Direct `docker.sock` mounts on `api`/`hermes` are removed (Part 4 §4.5).

```yaml
  docker-socket-proxy:
    image: tecnativa/docker-socket-proxy:0.3.0
    container_name: jarvis-socket-proxy
    restart: unless-stopped
    environment:
      - CONTAINERS=1      # list/inspect/stats/logs
      - POST=1            # allow start/stop/restart
      - EXEC=0
      - IMAGES=0
      - VOLUMES=0
      - NETWORKS=0
      - BUILD=0
      - INFO=1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    read_only: true
    mem_limit: 64m
    networks: [jarvis-network]

  # api: replace the docker.sock mount with → DOCKER_HOST=tcp://docker-socket-proxy:2375
  #      add: mem_limit: 512m  (and remove the /var/run/docker.sock volume)
  # hermes: remove the docker.sock mount; rely on its own sandbox (Part 1 §1.5); mem_limit: 1700m

  web:
    # ...existing...
    mem_limit: 600m
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: jarvis-nginx
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./services/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./services/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./services/nginx/ssl:/etc/nginx/ssl:ro          # certbot output
      - ./services/nginx/certbot-www:/var/www/certbot:ro
    mem_limit: 96m
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
    depends_on: [web, api]
    networks: [jarvis-network]
```

### Nginx — corrected (fix B3 + B4)

`limit_req_zone` belongs in `http{}`, not `server{}`. TLS terminates on 443; 80 redirects (except the ACME challenge path).

```nginx
# services/nginx/nginx.conf  (http context)
http {
    limit_req_zone $binary_remote_addr zone=api:10m  rate=30r/m;
    limit_req_zone $binary_remote_addr zone=chat:10m rate=10r/m;
    include /etc/nginx/conf.d/*.conf;
}
```
```nginx
# services/nginx/conf.d/default.conf
upstream api_backend { server api:3001; }
upstream web_backend { server web:3000; }

# 80 → ACME + redirect
server {
    listen 80;
    server_name _;
    location /healthz { return 200 'ok'; add_header Content-Type text/plain; }
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

# 443 — TLS
server {
    listen 443 ssl;
    http2 on;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 256;

    location /api/chat/ {
        limit_req zone=chat burst=5 nodelay;
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /ws {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
    location / {
        proxy_pass http://web_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **Domain note:** TLS needs a DNS name (Let's Encrypt won't issue for a bare IP). Point a domain (e.g. `jarvis.versalabs.dev`) at `91.99.119.239`. Until then, run HTTP-only and treat TLS as a Phase F gate.

---

## 5.3 VPS Setup Script (hardened)

### File: `scripts/setup-vps.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
echo "JARVIS v1.5 — VPS Setup"

# 1. System
apt update && apt upgrade -y

# 2. Docker + Compose v2
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
apt install -y docker-compose-plugin

# 3. Tooling
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git curl wget htop jq ufw fail2ban
npm install -g pnpm@9.15.0

# 4. Firewall (deny-by-default)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp 80/tcp 443/tcp
ufw --force enable

# 5. fail2ban for SSH brute force
systemctl enable --now fail2ban

# 6. Unattended security updates
apt install -y unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

# 7. Project
mkdir -p /opt/jarvis && cd /opt/jarvis
git clone git@github.com:kidusabdula/jarvis-core.git .
cp .env.example .env
echo "⚠️  Edit /opt/jarvis/.env with production credentials, then: docker compose up -d"

# 8. Volumes + bring-up
docker volume create hermes-data; docker volume create redis-data
docker compose up -d
echo "Setup complete. TLS: run scripts/ssl-setup.sh after pointing DNS at this host."
```

### File: `scripts/ssl-setup.sh` (Let's Encrypt, one-time)
```bash
#!/usr/bin/env bash
set -euo pipefail
DOMAIN="${1:?usage: ssl-setup.sh <domain>}"
docker run --rm -v "$PWD/services/nginx/ssl:/etc/letsencrypt" \
  -v "$PWD/services/nginx/certbot-www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --agree-tos -m kidus489@gmail.com -n
# Symlink/copy fullchain.pem + privkey.pem into services/nginx/ssl/, then: docker compose restart nginx
# Renewal: a weekly cron runs `certbot renew` + `docker compose restart nginx`.
```

---

## 5.4 Observability (Audit fix H6 — light, single-VPS)

| Concern | Mechanism | Where |
|---------|-----------|-------|
| Structured logs | `pino` JSON logs → also written to `system_logs` | `apps/api` + Hermes |
| Error tracking | Sentry or self-hosted **GlitchTip** (free) | API + web + mobile DSN |
| Metrics | `/metrics` (Prometheus text) — request count/latency, model spend, container health | `apps/api` |
| Uptime | external ping on `/api/admin/health` (UptimeRobot free) + Telegram alert | external |
| Health aggregation | `/api/admin/health` rolls up hermes/redis/db/mcp/socket-proxy | `apps/api` |

No Grafana/Loki stack at this scale — it would blow the RAM budget. Revisit if/when multi-VPS.

---

## 5.5 Use Cases — Complete Catalog

### For You (Kidus — SWE Workflow)

| # | Use Case | Command | What Happens |
|---|----------|---------|-------------|
| 1 | Morning briefing | *Auto 8AM cron* | GitHub (PRs/issues/commits) + Notion + Gmail → summary to phone + Telegram |
| 2 | Ship a feature | "Ship feature: add dark mode toggle" | Plan → implement → test → PR → Vercel preview → Notion → notify |
| 3 | Fix a bug | "Fix issue #42 on jarvis-core" | Read issue → analyze → fix → PR with explanation → tests |
| 4 | Deploy to production | "Deploy jarvis-core to VPS" | SSH → git pull → compose up → health check → rollback if unhealthy |
| 5 | Deploy frontend | "Deploy web dashboard to Vercel" | Build → Vercel hosted MCP → verify → share URL |
| 6 | Code review | "Review PR #15 on pavilion360" | Diff → DNA Code Review skill → blockers + suggestions |
| 7 | Architecture audit | "Audit the Pana ERP codebase" | DNA Auditor skill → scored report (X.X/10) |
| 8 | Research a library | "Compare Drizzle vs Prisma for our stack" | Browser MCP → docs → comparison table → Notion |
| 9 | Write documentation | "Update JARVIS architecture docs in Notion" | Read codebase → updated docs → push to Notion |
| 10 | Create a proposal | "Create proposal for client ABC" | Research → structure → document → Notion → optional email |
| 11 | Email response | "Draft reply to John's email about the deadline" | Read thread → draft → review → send |
| 12 | Weekly review | *Auto Mon 9AM cron* | Commits, PRs merged, tasks done → report → send |
| 13 | Database migration | "Add a `tags` column to events" | SQL migration → regenerate types → update Zod → PR (Part 2 §2.9) |
| 14 | Set up new project | "Initialize a new Next.js project 'ClientX'" | Repo → DNA scaffold → Vercel → Notion workspace |
| 15 | Monitor system health | "How are my services doing?" | Check containers → status/uptime/resources → flag issues |

### For SaaS Users (by industry)

#### Software Development Teams
| # | Use Case | What JARVIS Does |
|---|----------|-----------------|
| 1 | Automated code review | Reviews PRs against team standards → posts comments |
| 2 | Sprint planning | Reads backlog → estimates → suggests sprint composition |
| 3 | CI/CD monitoring | Monitors builds → notifies failures → suggests fixes |
| 4 | Tech-debt tracking | Periodic audit → accumulated-debt report |
| 5 | Onboarding automation | Generates docs → sets up accounts → assigns starter tasks |

#### Digital Marketing Agencies
| # | Use Case | What JARVIS Does |
|---|----------|-----------------|
| 6 | Content calendar | Ideas → schedule → track performance |
| 7 | SEO audit | Crawl client sites → issues → fix reports |
| 8 | Client reporting | Pull analytics → monthly reports → email |
| 9 | Social drafting | Trends → drafts → schedule |
| 10 | Competitor analysis | Monitor sites/social → weekly intel |

#### Freelancers & Consultants
| # | Use Case | What JARVIS Does |
|---|----------|-----------------|
| 11 | Time tracking & invoicing | Log time → invoices → email |
| 12 | Proposal generation | RFP → custom proposal → PDF |
| 13 | Client communication | Status updates → check-ins → follow-ups |
| 14 | Portfolio management | Update portfolio → SEO |
| 15 | Tax documentation | Organize receipts → quarterly summaries |

#### E-Commerce Businesses
| # | Use Case | What JARVIS Does |
|---|----------|-----------------|
| 16 | Listing optimization | Analyze → improve titles/descriptions → A/B |
| 17 | Inventory alerts | Monitor stock → reorder suggestions |
| 18 | Review analysis | Read reviews → trends → action items |
| 19 | Pricing intelligence | Monitor competitor prices → adjust |
| 20 | Fulfillment tracking | Monitor orders → flag delays → notify |

#### Content Creators
| # | Use Case | What JARVIS Does |
|---|----------|-----------------|
| 21 | Blog generation | Research → outline → write → SEO → publish |
| 22 | Newsletter | Curate → draft → schedule |
| 23 | Video scripts | Research → script → teleprompter format |
| 24 | Asset generation | Prompts → assets → platform formats |
| 25 | Engagement analytics | Track performance → top performers → optimize |

#### Students & Researchers
| # | Use Case | What JARVIS Does |
|---|----------|-----------------|
| 26 | Research assistance | Search sources → notes → outlines |
| 27 | Citation management | Format → bibliography |
| 28 | Study scheduling | Syllabus → study plan → reminders |
| 29 | Data analysis | Process → stats → visualize |
| 30 | Presentations | Research → slide outlines → speaker notes |

---

## 5.6 Backup, Restore & Migration Strategy (Audit fix H5)

| Concern | Mechanism |
|---------|-----------|
| Schema changes | Versioned `supabase/migrations/*.sql` (append-only); applied via `supabase db push` (Part 2 §2.9) |
| DB backup | `scripts/backup.sh`: nightly `pg_dump` → gzip → off-box (Supabase Storage bucket or S3-compatible); 14-day retention |
| Config backup | `.env` (sealed), Hermes `memory.db`, skill docs → same off-box target |
| Restore | `scripts/restore.sh <dump>`: provision DB → apply migrations → `pg_restore` data → re-seal secrets |
| Verify | Restore drill run during Phase F (checklist) and monthly thereafter |

```bash
# scripts/backup.sh (cron: 0 3 * * *)
set -euo pipefail
TS=$(date +%Y%m%d-%H%M)
pg_dump "$SUPABASE_DB_URL" | gzip > "/tmp/jarvis-$TS.sql.gz"
# upload off-box (rclone/aws/supabase storage), then prune >14d
```

---

## 5.7 Reliability Posture — Stated Trade-offs (Audit fix H8)

| Property | v1.5 posture | Recovery path | Revisit |
|----------|--------------|---------------|---------|
| Compute | **Single VPS — single point of failure** (accepted for a personal/single-user tool) | Rebuild from `docker compose up -d` + restore from §5.6 backup (RTO ≈ 30 min) | Multi-node / managed host at SaaS scale |
| Database | Supabase managed (their HA) | Supabase PITR (paid) or §5.6 `pg_dump` | — |
| Secrets | AES-256-GCM env key (Part 2 §2.6) | Re-seal on key rotation | Supabase Vault / KMS |
| Deploy | Manual `git pull` + compose | Roll back to previous commit + `compose up` | GitHub Actions CD with health gate |

These are **documented decisions**, not blind spots — each has a named upgrade path.

---

## 5.8 Implementation Timeline

| Phase | Duration | Deliverables | Phase Gate |
|-------|----------|-------------|------------|
| **A: Foundation** | Days 1–3 | Turborepo, generated types, Docker Compose, Hermes + socket-proxy, Redis | All containers healthy; `turbo build` + type-drift guard pass |
| **B: API + Bridge** | Days 3–7 | Fastify, env validation, CRUD factory, non-CRUD routes, WS auth, Hermes bridge, migrations applied | Chat → Hermes → response end-to-end; factory CRUD works |
| **C: Web Dashboard** | Days 7–14 | 10 pages, factory hooks, real data, dark theme, motion | All pages real-data; zero TS/color-gate violations |
| **D: Mobile App** | Days 14–21 | 4-tab Expo, chat streaming, push, SecureStore | Phone → streaming response |
| **E: Skills & Workflows** | Days 21–25 | 18 workflow + 11 foundational skills, cron, MCP verified | "morning audit" + "ship feature" work end-to-end |
| **F: Deploy & Polish** | Days 25–30 | VPS deploy, TLS, backups verified, observability live, docs | Full system on the VPS over TLS; mobile connects; restore drill passes |

---

## 5.9 Go-Live Checklist

```
Pre-Deploy:
[ ] Phases A–E verified locally
[ ] .env prepared (all required vars; MASTER_ENCRYPTION_KEY + JWT_SECRET set)
[ ] Migrations applied; custom access token hook enabled; types generated & committed
[ ] 18 workflow + 11 foundational skill docs written
[ ] DNS name pointed at the VPS (for TLS)
[ ] setup-vps.sh tested on fresh Ubuntu 22.04

Deploy:
[ ] SSH in → scripts/setup-vps.sh → edit .env → docker compose up -d
[ ] scripts/ssl-setup.sh <domain> → docker compose restart nginx
[ ] docker compose ps — all healthy (incl. web, nginx, socket-proxy)
[ ] curl https://<domain>/api/admin/health → ok

Post-Deploy:
[ ] Dashboard over TLS; login works; http→https redirect; HSTS present
[ ] Chat streams; services page shows real statuses; restart works (via socket-proxy)
[ ] Expo connects to VPS; cross-device works; Telegram responds
[ ] Backup runs + restore drill passes; errors land in Sentry/GlitchTip
[ ] Morning audit cron scheduled (docker compose exec hermes hermes cron list)

Post-Launch:
[ ] Monitor 24h; verify 8AM audit next day
[ ] Load test: 10 concurrent chats stable
[ ] Update CHANGELOG.md (v1.5.0) + README.md; commit & push docs
```

---

> [!TIP]
> **For the coding agent:** execute Part 1 → Part 5, Phase A → Phase F, in order. Verify each phase gate before proceeding. The DNA Six Pillars apply to all code. Where Parts 2–5 supersede Part 1 (single source of truth, socket-proxy, TLS), the later instruction wins — Part 1 will be reconciled to match. Consult `ARCHITECTURE-AUDIT.md` for the rationale behind each hardening decision.

---

> **← Previous:** [Part 4: Agent & Skill System](./PART4-AGENT-SKILL-SYSTEM.md)

---

*JARVIS v1.5 Master Architecture Document — Part 5 of 5*  
*© 2026 Kidus Abdula / VersaLabs Studio. All rights reserved.*
