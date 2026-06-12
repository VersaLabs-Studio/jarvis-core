# JARVIS v1.5 — Part 4: Agent & Skill System

> **System:** JARVIS — Autonomous SWE Workflow Platform  
> **Version:** 1.5.0  
> **Author:** Kidus Abdula — Lead Senior Software Engineer & Systems Architect  
> **Architectural Standard:** Architectural DNA v1.0.0  
> **Date:** June 2026  
> **Classification:** Implementation-Ready — Hand to Coding Agent

---

> [!IMPORTANT]
> This document is **Part 4 of 5** of the JARVIS v1.5 Master Architecture. It covers the OpenCode-agent → Hermes-skill migration, the canonical skill catalog, the Hermes API contract, the verified + pinned MCP catalog, and the Docker-socket security model.

### Document Index

| Part | Document | Contents |
|------|----------|----------|
| 1 | [PART1-SYSTEM-ARCHITECTURE.md](./PART1-SYSTEM-ARCHITECTURE.md) | VPS, Docker, Hermes, Nginx, Monorepo |
| 2 | [PART2-DATABASE-API.md](./PART2-DATABASE-API.md) | Schema, Generated Types, CRUD Factories, Contracts |
| 3 | [PART3-CLIENT-APPLICATIONS.md](./PART3-CLIENT-APPLICATIONS.md) | Design System, Factory Hooks, Next.js, Expo |
| **→ 4** | **PART4-AGENT-SKILL-SYSTEM.md** | **Skill Catalog, Hermes Contract, MCP Catalog, Socket Security** |
| 5 | [PART5-TESTING-DEPLOYMENT.md](./PART5-TESTING-DEPLOYMENT.md) | Verification, VPS Setup, Use Cases, Timeline |

> [!NOTE]
> **Changes from the prior draft (audit-driven):** corrected MCP package names and pinned exact versions (fix C4/H2); reconciled the skill count to one canonical list (fix C2); added the Hermes HTTP/WS API contract; added the Docker-socket-proxy security model (fix H1); added a model-ID verification note (fix C5).

---

## 4.1 OpenCode Agents → Hermes Skills Migration

The 7 OpenCode agents and 5 OpenCode skills are migrated into Hermes skill documents. Hermes uses **skills** (reusable instruction sets) + **sub-agents** (spawned for isolated tasks) instead of separate agent personas.

### Agent → Skill Map (Foundational Skills)

| OpenCode Agent | Hermes Skill | Behavior |
|---------------|-------------|----------|
| Orchestrator | *Hermes core* | Built in — Hermes IS the orchestrator; routing lives in the system prompt + skill selection. |
| Plan | `plan-feature.md` | Produces plan docs in DNA P5 format. |
| Execute | `execute-implementation.md` | Code generation under DNA P1–P6; runs in a spawned sub-agent. |
| Debug | `debug-and-fix.md` | Root-cause analysis on reported bugs. |
| Tech Lead | `tech-lead-review.md` | Strategic technical decisions, library evaluation. |
| Auditor | `audit-compliance.md` | Scores implementations against the DNA. |
| Code Review | `code-review.md` | PR review producing a DNA-compliant report. |

| OpenCode Skill | Hermes Skill | Load behavior |
|---------------|-------------|---------------|
| `architectural-dna` | `architectural-dna.md` | **Always loaded** — permanent system context (the Six Pillars). |
| `premium-ui` | `premium-ui.md` | Loaded for any UI work. |
| `schema-first` | `schema-first.md` | Loaded for any schema/entity change. |
| `frontend-craft` | `frontend-craft.md` | Loaded for React/Next.js work. |
| `ui-auditor` | `ui-auditor.md` | Loaded for UI compliance auditing. |

> **11 foundational skill documents** total: the **6 agent-derived skills** above (Orchestrator is Hermes core behavior, not a file) plus the **5 DNA skills**. These are loaded always-on or contextually; they are *not* part of the "18 workflow skills" count in §4.2.

---

## 4.2 Canonical Skill Catalog (Audit fix C2)

> [!IMPORTANT]
> **The count, reconciled.** The system ships **18 workflow skill documents** (the number Part 1 §1.3 and Part 5 Phase E reference) plus **11 foundational skill documents** (§4.1) = **29 skill documents** in `services/hermes/skills/`. "18 skills" everywhere in this architecture means the **18 workflow skills** in the two tables below. Phase E (Part 5) verifies these 18 end-to-end.

### SWE / DevOps Workflow Skills (9)

| # | Skill | Trigger Phrases | What It Does |
|---|-------|----------------|-------------|
| 1 | `ship-feature.md` | "ship feature X", "build and deploy X" | Plan → implement → test → PR → Vercel preview → Notion update → notify |
| 2 | `morning-audit.md` | Cron 8AM, "morning briefing" | GitHub (PRs/issues/commits) + Notion tasks + Gmail inbox → summarize → notify |
| 3 | `debug-and-fix.md` | "fix issue #N", "this is broken" | Read issue/error → root cause → fix → PR → run tests |
| 4 | `deploy-to-vercel.md` | "deploy X to vercel" | Pull → build → deploy via Vercel MCP → verify → status |
| 5 | `deploy-to-vps.md` | "deploy to VPS", "update production" | SSH → git pull → compose up → health check → rollback on fail |
| 6 | `github-pr-workflow.md` | "create PR for X", "review PR #N" | Branch → commit → push → PR with description → request review |
| 7 | `code-review.md` | "review this code", "check PR #N" | Load review skill → analyze → DNA-compliant report |
| 8 | `research-and-report.md` | "research X", "compare A vs B" | Browser MCP → read → synthesize → report → Notion |
| 9 | `api-integration.md` | "integrate with X API" | Read docs → client code → test → MCP wrapper if needed |

### Communication / Business / Content Skills (9)

| # | Skill | Trigger Phrases | What It Does |
|---|-------|----------------|-------------|
| 10 | `notion-update.md` | "update docs", "add to Notion" | Create/update Notion pages, formatted, correct workspace |
| 11 | `email-draft.md` | "draft email to X" | Read context → draft → format → send via Gmail MCP or review |
| 12 | `create-proposal.md` | "create proposal for X" | Research → structure → document → Notion → optional email |
| 13 | `client-report.md` | "weekly status report" | Pull GitHub/Notion data → progress report → metrics → deliver |
| 14 | `project-onboard.md` | "onboard new project X" | Create repo → CI/CD → Notion workspace → Vercel project → README |
| 15 | `content-creation.md` | "write blog post about X" | Research → outline → write → SEO → publish/save |
| 16 | `invoice-generation.md` | "invoice client X" | Pull logs → calculate → PDF → email |
| 17 | `data-analysis.md` | "analyze data in X" | Read source → process → stats → visualize → report |
| 18 | `seo-audit.md` | "audit SEO for X" | Browser MCP → crawl → check meta/headings/perf → scored audit |

---

## 4.3 Hermes Skill Document Format

Every skill is a markdown file in `apps/hermes/skills/{foundational,workflow}/` (Phase E §1.1: path resolution — the runtime lives at `apps/hermes/` to match the pnpm workspace `apps/*` glob and the existing `docker-compose.yml` build path):

```markdown
---
name: Skill Name
description: One-line description.
trigger:
  - "natural language phrase 1"
  - "natural language phrase 2"
tools_required: [github, vercel]      # MCP servers needed
category: swe                          # swe|devops|content|research|communication|analysis
estimated_time: "5-15 minutes"
---

# Skill Name
## Purpose
## Prerequisites
## Steps
### Step 1: …
## Output
## Error Handling
## Quality Checks
```

---

## 4.4 Hermes API Contract (Audit gap closed)

The Fastify API talks to Hermes over HTTP + WS on `hermes:8765` (internal network only). This is the contract `apps/api/src/services/hermes.ts` implements.

### HTTP
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/health` | — | `{ status: "ok", model: string, uptime_s: number, resolved_models: ResolvedModels, sandbox: { code: "ok" \| "noexec" }, boot_check?: "ok" \| "degraded" \| "pending" }` |
| POST | `/v1/chat/stream` | `{ session_id, message, model?, tools?, history?, role?: "planning"\|"coding"\|"office"\|"fast"\|"audit" }` | SSE stream of `{ type: "chunk"\|"tool_call"\|"done"\|"error", data: { ... } }`, terminated with the literal `data: [DONE]\n\n` |
| POST | `/v1/skill/run` | `{ skill: string, args?: object }` | `{ run_id: string }` (progress streams over WS as `skill:progress` / `skill:result` / `skill:error`) |
| GET | `/v1/skills` | — | `{ skills: SkillMeta[] }` |
| POST | `/v1/mcp/test` | `{ server: string }` | `{ server, ok, tools?: string[], error?: string }` |
| GET | `/v1/cron` | — | `{ jobs: CronJobMeta[] }` |

> **Chat contract (Phase E §1.2 resolution):** the client (already shipped in
> `apps/api/src/lib/hermes.ts`) calls **`POST /v1/chat/stream`** (not
> `POST /v1/chat {stream:true}`). The body omits the `stream` parameter —
> the endpoint *is* the streaming endpoint. The wire chunk shape is the
> canonical `{ type, data }` consumed by both the HTTP SSE relay and the
> WS bridge in `apps/api/src/routes/ws/handler.ts`.

### Streaming bridge
`POST /api/chat/send` → Hermes `POST /v1/chat {stream:true}` → API relays each chunk to the client's WebSocket as `chat:stream` (Part 2 §2.8). Tool invocations surface as `chat:tool_call`. The API persists the final assembled message + token counts to `chat_messages`.

### Error mapping
Hermes failures (model timeout, MCP error) map to the standard envelope (Part 2 §2.5) as `UPSTREAM_ERROR` with the Hermes detail attached.

---

## 4.5 Docker-Socket Security Model (Audit fix H1)

> [!IMPORTANT]
> The prior draft mounted `/var/run/docker.sock` directly into **both** the API and Hermes containers — each gaining root-equivalent control of the host (trivial container escape). v1.5 fronts the socket with a least-privilege **socket proxy**.

```
┌──────────┐        ┌─────────────────────────────┐        ┌───────────────┐
│  api     │ ─HTTP─▶│ docker-socket-proxy          │ ─sock─▶│ /var/run/     │
│ (3001)   │        │ (tecnativa/docker-socket-    │        │ docker.sock   │
└──────────┘        │  proxy) — read + restart only │        └───────────────┘
                    │  CONTAINERS=1  POST=1         │
┌──────────┐        │  EXEC=0 IMAGES=0 NETWORKS=0   │
│ hermes   │ ──────▶│  VOLUMES=0 INFO=1             │
│ sandbox  │        └─────────────────────────────┘
└──────────┘
```

- **No container mounts the raw socket.** The proxy exposes only `GET` (list/inspect/stats/logs) and the minimal `POST` needed to start/stop/restart — `EXEC`, `IMAGES`, `VOLUMES`, `NETWORKS`, `BUILD` are disabled.
- The API reaches Docker at `http://docker-socket-proxy:2375` instead of the unix socket.
- **Hermes' code execution** uses its own sandbox (Part 1 §1.5 terminal backend) with `max_concurrent`, a CPU/memory cap, a non-root user, and no host-socket access. It cannot spawn privileged host containers.
- The proxy itself is the only service that touches `docker.sock`, runs read-only-rootfs, and is not exposed outside `jarvis-network`.

*(This adds a `docker-socket-proxy` service to `docker-compose.yml` — see Part 5 §5.2. Part 1 §1.4's direct `docker.sock` mounts on `api`/`hermes` are superseded by this model.)*

---

## 4.6 MCP Integration Catalog — Verified & Pinned (Audit fix C4/H2)

> [!IMPORTANT]
> Package names are **corrected** and versions are **pinned** (no `npx -y latest` at runtime). Transport column: `npm` = pinned npm package baked into the MCP image; `docker` = official prebuilt image; `hosted` = vendor-hosted MCP endpoint (no local container). Verify each against its registry at deploy time — the MCP ecosystem moves fast.

### Launch Set (v1.5)

| MCP Server | Identifier / Transport | Key Tools | Notes |
|-----------|------------------------|-----------|-------|
| **GitHub** | `ghcr.io/github/github-mcp-server` (docker) *or* `@modelcontextprotocol/server-github@<pin>` (npm) | create_or_update_file, create_pull_request, create_issue, list_*, get_file_contents | GitHub's official server is now the Go/Docker image; prefer it. |
| **Filesystem** | `@modelcontextprotocol/server-filesystem@<pin>` (npm) | read_file, write_file, list_directory, search_files | Scope to `/workspace` only. |
| **Notion** | `@notionhq/notion-mcp-server@<pin>` (npm) | search, get_page, create_page, update_page, list_databases | ✅ name verified. |
| **Supabase** | `@supabase/mcp-server-supabase@<pin>` (npm) | query, list_tables, apply_migration, ... | ✅ **corrected** from `@supabase/mcp-server`. Use a read-scoped service role where possible. |
| **Browser** | `@playwright/mcp@<pin>` (npm) | navigate, screenshot, click, type, snapshot | ✅ **corrected** — `@anthropic/mcp-server-browser` does not exist. |
| **Vercel** | `https://mcp.vercel.com` (hosted) | list_projects, deploy, get_deployment | Vercel ships a **hosted** MCP endpoint, not an npm package; connect via OAuth, no local container. |

### Pending / Verify-at-Deploy (Post-Launch)

| MCP Server | Identifier / Transport | Blocker |
|-----------|------------------------|---------|
| **Gmail** | community server (e.g. `@gongrzhe/server-gmail-autoauth-mcp@<pin>`) — **no first-party package**; verify before use | Google OAuth + community-package trust review |
| **Slack** | `@modelcontextprotocol/server-slack@<pin>` (archived upstream — verify a maintained fork) | Slack bot token + maintenance status |
| **Linear** | `https://mcp.linear.app` (hosted) | OAuth; hosted, no local container |

> **Pinning policy:** every npm-transport server is installed at an exact version inside a prebuilt `services/mcp/Dockerfile` image (deps resolved at build, not boot). Renovate/Dependabot proposes upgrades; nothing auto-pulls `latest` at runtime.

### Future (v2.0+)
Google Calendar, Google Drive, Stripe, Shopify, HubSpot, Figma, AWS, Jira, Confluence, Twilio, SendGrid, Airtable, Zapier, WhatsApp — added per user segment as demand appears.

---

## 4.7 Model Routing — Verification Note (Audit fix C5)

The routing in Part 1 §1.5 references OpenRouter model IDs that must be confirmed against `openrouter.ai/models` at deploy time (free-tier slugs change):

| Role | Configured ID | Status (June 2026) |
|------|--------------|--------------------|
| planning / coding / audit | `nvidia/nemotron-3-super-120b-a12b:free` | ✅ verified real |
| fast | `zhipu/glm-5-turbo` | ⚠️ GLM-5 is published under **Z.ai** — use `z-ai/glm-5` (no `-turbo` slug); verify exact ID |
| office / fallback | `minimax/minimax-m2-5:free` | ⚠️ MiniMax **M2.5** exists; confirm the exact OpenRouter slug + `:free` availability |

Hermes' fallback chains (Part 1 §1.5) mean a wrong/unavailable secondary degrades gracefully rather than failing — but the **primary** (`nemotron-3-super`) must resolve. Add a boot-time check that pings each configured model once and logs unavailable ones.

---

> **← Previous:** [Part 3: Client Applications](./PART3-CLIENT-APPLICATIONS.md)  
> **Next:** [Part 5: Testing, Deployment & Use Cases →](./PART5-TESTING-DEPLOYMENT.md)

---

*JARVIS v1.5 Master Architecture Document — Part 4 of 5*  
*© 2026 Kidus Abdula / VersaLabs Studio. All rights reserved.*
