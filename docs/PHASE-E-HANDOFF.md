# Phase E — Skills & Workflows · Handoff to the Mesh

> **From:** Kidus Abdula (Architect) via Opus 4.8 BRAIN
> **To:** Orchestrator → **Plan** (gate) → Execute (fan-out) → Code Review → Auditor
> **Branch line:** `develop` → `phase/e-skills` → `feat/e-*`
> **Standard:** Architectural DNA v1.0.0 — Six Pillars. Merge floor **≥ 8.5**, 0 Code-Review blockers, green Part 5 Phase E gate. Never push to `main`.
> **Spec inputs:** `PART4-AGENT-SKILL-SYSTEM.md` (canonical), `PART1 §1.5` (model routing + sandbox), `PART2 §2.5/§2.8` (envelope + WS), `PART5` Phase E gate, `ARCHITECTURE-AUDIT.md` (C4/C5/H1/H2).

---

## 0. Short message to paste to the Orchestrator

> **Orchestrator — commence Phase E (Skills & Workflows) on `phase/e-skills` off `develop`.** Phase D (Mobile) is signed off and on `main`. Phase E is the JARVIS agent runtime — the service every chat/workflow surface built in B/C/D has been shelling out to but which **does not yet exist**. **Route to Plan FIRST** (this phase is Plan-gated; no Execute sub-agent writes code before I approve the plan doc) and request a **Tech Lead consult** on the two cross-cutting decisions: (1) model routing + fallback chain and (2) the code-execution sandbox / socket-proxy trust boundary. Plan must reconcile the two doc inconsistencies in §3 before fan-out. Build the whole phase as one large unit per `docs/PHASE-E-HANDOFF.md`; gate it at once; roll any P0/P1 fixes into the Phase F handoff rather than recircling. Report at the phase gate.

---

## 1. Where we are

| Phase | State |
|-------|-------|
| A Foundation · B API+Bridge · C Web · D Mobile | ✅ signed off → `develop` + `main` |
| **E Skills & Workflows** | 🔜 **this handoff** |
| F Deploy & Polish | pending (folds the carryover ledger §7) |

Phase E is the single largest module in v1.5: it is the actual "brain." Chat streaming, `workflow.trigger`, and the dashboard have all been calling a Hermes service that was stubbed at the contract level only.

## 2. What already exists (build against this — do not duplicate)

- **`apps/api/src/lib/hermes.ts`** — the API-side Hermes **client** (singleton `HermesClient`): `health()` + `sendMessage()` async-generator over SSE. This is the *consumer*. Phase E builds the *server* it talks to.
- **`docker-compose.yml`** — already declares `hermes` (build `apps/hermes/Dockerfile`, `:8765`, `DOCKER_HOST=tcp://docker-socket-proxy:2375`, redis, `mem_limit: 512m`, healthcheck on `/health`), `docker-socket-proxy`, `redis`, `mcp-github`, `mcp-vercel`, `jarvis-internal` network. **The compose entry exists; the image source does not.**
- **`mcp/{github,vercel,notion,gmail}/config.yaml`** — v1.0-era OpenClaw YAML stubs. **Superseded** by the pinned `services/mcp` image model (Part 4 §4.6). Treat as reference only.
- **`@jarvis/shared`** — generated types + `keys` factory + `entities` registry. `workflows`, `workflow_runs`, `chat_*`, `system_logs`, `analytics_events` entities already exist with CRUD.

## 3. ⚠️ Gaps & inconsistencies Plan MUST resolve before fan-out

1. **The Hermes runtime server does not exist.** There is no `apps/hermes/` (compose path) nor `services/hermes/` (Part 4 path). Skills can't load until the runtime that loads them exists. **This is the serial foundation of the phase (E0 below), not an afterthought.**
2. **Path inconsistency:** `docker-compose.yml` → `apps/hermes/Dockerfile`; Part 4 §4.2 → `services/hermes/skills/`. Pick ONE home for the service (recommend `apps/hermes/` to match the monorepo's `apps/*` runtime convention and the existing compose entry; put skills at `apps/hermes/skills/`). Update whichever doc loses, in the same PR.
3. **Chat contract drift:** the existing client calls `POST /v1/chat/stream`; Part 4 §4.4 specifies `POST /v1/chat {stream:true}`. The Hermes server must satisfy the **client that already ships** (`/v1/chat/stream`, SSE chunk shape `{type, data:{content|tool|args|error|usage}}`) — or change both ends in one PR. Do not strand `apps/api/src/lib/hermes.ts`.
4. **Model IDs unverified (C5):** `nemotron-3-super` primary must resolve; `glm-5` / `minimax-m2.5` slugs need confirming against `openrouter.ai/models` at build. Add the boot-time model ping (§5 gate).

## 4. Scope — Phase E as one large unit

Build the Hermes agent runtime + the full skill catalog + pinned MCP image + cron, end-to-end, so the Part 5 Phase E gate (§6) passes on real calls. The WP map extends the V1.5 build plan §5 with the missing **E0 runtime** as the serial foundation.

| WP | Branch | Scope | Depends on |
|----|--------|-------|-----------|
| **E0** | `feat/e-hermes-runtime` | **Hermes service runtime** (`apps/hermes/`): HTTP+WS server on `:8765`; skill loader; OpenRouter client + fallback chain (Part 1 §1.5) + boot-time model ping (C5); sub-agent spawn; code-exec sandbox (non-root, CPU/mem cap, **no raw socket** — Docker only via `docker-socket-proxy`, H1); implements the **full §4.4 contract** (`/health`, `/v1/chat(/stream)`, `/v1/skill/run`, `/v1/skills`, `/v1/mcp/test`, `/v1/cron`); errors map to `UPSTREAM_ERROR` envelope (§2.5). **Serial — everything below depends on it.** | B4 client, A3 compose |
| E1 | `feat/e-foundational-skills` | 11 foundational skill docs (Part 4 §4.1): 6 agent-derived + 5 DNA skills, in the §4.3 frontmatter format. `architectural-dna.md` always-on. | E0 |
| E2 | `feat/e-workflow-skills` | 18 workflow skill docs (Part 4 §4.2): 9 SWE/DevOps + 9 comms/business, each with trigger phrases, `tools_required`, steps, error handling, quality checks. | E0 |
| E3 | `feat/e-mcp-pinned` | Prebuilt **`services/mcp` (or `apps/mcp`) Dockerfile** with **exact-pinned** package versions + corrected names (Part 4 §4.6 — fixes C4/H2). Launch set: GitHub (docker img preferred), Filesystem (scope `/workspace`), Notion, Supabase (read-scoped), Browser (`@playwright/mcp`), Vercel (hosted OAuth). No `npx -y latest` at runtime. | A3 |
| E4 | `feat/e-cron` | Cron schedules → `workflow`/`workflow_runs` DB records via the CRUD factory (no bespoke writes); morning-audit 8AM job → chat + Telegram notify; model boot-check wired (C5). | E0, B3 |

**Parallelization:** `E0 → (E1 ∥ E2 ∥ E3) → E4`. E0 is the gate; the three doc/image packages fan out once the runtime loads skills; cron lands last.

## 5. Contract the runtime must honor (Part 4 §4.4)

```
GET  /health           → { status:"ok", model, uptime_s }
POST /v1/chat[/stream] → SSE stream { type:"chunk"|"tool_call"|"done"|"error", data:{...} }
POST /v1/skill/run     → { run_id }   (progress over WS)
GET  /v1/skills        → { skills: SkillMeta[] }
POST /v1/mcp/test      → { server, ok, tools: string[] }
GET  /v1/cron          → { jobs: CronJob[] }
```
- Streaming relay: `POST /api/chat/send` → Hermes chat stream → API relays each chunk to client WS as `chat:stream`; tool calls as `chat:tool_call`; API persists final message + token counts to `chat_messages`. (Already half-wired on the API side — confirm both ends agree.)
- **Security (H1, non-negotiable):** no container mounts the raw `docker.sock`; Hermes reaches Docker only via `docker-socket-proxy` (CONTAINERS+POST+INFO only; EXEC/IMAGES/VOLUMES/NETWORKS/BUILD off). Hermes code-exec runs non-root, capped, sandboxed.
- **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` / `JWT_SECRET` stay server-side in the Hermes container only — never logged, never returned to a client.

## 6. Phase E gate (Part 5 — all must pass on real calls)

```
[ ] All 18 workflow skill docs valid + loaded by Hermes (GET /v1/skills returns them)
[ ] "morning audit" via chat → real GitHub/Notion/Gmail summary
[ ] "ship feature X" → branch + PR created (NEVER pushes to main directly)
[ ] "deploy to Vercel" → Vercel hosted MCP confirms deployment
[ ] Cron morning audit fires 8AM → notifies chat + Telegram
[ ] Skill auto-create on novel task; auto-refine after 3+ uses
[ ] Each MCP server responds to a tool call (POST /v1/mcp/test per server)
[ ] Sub-agent spawning: complex task → isolated sub-agent → result collected
```
Plus the standing DNA gates: `tsc --noEmit` 0 · any-gate 0 · types from `@jarvis/shared` · Zod at boundaries · factory CRUD only · type-drift guard green. **Tech-Lead-flagged:** confirm model IDs resolve at boot; confirm the sandbox cannot reach the host socket.

## 7. Carryover ledger from Phase D (roll forward — do NOT recircle into E unless it touches E's surface)

These are tracked, non-blocking, and assigned forward per the large-handoff directive:

| ID | Item | Severity | Lands in |
|----|------|----------|----------|
| C-D1 | `apps/mobile/lib/websocket.ts` keeps its own `:4000` fallback in `getWsUrl()` — diverges from the unified `getApiUrl()`. | P2 | **F** (config unification) or a mobile touch-up |
| C-D2 | `getExpoPushTokenAsync({ projectId: undefined })` — stub; real APNs/FCM needs `extra.eas.projectId` + EAS build. | Phase F | **F** push wiring |
| C-D3 | Dashboard `api.getRaw<ServiceHealth[]>("/api/services")` likely receives the `{ok,data}` envelope, not the array (pre-existing D3 latent). | P1 (latent) | **Live-gate checklist** (deferred) + verify when `/api/services` shape is exercised |
| C-D4 | Workflow runs = N parallel requests under one cache key (no server batch endpoint). | P2 | a real `GET /api/workflows/runs?ids=` batch endpoint — **API**, fits a future B/E touch |
| C-D5 | Cosmetic: stale `expo-notifications 0.32.x` comments; redundant idempotent auto-select effect in `chat-view.tsx`. | P3 | opportunistic |
| C-LIVE | Live `GET /api/cms/workflows → 200` smoke — deferred to a **manual dev-server checklist** (architect-approved). Needs Supabase grants + `custom_access_token` hook + operator bootstrap. | Gate (deferred) | `PHASE-D-LIVE-GATE-FINDINGS.md` §3 |

## 8. Definition of Done (per WP, before Code Review)

Standard sub-agent mark-off (V1.5 handoff §6): scope matches approved plan · generated types only · no `any` · Zod at boundaries · factory CRUD · skill docs valid against §4.3 schema · MCP versions pinned exactly · Conventional Commits + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` · PR cites WP id + Part/section + audit IDs closed (C4/C5/H1/H2) · deviations documented.

---

*Phase E handoff — © 2026 Kidus Abdula / VersaLabs Studio. Plan-gated: approve the plan doc before any Execute sub-agent writes code.*
