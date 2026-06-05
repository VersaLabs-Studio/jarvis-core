# JARVIS v1.5 — Part 1: System Architecture & Infrastructure

> **System:** JARVIS — Autonomous SWE Workflow Platform  
> **Version:** 1.5.0  
> **Author:** Kidus Abdula — Lead Senior Software Engineer & Systems Architect  
> **Architectural Standard:** Architectural DNA v1.0.0  
> **Date:** June 2026  
> **Classification:** Implementation-Ready — Hand to Coding Agent

---

> [!IMPORTANT]
> This document is **Part 1 of 5** of the JARVIS v1.5 Master Architecture. It is written as instruction-level documentation for a coding agent. Every file, schema, config, and command is specified. Follow it exactly. The Six Pillars of the Architectural DNA govern all implementation.

### Document Index

| Part | Document | Contents |
|------|----------|----------|
| **→ 1** | **PART1-SYSTEM-ARCHITECTURE.md** | **VPS, Docker, Hermes, Nginx, Monorepo** |
| 2 | [PART2-DATABASE-API.md](./PART2-DATABASE-API.md) | Supabase Schema, API Routes, WebSocket Events |
| 3 | [PART3-CLIENT-APPLICATIONS.md](./PART3-CLIENT-APPLICATIONS.md) | Next.js Dashboard, Expo Mobile, Design System |
| 4 | [PART4-AGENT-SKILL-SYSTEM.md](./PART4-AGENT-SKILL-SYSTEM.md) | Agent Migration, Hermes Skills, MCP Catalog |
| 5 | [PART5-TESTING-DEPLOYMENT.md](./PART5-TESTING-DEPLOYMENT.md) | Verification, VPS Setup, Use Cases, Timeline |

---
## 1.1 System Overview

JARVIS v1.5 is a complete ground-up rebuild. The previous OpenClaw-based architecture (v1.0–1.1) is fully deprecated. Every file from the old system is nuked. This is a fresh monorepo.

### What Changed

| Component | v1.0–1.1 (Old) | v1.5 (New) |
|-----------|----------------|------------|
| Core Brain | OpenClaw Gateway | **Hermes Agent** (Nous Research) |
| Primary Interface | Telegram Bot | **Expo React Native App + Next.js Dashboard** |
| API Layer | None (bash scripts) | **Fastify API Server** (Node.js) |
| Database | None | **Supabase** (hosted → self-hosted later) |
| Cache/Realtime | None | **Redis 7** |
| Reverse Proxy | None | **Nginx + SSL** |
| Monorepo Tool | None | **Turborepo + pnpm** |
| Model Router | OpenClaw YAML | **Hermes built-in** (OpenRouter) |
| MCP Servers | Docker containers | **Docker containers** (preserved pattern) |
| Deployment | Manual SSH + bash | **Docker Compose v2** (single command) |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                      │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Expo Mobile App  │  │  Next.js Web     │  │  Telegram /      │          │
│  │  (iOS / Android)  │  │  Dashboard       │  │  WhatsApp        │          │
│  │                    │  │                  │  │  (via Hermes)    │          │
│  │  • Chat (primary)  │  │  • Dashboard     │  │                  │          │
│  │  • Dashboard       │  │  • Chat          │  │  • Chat          │          │
│  │  • Workflows       │  │  • Services      │  │  • Commands      │          │
│  │  • Settings        │  │  • Models        │  │                  │          │
│  │                    │  │  • Integrations  │  │                  │          │
│  │  Expo Go (dev)     │  │  • Workflows     │  │                  │          │
│  │  EAS Build (prod)  │  │  • Logs          │  │                  │          │
│  │                    │  │  • Config        │  │                  │          │
│  │                    │  │  • Analytics     │  │                  │          │
│  │                    │  │  • Admin         │  │                  │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │ REST + WS           │ REST + WS            │ Hermes Gateway     │
└───────────┼─────────────────────┼──────────────────────┼────────────────────┘
            │                     │                      │
            ▼                     ▼                      │
┌─────────────────────────────────────────────┐          │
│              NGINX REVERSE PROXY             │          │
│  Port 80/443 → TLS termination               │          │
│  /          → web:3000  (Next.js)            │          │
│  /api/*     → api:3001  (Fastify)            │          │
│  /ws        → api:3001  (WebSocket upgrade)  │          │
└──────────────────────┬──────────────────────┘          │
                       │                                  │
        ┌──────────────┼──────────────────────────────────┤
        ▼              ▼                                  ▼
┌──────────────┐ ┌──────────────┐              ┌──────────────────┐
│  FASTIFY API │ │  NEXT.JS WEB │              │  HERMES AGENT    │
│  (api:3001)  │ │  (web:3000)  │              │  (hermes:8765)   │
│              │ │              │              │                  │
│  Routes:     │ │  App Router  │         ┌───│  • Memory (SQLite)│
│  • /auth     │ │  10 pages    │         │   │  • Skills         │
│  • /chat     │ │  SSR + CSR   │         │   │  • Sub-agents     │
│  • /services │ └──────────────┘         │   │  • Model routing  │
│  • /models   │                          │   │  • Learning loop  │
│  • /workflows│    Hermes Bridge ────────┘   │  • Cron scheduler │
│  • /integ.   │                              │                   │
│  • /logs     │                              │  Gateways:        │
│  • /analytics│                              │  • API (port 8765)│
│  • /admin    │                              │  • Telegram       │
│              │                              │  • WhatsApp       │
│  WebSocket:  │                              │                   │
│  • Streaming │                              │  Terminal Backend: │
│  • Events    │                              │  • Docker sandbox  │
└──────┬───────┘                              └────────┬──────────┘
       │                                               │
       ▼                                               ▼
┌──────────────┐ ┌──────────────┐  ┌───────────────────────────────────────┐
│  SUPABASE    │ │  REDIS 7     │  │         MCP INTEGRATION LAYER         │
│  (hosted)    │ │  (redis:6379)│  │                                       │
│              │ │              │  │  ┌────────┐ ┌────────┐ ┌────────┐    │
│  • Auth      │ │  • Pub/Sub   │  │  │ GitHub │ │ Vercel │ │ Notion │    │
│  • Postgres  │ │  • Cache     │  │  │  MCP   │ │  MCP   │ │  MCP   │    │
│  • Realtime  │ │  • Sessions  │  │  └────────┘ └────────┘ └────────┘    │
│  • Storage   │ │  • Queues    │  │  ┌────────┐ ┌────────┐ ┌────────┐    │
│              │ │              │  │  │Browser │ │ Gmail  │ │Supabase│    │
└──────────────┘ └──────────────┘  │  │  MCP   │ │  MCP   │ │  MCP   │    │
                                    │  └────────┘ └────────┘ └────────┘    │
                                    │  ┌────────┐ ┌────────┐ ┌────────┐    │
                                    │  │Filesys │ │  Slack │ │ Linear │    │
                                    │  │  MCP   │ │  MCP   │ │  MCP   │    │
                                    │  └────────┘ └────────┘ └────────┘    │
                                    └───────────────────────────────────────┘
```

---

## 1.2 VPS Specifications

| Property | Value |
|----------|-------|
| **Provider** | Yegara |
| **IP Address** | `91.99.119.239` |
| **OS** | Ubuntu 22.04.5 LTS |
| **CPU** | 4 Cores (Intel) |
| **RAM** | 8 GB |
| **Storage** | 80 GB NVMe SSD |
| **Transfer** | 20 TB |
| **SSH Access** | `ssh root@91.99.119.239` (ed25519 key) |

### Resource Budget

| Service | RAM (est.) | CPU (est.) | Disk |
|---------|-----------|-----------|------|
| Hermes Agent | 1.5 GB | 0.5 cores | 2 GB |
| Fastify API | 256 MB | 0.3 cores | 100 MB |
| Next.js Web | 512 MB | 0.5 cores | 500 MB |
| Redis | 128 MB | 0.1 cores | 50 MB |
| Nginx | 64 MB | 0.1 cores | 20 MB |
| MCP Servers (6×) | 1.2 GB | 0.6 cores | 300 MB |
| Docker overhead | 512 MB | 0.2 cores | 2 GB |
| OS + system | 1.5 GB | 0.5 cores | 10 GB |
| **Total** | **~5.7 GB** | **~2.8 cores** | **~15 GB** |
| **Available** | **8 GB** | **4 cores** | **80 GB** |
| **Headroom** | **2.3 GB** | **1.2 cores** | **65 GB** |

---

## 1.3 Monorepo Structure (Turborepo + pnpm)

```
jarvis-core/                              # Root
├── apps/
│   ├── api/                              # Fastify API server
│   │   ├── src/
│   │   │   ├── server.ts                 # Entry point — Fastify setup
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts               # POST /api/auth/login, /register, /refresh
│   │   │   │   ├── chat.ts               # POST /api/chat/send, GET /api/chat/history
│   │   │   │   ├── services.ts           # GET/POST /api/services
│   │   │   │   ├── models.ts             # GET/PUT /api/models
│   │   │   │   ├── workflows.ts          # GET/POST /api/workflows, POST /api/workflows/:id/trigger
│   │   │   │   ├── integrations.ts       # GET/POST /api/integrations
│   │   │   │   ├── logs.ts               # GET /api/logs (SSE stream)
│   │   │   │   ├── analytics.ts          # GET /api/analytics
│   │   │   │   └── admin.ts              # GET/POST /api/admin
│   │   │   ├── services/
│   │   │   │   ├── hermes.ts             # Hermes Agent bridge (HTTP + WS to port 8765)
│   │   │   │   ├── docker.ts             # Docker Engine API via unix socket
│   │   │   │   ├── mcp-manager.ts        # MCP server lifecycle management
│   │   │   │   └── scheduler.ts          # Cron job management (node-cron)
│   │   │   ├── websocket/
│   │   │   │   ├── handler.ts            # WS connection manager
│   │   │   │   └── events.ts             # Event type definitions (ChatStream, LogStream, etc.)
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts               # JWT verification (Supabase JWT)
│   │   │   │   └── tenant.ts             # Multi-tenant context injection
│   │   │   └── db/
│   │   │       ├── client.ts             # Supabase client initialization
│   │   │       └── types.ts              # Re-exports generated types (NO hand-written schema — Part 2 §2.0)
│   │   ├── Dockerfile                    # Multi-stage Node.js build
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                              # Next.js web dashboard
│   │   ├── app/
│   │   │   ├── layout.tsx                # Root layout (fonts, theme, sidebar)
│   │   │   ├── page.tsx                  # Redirect to /dashboard
│   │   │   ├── login/
│   │   │   │   └── page.tsx              # Auth screen
│   │   │   ├── (dashboard)/              # Protected route group
│   │   │   │   ├── layout.tsx            # Dashboard shell (sidebar + header)
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx          # Main dashboard
│   │   │   │   ├── chat/
│   │   │   │   │   └── page.tsx          # Full chat interface
│   │   │   │   ├── services/
│   │   │   │   │   └── page.tsx          # Service management
│   │   │   │   ├── models/
│   │   │   │   │   └── page.tsx          # Model routing config
│   │   │   │   ├── integrations/
│   │   │   │   │   └── page.tsx          # MCP integrations
│   │   │   │   ├── workflows/
│   │   │   │   │   └── page.tsx          # Workflow management
│   │   │   │   ├── logs/
│   │   │   │   │   └── page.tsx          # Real-time log viewer
│   │   │   │   ├── config/
│   │   │   │   │   └── page.tsx          # Config editor
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx          # Usage analytics
│   │   │   │   └── admin/
│   │   │   │       └── page.tsx          # System admin
│   │   │   └── api/                      # Next.js API routes (auth callbacks only)
│   │   │       └── auth/
│   │   │           └── callback/
│   │   │               └── route.ts
│   │   ├── components/
│   │   │   ├── ui/                       # Primitive design system (Radix-based)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── data-table.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── toast.tsx             # Sonner wrapper
│   │   │   │   └── ...
│   │   │   ├── shared/                   # Smart shared components
│   │   │   │   ├── sidebar.tsx           # Main navigation sidebar
│   │   │   │   ├── header.tsx            # Page header with breadcrumbs
│   │   │   │   ├── page-header.tsx       # Title + description + action
│   │   │   │   ├── stat-card.tsx         # Metric card with trend
│   │   │   │   ├── status-badge.tsx      # Health/status indicator
│   │   │   │   ├── glass-card.tsx        # Glassmorphism card wrapper
│   │   │   │   ├── empty-state.tsx       # Empty state with CTA
│   │   │   │   ├── error-state.tsx       # Error display
│   │   │   │   └── chat-bubble.tsx       # Chat message component
│   │   │   └── dashboard/               # Dashboard-specific composed components
│   │   │       ├── service-health.tsx
│   │   │       ├── model-usage.tsx
│   │   │       ├── activity-feed.tsx
│   │   │       ├── quick-actions.tsx
│   │   │       └── workflow-card.tsx
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-websocket.ts
│   │   │   └── use-theme.ts
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts             # Browser Supabase client
│   │   │   │   └── server.ts             # Server Supabase client
│   │   │   ├── api.ts                    # Fetch wrapper for Fastify API
│   │   │   ├── motion.ts                 # Framer Motion constants
│   │   │   ├── query-keys.ts             # TanStack Query key factory
│   │   │   └── utils.ts                  # Formatting, date, number utils
│   │   ├── styles/
│   │   │   └── globals.css               # OKLCH theme tokens + Tailwind
│   │   ├── Dockerfile                    # Multi-stage Next.js build
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                           # Expo React Native app
│       ├── app/
│       │   ├── _layout.tsx               # Root layout (auth check, providers)
│       │   ├── login.tsx                 # Auth screen
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx           # Tab navigator
│       │   │   ├── index.tsx             # Dashboard tab
│       │   │   ├── chat.tsx              # Chat tab (primary)
│       │   │   ├── workflows.tsx         # Workflows tab
│       │   │   └── settings.tsx          # Settings tab
│       │   └── (modals)/
│       │       ├── workflow-detail.tsx
│       │       └── service-detail.tsx
│       ├── components/
│       │   ├── ChatInput.tsx
│       │   ├── ChatBubble.tsx
│       │   ├── DashboardCard.tsx
│       │   ├── WorkflowCard.tsx
│       │   ├── StatusIndicator.tsx
│       │   └── QuickCommandChip.tsx
│       ├── hooks/
│       │   ├── useChat.ts
│       │   ├── useServices.ts
│       │   ├── useWorkflows.ts
│       │   └── useAuth.ts
│       ├── lib/
│       │   ├── api.ts                    # API client (shared base URL)
│       │   ├── websocket.ts              # WS client with reconnect
│       │   └── storage.ts               # SecureStore for tokens
│       ├── constants/
│       │   └── theme.ts                  # Dark theme tokens matching web
│       ├── app.json
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared/                           # Shared TypeScript types & utils
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── chat.ts               # ChatMessage, ChatSession, StreamEvent
│   │   │   │   ├── service.ts            # Service, ServiceHealth, ContainerStatus
│   │   │   │   ├── workflow.ts           # Workflow, WorkflowRun, CronSchedule
│   │   │   │   ├── model.ts              # ModelConfig, RoutingRule, ModelUsage
│   │   │   │   ├── integration.ts        # Integration, MCPServer, MCPTool
│   │   │   │   ├── user.ts              # User, Tenant, AuthSession
│   │   │   │   ├── analytics.ts          # AnalyticsEvent, UsageStats
│   │   │   │   └── index.ts             # Barrel export
│   │   │   ├── schemas/
│   │   │   │   ├── chat.schema.ts        # Zod schemas for chat types
│   │   │   │   ├── workflow.schema.ts    # Zod schemas for workflow types
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── models.ts             # Model definitions, fallback chains
│   │   │   │   ├── services.ts           # Service name/port mappings
│   │   │   │   └── events.ts             # WebSocket event names
│   │   │   └── utils/
│   │   │       ├── formatting.ts         # Number, date, time formatting
│   │   │       └── validation.ts         # Shared validation helpers
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                           # Shared config (TS, ESLint, Prettier)
│       ├── tsconfig.base.json
│       ├── eslint.config.mjs
│       └── package.json
│
├── services/                             # Infrastructure configs
│   ├── hermes/
│   │   ├── config.yaml                   # Hermes Agent configuration
│   │   ├── skills/                       # Hermes skill documents (see Part 4)
│   │   │   ├── ship-feature.md
│   │   │   ├── morning-audit.md
│   │   │   ├── debug-and-fix.md
│   │   │   ├── deploy-to-vercel.md
│   │   │   ├── deploy-to-vps.md
│   │   │   ├── notion-update.md
│   │   │   ├── create-proposal.md
│   │   │   ├── code-review.md
│   │   │   ├── github-pr-workflow.md
│   │   │   ├── research-and-report.md
│   │   │   ├── email-draft.md
│   │   │   ├── project-onboard.md
│   │   │   ├── content-creation.md
│   │   │   ├── invoice-generation.md
│   │   │   ├── data-analysis.md
│   │   │   ├── seo-audit.md
│   │   │   ├── api-integration.md
│   │   │   └── client-report.md
│   │   └── Dockerfile                    # Hermes container customizations
│   │
│   ├── mcp/                              # MCP server configs
│   │   ├── github/
│   │   │   └── config.yaml
│   │   ├── vercel/
│   │   │   └── config.yaml
│   │   ├── notion/
│   │   │   └── config.yaml
│   │   ├── browser/
│   │   │   └── config.yaml
│   │   ├── gmail/
│   │   │   └── config.yaml
│   │   ├── supabase/
│   │   │   └── config.yaml
│   │   ├── filesystem/
│   │   │   └── config.yaml
│   │   ├── slack/
│   │   │   └── config.yaml
│   │   └── linear/
│   │       └── config.yaml
│   │
│   └── nginx/
│       ├── nginx.conf                    # Reverse proxy config
│       ├── conf.d/
│       │   └── default.conf              # Server block
│       └── ssl/                          # Certificates (generated on VPS)
│
├── scripts/
│   ├── setup-vps.sh                      # One-time VPS provisioning
│   ├── deploy.sh                         # Full deployment script
│   ├── health-check.sh                   # System health check
│   ├── backup.sh                         # Database + config backup
│   └── ssl-setup.sh                      # Let's Encrypt SSL
│
├── docs/
│   ├── ARCHITECTURAL_DNA.md              # Governing engineering standard (v1.0)
│   ├── PART1-SYSTEM-ARCHITECTURE.md      # This document
│   ├── PART2-DATABASE-API.md             # Schema, types, factories, contracts
│   ├── PART3-CLIENT-APPLICATIONS.md      # Web, mobile, design system
│   ├── PART4-AGENT-SKILL-SYSTEM.md       # Skills, Hermes contract, MCP catalog
│   ├── PART5-TESTING-DEPLOYMENT.md       # Testing, TLS, backups, use cases
│   ├── ARCHITECTURE-AUDIT.md             # DNA-compliance + robustness audit
│   └── CHANGELOG.md                      # Version history
│
├── supabase/
│   └── migrations/                       # SINGLE SOURCE OF TRUTH for the schema (Part 2 §2.0)
│
├── docker-compose.yml                    # Full service orchestration
├── docker-compose.dev.yml                # Development overrides
├── turbo.json                            # Turborepo task definitions
├── pnpm-workspace.yaml                   # pnpm workspace config
├── package.json                          # Root workspace package.json
├── .env.example                          # Environment variable template
├── .gitignore                            # Git exclusions
└── README.md                             # Project overview
```

---

## 1.4 Docker Compose — Complete Service Definitions

> [!IMPORTANT]
> **Superseded by hardening (see audit).** The base definitions below are the starting point. Three changes from Parts 4–5 are **mandatory** and override what is shown here:
> 1. **No container mounts `/var/run/docker.sock` directly.** The raw-socket mounts on `hermes` and `api` are removed; container control goes through a least-privilege **`docker-socket-proxy`** (Part 4 §4.5). The API sets `DOCKER_HOST=tcp://docker-socket-proxy:2375`.
> 2. **Nginx terminates TLS on 443** with an 80→443 redirect + HSTS; `limit_req_zone` lives in the `http{}` block (Part 5 §5.2). The base nginx block here is HTTP-only scaffolding.
> 3. **Every service gets a `mem_limit`; `web` and `nginx` get healthchecks** (Part 5 §5.2).

### File: `docker-compose.yml`

```yaml
version: "3.9"

networks:
  jarvis-network:
    driver: bridge

volumes:
  hermes-data:
    driver: local
  redis-data:
    driver: local

services:
  # ═══════════════════════════════════════════════════════
  # CORE SERVICES
  # ═══════════════════════════════════════════════════════

  hermes:
    image: nousresearch/hermes-agent:latest
    container_name: jarvis-hermes
    restart: unless-stopped
    volumes:
      - hermes-data:/opt/data
      - ./services/hermes/config.yaml:/opt/data/config.yaml:ro
      - ./services/hermes/skills:/opt/data/skills:ro
      - /var/run/docker.sock:/var/run/docker.sock   # Docker terminal backend
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    ports:
      - "127.0.0.1:8765:8765"     # API gateway (internal only)
    networks:
      - jarvis-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8765/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: jarvis-api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3001
      - HERMES_URL=http://hermes:8765
      - REDIS_URL=redis://redis:6379
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "127.0.0.1:3001:3001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock   # Docker management
    depends_on:
      hermes:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - jarvis-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 15s
      timeout: 5s
      retries: 3

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: jarvis-web
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://api:3001
      - NEXT_PUBLIC_WS_URL=ws://api:3001
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - jarvis-network

  redis:
    image: redis:7-alpine
    container_name: jarvis-redis
    restart: unless-stopped
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - jarvis-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: jarvis-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./services/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./services/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./services/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
      - api
    networks:
      - jarvis-network

  # ═══════════════════════════════════════════════════════
  # MCP SERVERS
  # ═══════════════════════════════════════════════════════

  mcp-github:
    image: node:20-slim
    container_name: jarvis-mcp-github
    restart: unless-stopped
    command: npx -y @modelcontextprotocol/server-github
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    networks:
      - jarvis-network
    profiles:
      - mcp
      - all

  mcp-vercel:
    image: node:20-slim
    container_name: jarvis-mcp-vercel
    restart: unless-stopped
    command: npx -y @vercel/mcp-server
    environment:
      - VERCEL_TOKEN=${VERCEL_TOKEN}
    networks:
      - jarvis-network
    profiles:
      - mcp
      - all

  mcp-notion:
    image: node:20-slim
    container_name: jarvis-mcp-notion
    restart: unless-stopped
    command: npx -y @notionhq/notion-mcp-server
    environment:
      - NOTION_API_KEY=${NOTION_API_KEY}
    networks:
      - jarvis-network
    profiles:
      - mcp
      - all

  mcp-browser:
    image: node:20-slim
    container_name: jarvis-mcp-browser
    restart: unless-stopped
    command: npx -y @anthropic/mcp-server-browser
    networks:
      - jarvis-network
    profiles:
      - mcp
      - all

  mcp-gmail:
    image: node:20-slim
    container_name: jarvis-mcp-gmail
    restart: unless-stopped
    command: npx -y @modelcontextprotocol/server-gmail
    environment:
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GOOGLE_REFRESH_TOKEN=${GOOGLE_REFRESH_TOKEN}
    networks:
      - jarvis-network
    profiles:
      - mcp-gmail
      - all

  mcp-supabase:
    image: node:20-slim
    container_name: jarvis-mcp-supabase
    restart: unless-stopped
    command: npx -y @supabase/mcp-server
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    networks:
      - jarvis-network
    profiles:
      - mcp
      - all

  mcp-filesystem:
    image: node:20-slim
    container_name: jarvis-mcp-filesystem
    restart: unless-stopped
    command: npx -y @modelcontextprotocol/server-filesystem /workspace
    volumes:
      - ./:/workspace:rw
    networks:
      - jarvis-network
    profiles:
      - mcp
      - all

  mcp-slack:
    image: node:20-slim
    container_name: jarvis-mcp-slack
    restart: unless-stopped
    command: npx -y @anthropic/mcp-server-slack
    environment:
      - SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
    networks:
      - jarvis-network
    profiles:
      - mcp-slack
      - all

  mcp-linear:
    image: node:20-slim
    container_name: jarvis-mcp-linear
    restart: unless-stopped
    command: npx -y @anthropic/mcp-server-linear
    environment:
      - LINEAR_API_KEY=${LINEAR_API_KEY}
    networks:
      - jarvis-network
    profiles:
      - mcp-linear
      - all
```

---

## 1.5 Hermes Agent Configuration

### File: `services/hermes/config.yaml`

```yaml
# ═══════════════════════════════════════════════════════
# JARVIS v1.5 — Hermes Agent Configuration
# ═══════════════════════════════════════════════════════

identity:
  name: "JARVIS"
  description: >
    Autonomous SWE workflow agent for VersaLabs Studio.
    Built by Kidus Abdula. I orchestrate coding, deployment,
    documentation, communication, and project management
    through natural language commands. I learn and improve
    with every task completed.

# ─── Model Routing ────────────────────────────────────
provider:
  type: openrouter
  api_key: "${OPENROUTER_API_KEY}"
  default_model: "nvidia/nemotron-3-super-120b-a12b:free"

  routing:
    planning:
      primary: "nvidia/nemotron-3-super-120b-a12b:free"
      fallback:
        - "zhipu/glm-5-turbo"
        - "minimax/minimax-m2-5:free"
    coding:
      primary: "nvidia/nemotron-3-super-120b-a12b:free"
      fallback:
        - "zhipu/glm-5-turbo"
        - "minimax/minimax-m2-5:free"
    office:
      primary: "minimax/minimax-m2-5:free"
      fallback:
        - "nvidia/nemotron-3-super-120b-a12b:free"
    fast:
      primary: "zhipu/glm-5-turbo"
      fallback:
        - "minimax/minimax-m2-5:free"
    audit:
      primary: "nvidia/nemotron-3-super-120b-a12b:free"

  budget:
    total_credits: 20.00
    max_daily_spend: 0.50
    prefer_free: true

# ─── Terminal Backend ────────────────────────────────
terminal:
  backend: docker
  image: "node:20-slim"
  timeout: 300
  max_concurrent: 3

# ─── Memory ──────────────────────────────────────────
memory:
  backend: sqlite
  path: /opt/data/memory.db
  max_context_messages: 50

# ─── Skills ──────────────────────────────────────────
skills:
  auto_create: true
  auto_refine: true
  directory: /opt/data/skills/
  min_usage_before_refine: 3

# ─── Gateways ────────────────────────────────────────
gateways:
  - type: api
    port: 8765
    cors_origins:
      - "http://localhost:3000"
      - "http://localhost:3001"
      - "http://91.99.119.239"

  - type: telegram
    bot_token: "${TELEGRAM_BOT_TOKEN}"
    allowed_users:
      - 343865518

# ─── MCP Servers ─────────────────────────────────────
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_TOKEN: "${GITHUB_TOKEN}"

  vercel:
    command: "npx"
    args: ["-y", "@vercel/mcp-server"]
    env:
      VERCEL_TOKEN: "${VERCEL_TOKEN}"

  notion:
    command: "npx"
    args: ["-y", "@notionhq/notion-mcp-server"]
    env:
      NOTION_API_KEY: "${NOTION_API_KEY}"

  browser:
    command: "npx"
    args: ["-y", "@anthropic/mcp-server-browser"]

  supabase:
    command: "npx"
    args: ["-y", "@supabase/mcp-server"]
    env:
      SUPABASE_URL: "${SUPABASE_URL}"
      SUPABASE_SERVICE_KEY: "${SUPABASE_SERVICE_KEY}"

  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]

# ─── Cron Schedules ──────────────────────────────────
cron:
  morning_audit:
    schedule: "0 8 * * *"          # 8:00 AM daily
    skill: "morning-audit"
    notify:
      - telegram
      - api

  weekly_review:
    schedule: "0 9 * * 1"          # Monday 9:00 AM
    skill: "research-and-report"
    args:
      topic: "Weekly progress review"
    notify:
      - telegram
      - api
```

---

## 1.6 Nginx Reverse Proxy Configuration

### File: `services/nginx/conf.d/default.conf`

```nginx
upstream api_backend {
    server api:3001;
}

upstream web_backend {
    server web:3000;
}

server {
    listen 80;
    server_name 91.99.119.239;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=chat:10m rate=10r/m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Chat API (stricter rate limit)
    location /api/chat/ {
        limit_req zone=chat burst=5 nodelay;
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;     # 24h keep-alive
    }

    # Web dashboard (default)
    location / {
        proxy_pass http://web_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 1.7 Environment Variables

### File: `.env.example`

```bash
# ═══════════════════════════════════════════════════════
# JARVIS v1.5 — Environment Variables
# ═══════════════════════════════════════════════════════

# ─── Core ─────────────────────────────────────────────
NODE_ENV=production
JWT_SECRET=                          # Generate: openssl rand -base64 32

# ─── Supabase ─────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# ─── OpenRouter ───────────────────────────────────────
OPENROUTER_API_KEY=

# ─── GitHub ───────────────────────────────────────────
GITHUB_TOKEN=

# ─── Vercel ───────────────────────────────────────────
VERCEL_TOKEN=

# ─── Notion ───────────────────────────────────────────
NOTION_API_KEY=

# ─── Google / Gmail ───────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# ─── Telegram ─────────────────────────────────────────
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USERS=343865518

# ─── Optional MCP Integrations ───────────────────────
SLACK_BOT_TOKEN=
LINEAR_API_KEY=

# ─── Ports (internal) ────────────────────────────────
API_PORT=3001
WEB_PORT=3000
HERMES_PORT=8765
REDIS_PORT=6379
```

---

## 1.8 Turborepo Configuration

### File: `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

### File: `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### File: `package.json` (root)

```json
{
  "name": "jarvis-core",
  "version": "1.5.0",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "dev:api": "turbo dev --filter=@jarvis/api",
    "dev:web": "turbo dev --filter=@jarvis/web",
    "dev:mobile": "cd apps/mobile && npx expo start",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f",
    "deploy": "bash scripts/deploy.sh"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "@jarvis/config": "workspace:*"
  },
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## 1.9 How OpenCode / ClaudeCode Integrates With This System

> [!IMPORTANT]
> **Your local development workflow does NOT change.** OpenCode and ClaudeCode continue to work exactly as they do today — they are your local coding harness. JARVIS is the remote autonomous agent. They complement each other.

### The Two Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  YOUR LOCAL MACHINE (Windows/WSL)                                 │
│                                                                    │
│  VS Code ← you see diffs, approve changes, edit code              │
│     ↕                                                              │
│  OpenCode CLI / ClaudeCode ← your 7 agents + 5 skills             │
│     ↕                                                              │
│  Git ← commit, push, PR                                           │
│                                                                    │
│  THIS IS YOUR "HANDS-ON" CODING ENVIRONMENT                       │
└──────────────────────────────────────────────────────────────────┘
                              ↕ Git Push / Pull
┌──────────────────────────────────────────────────────────────────┐
│  VPS (91.99.119.239)                                              │
│                                                                    │
│  JARVIS (Hermes Agent) ← autonomous, runs 24/7                   │
│     ↕                                                              │
│  GitHub MCP ← creates PRs, manages issues                         │
│  Vercel MCP ← deploys frontends                                   │
│  Notion MCP ← updates documentation                               │
│  Gmail MCP  ← sends emails                                        │
│  Browser MCP ← web research                                       │
│                                                                    │
│  THIS IS YOUR "HANDS-OFF" AUTONOMOUS ENVIRONMENT                  │
└──────────────────────────────────────────────────────────────────┘
```

### How They Work Together

| Scenario | What You Do | What JARVIS Does |
|----------|------------|-----------------|
| **Complex coding task** | Use OpenCode locally (Plan → Execute → Review) | Nothing — you're in control |
| **Ship what you just coded** | Tell JARVIS "deploy latest to Vercel" | Pulls, builds, deploys, updates Notion, notifies you |
| **You're away from PC** | Open Expo app, tell JARVIS "fix issue #42" | Clones repo, reads issue, writes fix, creates PR, you review on phone |
| **Morning briefing** | Wake up, check phone | JARVIS already ran audit: GitHub, Notion, Gmail summary in your chat |
| **Client deliverable** | "Create proposal for project X" | JARVIS researches, drafts proposal, pushes to Notion, emails draft |
| **Quick fix while commuting** | Voice message in Expo app: "bump API version" | JARVIS opens repo, modifies package.json, creates PR |

### Viewing Diffs on VS Code

When JARVIS creates a PR via the GitHub MCP:

1. JARVIS pushes a branch: `jarvis/fix-issue-42`
2. JARVIS creates a PR on GitHub with full description
3. You get a notification on your phone (Expo app + Telegram)
4. On your PC: `git fetch && git checkout jarvis/fix-issue-42`
5. VS Code shows the diff — you review, approve/reject
6. If approved: merge the PR (locally or on GitHub)

**JARVIS never pushes to `main` directly.** It always creates a branch and PR, respecting your review workflow.

### When to Use Each Tool

| Tool | Use When |
|------|----------|
| **OpenCode / ClaudeCode** | You're at your PC, doing focused deep-work coding, want full VS Code diff view |
| **JARVIS (Expo App)** | You're mobile, want quick actions, monitoring, or autonomous task delegation |
| **JARVIS (Web Dashboard)** | You want full visibility into system health, analytics, model usage, logs |
| **JARVIS (Telegram)** | Quick text commands, notifications, you're already in Telegram |

---

---

> **Next:** [Part 2: Database Schema & API Design](./PART2-DATABASE-API.md) →

---

*JARVIS v1.5 Master Architecture Document — Part 1 of 5*  
*© 2026 Kidus Abdula / VersaLabs Studio. All rights reserved.*
