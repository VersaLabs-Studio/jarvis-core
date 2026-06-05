# JARVIS v1.5 — Phase A: Foundation Plan

> **Phase:** A — Foundation  
> **Branch:** `phase/a-foundation` (from `develop`)  
> **Plan Agent:** Master Orchestrator (Plan mode)  
> **Date:** 2026-06-02  
> **Status:** ⏳ Awaiting Human Approval  
> **Gate Requirement:** Auditor ≥ 8.5 + 0 Code Review blockers + green Part 5 Phase A checklist

---

## 1. Phase A Overview

Phase A establishes the foundational infrastructure that all subsequent phases depend on. It is **serial by nature** — A1 must complete before A2/A3 can begin, and A2 must complete before A4.

### Work Package Dependency Graph

```
A1 (Monorepo) ──┬──▶ A2 (Shared Types) ──▶ A4 (CI Pipeline)
                 │
                 └──▶ A3 (Docker Compose)
```

### Audit Findings Closed in Phase A

| Finding | WP | Resolution |
|---------|-----|------------|
| **B1** — Dual source of truth | A2 | SQL migrations as single source → `supabase gen types` → generated types |
| **B3** — Invalid nginx rate-limit config | A3 | `limit_req_zone` in `http{}` context, not `server{}` |
| **H1** — Raw `docker.sock` mounted | A3 | `docker-socket-proxy` replaces raw socket mounts |
| **H7** — Missing healthchecks + resource limits | A3 | `mem_limit` + healthchecks on all services |

---

## 2. Work Package A1: Monorepo Foundation

**Branch:** `feat/a-monorepo`  
**Scope:** Turborepo + pnpm workspace, shared configs, root scripts  
**Duration:** ~2 hours  
**Depends on:** Nothing (first WP)

### 2.1 Deliverables

| # | File | Purpose |
|---|------|---------|
| 1 | `pnpm-workspace.yaml` | Workspace definition |
| 2 | `turbo.json` | Task graph (build, dev, lint, typecheck, test) |
| 3 | `package.json` (root) | Root workspace with turbo scripts |
| 4 | `packages/config/package.json` | Shared config package |
| 5 | `packages/config/tsconfig.base.json` | Base TypeScript config (strict mode) |
| 6 | `packages/config/eslint.config.mjs` | Shared ESLint flat config |
| 7 | `.gitignore` | Updated for monorepo (node_modules, dist, .next, .turbo, .env) |
| 8 | `.env.example` | Environment variable template (from Part 1 §1.7) |
| 9 | `.nvmrc` | Node 20 pin |

### 2.2 Directory Structure Created

```
jarvis-core/
├── apps/
│   ├── api/                    # (empty scaffold — Phase B)
│   └── web/                    # (empty scaffold — Phase C)
├── packages/
│   ├── config/                 # A1: shared configs
│   │   ├── package.json
│   │   ├── tsconfig.base.json
│   │   └── eslint.config.mjs
│   └── shared/                 # A2: types + schemas
│       └── package.json        # (skeleton only — A2 fills content)
├── services/                   # A3: infrastructure configs
├── supabase/
│   └── migrations/             # A2: SQL migrations
├── scripts/
├── docs/
├── plans/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .env.example
├── .gitignore
└── .nvmrc
```

### 2.3 Key Config Specifications

**`tsconfig.base.json`** — DNA P6 compliance:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**`turbo.json`** — task graph:
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

**Root `package.json`**:
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

### 2.4 Verification (Part 5 Phase A checklist lines 1-2)

```
[ ] pnpm install completes without errors
[ ] turbo build passes (zero errors — no apps yet, just config)
[ ] turbo typecheck passes (zero errors)
[ ] Directory structure matches spec
```

### 2.5 Sub-Agent Mark-Off

```
WORK PACKAGE: A1  ·  IMPLEMENTS: Part 1 §1.3, §1.8  ·  CLOSES: —

[ ] Scope matches plan — no out-of-boundary files (P3)
[ ] turbo.json task graph matches spec
[ ] tsconfig.base.json enforces strict mode (P6)
[ ] pnpm-workspace.yaml defines apps/* + packages/*
[ ] .env.example includes all vars from Part 1 §1.7
[ ] pnpm install + turbo build + turbo typecheck pass
[ ] Conventional commit(s); PR body cites WP A1
```

---

## 3. Work Package A2: Shared Types (Closes B1)

**Branch:** `feat/a-shared-types`  
**Scope:** SQL migrations → `supabase gen types` → generated types + Zod scaffolding  
**Duration:** ~3 hours  
**Depends on:** A1

### 3.1 The Single Source of Truth (P1 + P6 — Resolves B1)

```
supabase/migrations/0001_init.sql     ← SINGLE SOURCE OF TRUTH
         │
         │  supabase db push (apply to DB)
         │  supabase gen types typescript --linked
         ▼
packages/shared/src/types/database.types.ts   ← GENERATED (never hand-edited)
         │
         │  derive
         ▼
packages/shared/src/schemas/*.schema.ts       ← Zod (typed against Row types)
```

### 3.2 Deliverables

| # | File | Purpose |
|---|------|---------|
| 1 | `supabase/migrations/0001_init.sql` | Full schema from Part 2 §2.1 (tenants, profiles, chat_*, workflows, integrations, skills, analytics, system_logs) |
| 2 | `supabase/migrations/0002_rls.sql` | RLS policies from Part 2 §2.2 (O(1) JWT-claim pattern) |
| 3 | `supabase/migrations/0003_jwt_claim.sql` | Custom access token hook from Part 2 §2.2 |
| 4 | `packages/shared/src/types/database.types.ts` | **Generated** by `supabase gen types` — committed, never hand-edited |
| 5 | `packages/shared/src/types/api.ts` | Response envelope types (ApiOk, ApiPaginated, ApiError, ErrorCode) from Part 2 §2.5 |
| 6 | `packages/shared/src/types/index.ts` | Barrel export |
| 7 | `packages/shared/src/schemas/chat.schema.ts` | Zod schemas for ChatSession, ChatMessage |
| 8 | `packages/shared/src/schemas/workflow.schema.ts` | Zod schemas for Workflow, WorkflowRun |
| 9 | `packages/shared/src/schemas/integration.schema.ts` | Zod schemas for Integration |
| 10 | `packages/shared/src/schemas/skill.schema.ts` | Zod schemas for Skill |
| 11 | `packages/shared/src/schemas/index.ts` | Barrel export |
| 12 | `packages/shared/src/constants/models.ts` | Model definitions, fallback chains |
| 13 | `packages/shared/src/constants/services.ts` | Service name/port mappings |
| 14 | `packages/shared/src/constants/events.ts` | WebSocket event names |
| 15 | `packages/shared/package.json` | Package config with `@jarvis/shared` name |
| 16 | `packages/shared/tsconfig.json` | Extends base config |

### 3.3 Type Generation Workflow

```bash
# Step 1: Ensure Supabase project is linked
supabase link --project-ref <project-ref>

# Step 2: Apply migrations
supabase db push

# Step 3: Generate types (the ONLY way types are created)
supabase gen types typescript --linked > packages/shared/src/types/database.types.ts
```

### 3.4 Zod Schema Pattern (typed against generated types)

```ts
// packages/shared/src/schemas/workflow.schema.ts
import { z } from "zod";
import type { Database } from "../types/database.types";

type WorkflowRow = Database["public"]["Tables"]["workflows"]["Row"];
type WorkflowInsert = Database["public"]["Tables"]["workflows"]["Insert"];
type WorkflowUpdate = Database["public"]["Tables"]["workflows"]["Update"];

// Insert schema (for API validation)
export const workflowInsertSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  trigger: z.enum(["manual", "cron", "webhook", "event"]).default("manual"),
  schedule: z.string().optional().nullable(),
  skill_name: z.string().optional().nullable(),
  config: z.record(z.unknown()).default({}),
  enabled: z.boolean().default(true),
}) satisfies z.ZodType<Partial<WorkflowInsert>>;

// Update schema (all optional)
export const workflowUpdateSchema = workflowInsertSchema.partial();

// Inferred types for forms
export type WorkflowFormData = z.infer<typeof workflowInsertSchema>;
export type WorkflowUpdateData = z.infer<typeof workflowUpdateSchema>;
```

### 3.5 API Contract Types

```ts
// packages/shared/src/types/api.ts
export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiPaginated<T> {
  ok: true;
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ApiError {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiOk<T> | ApiPaginated<T> | ApiError;

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "DB_ERROR"
  | "UPSTREAM_ERROR"
  | "INTERNAL";
```

### 3.6 Verification (Part 5 Phase A checklist lines 2-3)

```
[ ] supabase gen types produces database.types.ts (committed)
[ ] CI drift guard passes (generated types match migrations)
[ ] No hand-written schema types anywhere (grep for manual Table definitions)
[ ] Zod schemas compile against generated Row types (type-check passes)
[ ] All tables from Part 2 §2.1 present in migration
[ ] RLS policies from Part 2 §2.2 applied
[ ] Custom access token hook from Part 2 §2.2 in place
```

### 3.7 Sub-Agent Mark-Off

```
WORK PACKAGE: A2  ·  IMPLEMENTS: Part 2 §2.0–§2.3, §2.5, §2.9  ·  CLOSES: B1

[ ] Scope matches plan — no out-of-boundary files (P3)
[ ] Types imported from @jarvis/shared (generated) — zero hand-written schema types (P1/P6)
[ ] No `any` in production paths; tsc --noEmit clean (P6)
[ ] Zod validation at every boundary it introduces (P6)
[ ] SQL migrations are the single source of truth (B1 closed)
[ ] database.types.ts is generated, not hand-written
[ ] Zod schemas typed against generated Row types (compile-fails on drift)
[ ] API envelope types (ApiOk, ApiPaginated, ApiError) in packages/shared
[ ] Self-verified against the Part 5 Phase A checklist
[ ] Conventional commit(s); PR body cites WP A2 + closes B1
```

---

## 4. Work Package A3: Docker Compose (Closes H1, H7, B3)

**Branch:** `feat/a-compose`  
**Scope:** Docker Compose with socket-proxy, healthchecks, mem_limit  
**Duration:** ~2 hours  
**Depends on:** A1

### 4.1 Deliverables

| # | File | Purpose |
|---|------|---------|
| 1 | `docker-compose.yml` | Full service definitions with hardening |
| 2 | `services/hermes/config.yaml` | Hermes Agent config (from Part 1 §1.5) |
| 3 | `services/hermes/skills/` | Empty dir (placeholder for Phase E) |
| 4 | `services/nginx/nginx.conf` | Main nginx config with `limit_req_zone` in `http{}` |
| 5 | `services/nginx/conf.d/default.conf` | HTTP-only server block (TLS in Phase F) |
| 6 | `services/nginx/ssl/` | Empty dir (placeholder for Phase F certs) |
| 7 | `docker-compose.dev.yml` | Development overrides (hot reload, debug ports) |

### 4.2 Docker Compose Specification (Hardened)

**Key hardening from audit:**

1. **`docker-socket-proxy`** replaces raw `docker.sock` mounts (H1 closed)
2. **`mem_limit`** on every service (H7 closed)
3. **Healthchecks** on all services including `web` and `nginx` (H7 closed)
4. **`limit_req_zone` in `http{}` context** via `nginx.conf` (B3 closed)

```yaml
# docker-compose.yml
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
  # DOCKER SOCKET PROXY (H1 fix — replaces raw docker.sock)
  # ═══════════════════════════════════════════════════════

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
    networks:
      - jarvis-network

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
      # NO docker.sock mount — sandbox only (H1 fix)
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    ports:
      - "127.0.0.1:8765:8765"
    mem_limit: 1700m
    networks:
      - jarvis-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8765/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

  redis:
    image: redis:7-alpine
    container_name: jarvis-redis
    restart: unless-stopped
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    ports:
      - "127.0.0.1:6379:6379"
    mem_limit: 128m
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
    volumes:
      - ./services/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./services/nginx/conf.d:/etc/nginx/conf.d:ro
    mem_limit: 96m
    networks:
      - jarvis-network
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
    depends_on:
      - web
      - api

  # ═══════════════════════════════════════════════════════
  # APP SERVICES (skeleton — built in Phase B/C)
  # ═══════════════════════════════════════════════════════

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
      - DOCKER_HOST=tcp://docker-socket-proxy:2375  # H1 fix: proxy, not raw socket
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "127.0.0.1:3001:3001"
    mem_limit: 512m
    # NO docker.sock mount — uses DOCKER_HOST proxy (H1 fix)
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
    mem_limit: 600m
    depends_on:
      api:
        condition: service_healthy
    networks:
      - jarvis-network
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### 4.3 Nginx Configuration (B3 fix)

**`services/nginx/nginx.conf`** — `limit_req_zone` in `http{}` context:
```nginx
# JARVIS v1.5 — Nginx Main Config
# B3 fix: limit_req_zone belongs in http{}, not server{}

worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Rate limiting zones (B3 fix — must be in http{} context)
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=chat:10m rate=10r/m;

    sendfile on;
    keepalive_timeout 65;

    include /etc/nginx/conf.d/*.conf;
}
```

**`services/nginx/conf.d/default.conf`** — HTTP-only (TLS added in Phase F):
```nginx
upstream api_backend {
    server api:3001;
}

upstream web_backend {
    server web:3000;
}

server {
    listen 80;
    server_name _;

    # Healthcheck endpoint (for nginx healthcheck)
    location /healthz {
        return 200 'ok';
        add_header Content-Type text/plain;
    }

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
        proxy_read_timeout 86400;
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

### 4.4 Verification (Part 5 Phase A checklist lines 4-8)

```
[ ] docker compose config validates (no YAML errors)
[ ] docker compose up -d starts hermes, redis, nginx, docker-socket-proxy
[ ] hermes reaches "healthy" within 30s
[ ] redis-cli ping → PONG
[ ] socket-proxy reachable from api network
[ ] raw docker.sock NOT mounted in api/hermes/web containers
[ ] curl http://localhost:8765/health → 200 (Hermes)
[ ] nginx starts without error (limit_req_zone in http{} — B3 fixed)
[ ] All services have mem_limit set
[ ] All services have healthcheck defined
```

### 4.5 Sub-Agent Mark-Off

```
WORK PACKAGE: A3  ·  IMPLEMENTS: Part 1 §1.4, §1.6 + Part 5 §5.2  ·  CLOSES: H1, H7, B3

[ ] Scope matches plan — no out-of-boundary files (P3)
[ ] docker-socket-proxy replaces raw docker.sock mounts (H1 closed)
[ ] All services have mem_limit (H7 closed)
[ ] All services have healthcheck (H7 closed)
[ ] limit_req_zone in nginx.conf http{} context (B3 closed)
[ ] docker compose config validates
[ ] docker compose up -d starts successfully
[ ] Self-verified against the Part 5 Phase A checklist
[ ] Conventional commit(s); PR body cites WP A3 + closes H1, H7, B3
```

---

## 5. Work Package A4: CI Pipeline

**Branch:** `feat/a-ci`  
**Scope:** CI with type-drift guard, color gate, any gate, turbo build/typecheck  
**Duration:** ~1.5 hours  
**Depends on:** A2 (needs generated types to exist)

### 5.1 Deliverables

| # | File | Purpose |
|---|------|---------|
| 1 | `.github/workflows/ci.yml` | Main CI pipeline |
| 2 | `scripts/check-type-drift.sh` | Type drift guard script |
| 3 | `scripts/check-no-any.sh` | Any gate script |
| 4 | `scripts/check-color-gate.sh` | Color gate script |

### 5.2 CI Pipeline Specification

```yaml
# .github/workflows/ci.yml
name: JARVIS CI

on:
  push:
    branches: [develop, phase/*, feat/*]
  pull_request:
    branches: [develop, phase/*]

jobs:
  build-and-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # Gate 1: Turbo build (all packages)
      - name: Build
        run: turbo build

      # Gate 2: Type check (strict mode, zero errors)
      - name: Type Check
        run: turbo typecheck

      # Gate 3: Type drift guard (generated types match migrations)
      - name: Type Drift Guard
        run: bash scripts/check-type-drift.sh

      # Gate 4: Any gate (no `any` in production paths)
      - name: Any Gate
        run: bash scripts/check-no-any.sh

      # Gate 5: Color gate (no hardcoded colors in UI code)
      - name: Color Gate
        run: bash scripts/check-color-gate.sh

      # Gate 6: Lint
      - name: Lint
        run: turbo lint
```

### 5.3 Guard Scripts

**`scripts/check-type-drift.sh`** — ensures generated types match migrations:
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Checking type drift..."

# Generate types fresh from the linked Supabase project
FRESH=$(supabase gen types typescript --linked 2>/dev/null)
CURRENT=$(cat packages/shared/src/types/database.types.ts)

if [ "$FRESH" != "$CURRENT" ]; then
  echo "❌ TYPE DRIFT DETECTED"
  echo "Generated types in packages/shared/src/types/database.types.ts are stale."
  echo "Run: supabase gen types typescript --linked > packages/shared/src/types/database.types.ts"
  exit 1
fi

echo "✅ Types match migrations — no drift."
```

**`scripts/check-no-any.sh`** — prevents `any` in production code:
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Checking for 'any' types..."

# Search production paths (exclude node_modules, dist, .next, test files)
MATCHES=$(grep -rn ": any\|as any\|<any>" \
  apps/*/src packages/*/src \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next \
  --exclude="*.test.ts" --exclude="*.spec.ts" \
  2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  echo "❌ 'any' FOUND IN PRODUCTION CODE:"
  echo "$MATCHES"
  echo ""
  echo "Fix: replace with proper types. P6 violation."
  exit 1
fi

echo "✅ Zero 'any' in production paths."
```

**`scripts/check-color-gate.sh`** — prevents hardcoded colors (P4):
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Checking for hardcoded colors..."

MATCHES=$(grep -rn "bg-white\|bg-black\|text-white\|text-black\|text-gray-\|bg-gray-\|bg-red-\|bg-blue-\|bg-green-" \
  apps/web/app apps/web/components \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules \
  2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  echo "❌ HARDCODED COLORS FOUND:"
  echo "$MATCHES"
  echo ""
  echo "Fix: use semantic OKLCH tokens (bg-background, text-foreground, etc.). P4 violation."
  exit 1
fi

echo "✅ Zero hardcoded colors — semantic tokens only."
```

### 5.4 Verification

```
[ ] CI pipeline runs on PR to develop/phase/*
[ ] turbo build gate passes
[ ] turbo typecheck gate passes
[ ] Type drift guard script works (fails if types stale)
[ ] Any gate script works (fails if `any` found)
[ ] Color gate script works (fails if hardcoded colors found)
[ ] All gates must pass for PR merge
```

### 5.5 Sub-Agent Mark-Off

```
WORK PACKAGE: A4  ·  IMPLEMENTS: Part 5 §5.1 Phase A  ·  CLOSES: —

[ ] Scope matches plan — no out-of-boundary files (P3)
[ ] CI pipeline includes all 6 gates
[ ] Type drift guard checks generated types against migrations
[ ] Any gate catches `any` in production paths (P6)
[ ] Color gate catches hardcoded colors (P4)
[ ] Scripts are executable and error correctly on failure
[ ] Self-verified against the Part 5 Phase A checklist
[ ] Conventional commit(s); PR body cites WP A4
```

---

## 6. Execution Sequence

```
Step 1: Plan Agent → This document (COMPLETE)
Step 2: Human approves plan
Step 3: Execute Agent → A1 (feat/a-monorepo)
Step 4: Code Review → A1 PR
Step 5: Execute Agent → A2 (feat/a-shared-types) + A3 (feat/a-compose) [PARALLEL]
Step 6: Code Review → A2 PR + A3 PR
Step 7: Execute Agent → A4 (feat/a-ci) [depends on A2]
Step 8: Code Review → A4 PR
Step 9: Integrate all on phase/a-foundation
Step 10: Auditor → Score Phase A (target ≥ 8.5)
Step 11: PR phase/a-foundation → develop
```

### Parallelization

```
A1 ──▶ (A2 ∥ A3) ──▶ A4
         │
         └── A2 must complete before A4 (CI needs generated types)
         └── A3 is independent of A2 (infra only)
```

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase project not linked | Medium | Blocks A2 | Use local Supabase or mock for initial scaffold |
| `supabase gen types` fails | Low | Blocks A2 | Fallback: commit migration SQL + type gen script, run in CI |
| Docker Compose version mismatch | Low | Blocks A3 | Pin compose file version, test locally first |
| Hermes image not available | Medium | Blocks A3 healthcheck | Use a placeholder healthcheck endpoint |

---

## 8. Exit Criteria (Phase A Gate)

Phase A is **complete** when:

```
[ ] All 4 work packages merged to phase/a-foundation
[ ] Code Review: 0 blockers on all PRs
[ ] Part 5 Phase A checklist: all items green
[ ] Auditor score ≥ 8.5/10
[ ] B1 closed: single source of truth verified
[ ] B3 closed: nginx starts without error
[ ] H1 closed: no raw docker.sock in any app container
[ ] H7 closed: all services have mem_limit + healthcheck
[ ] turbo build + turbo typecheck pass on phase/a-foundation
```

---

> **Awaiting human approval before routing to Execute Agent.**

*Phase A Plan — JARVIS v1.5 — Orchestrated by Master Orchestrator*
