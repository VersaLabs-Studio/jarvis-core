# Phase E — Skills & Workflows · PLAN (Plan-gated; Orchestrator approval required before any Execute sub-agent writes code)

> **From:** Plan agent (gate keeper)
> **To:** Orchestrator → Kidus (Architect) — **APPROVE / REVISE / REJECT** this plan before routing to Execute
> **Branch line:** `develop` → `phase/e-skills` → `feat/e-*`
> **Standard:** Architectural DNA v1.0.0 — Six Pillars. Gate: Code Review 0 blockers + Auditor ≥ 8.5 + Part 5 Phase E checklist. Never push to `main`.
> **Spec inputs:** `docs/PHASE-E-HANDOFF.md` (the BRAIN's dispatch), `docs/PART1-SYSTEM-ARCHITECTURE.md` §1.4 / §1.5, `docs/PART2-DATABASE-API.md` §2.4–2.8, `docs/PART4-AGENT-SKILL-SYSTEM.md` §4.1–4.7, `docs/PART5-TESTING-DEPLOYMENT.md` §5.1 (Phase E checklist), `docs/ARCHITECTURE-AUDIT.md` (C4 / C5 / H1 / H2 to close).
> **Status:** Reads off `develop` (`1c8ecfe`). Phase D (Mobile) merged; WP-0 API foundation in. The Hermes runtime does not yet exist.

---

## 0. Short message to paste back to the Orchestrator

> **Plan ready for approval — `docs/PHASE-E-PLAN.md`.** Two §3 inconsistencies resolved (§1 below). Two Tech Lead consult questions answered with full architectural analysis (§2 model routing + §3 sandbox/socket-proxy). WP map: E0 (Hermes runtime, serial) → E1 (11 foundational skills) ∥ E2 (18 workflow skills) ∥ E3 (pinned MCP image) → E4 (cron + morning-audit). Tech Lead decisions baked into E0 (boot-time model ping, O(n) fallback chain with error budget, sub-agent sandbox + least-privilege proxy). Phase D carryover rolls forward to F. **Requesting approval to route to Execute for E0 first** (E0 unblocks E1–E4 fan-out). Report at the phase gate, not per-WP. P0/P1 fixes roll into Phase F per the directive.

---

## 1. §3 Inconsistency Resolutions (from the BRAIN's dispatch)

Both decisions are irreversible for this phase. Both are reflected in E0 file paths / wire format / `Part 4` update listed in §13.

### 1.1 Path inconsistency — `apps/hermes/` vs `services/hermes/`

**Resolution: `apps/hermes/`.** Skills live at `apps/hermes/skills/`.

**Why this is the only correct choice for the existing repo:**

1. The repo is a **Turborepo + pnpm** monorepo. `pnpm-workspace.yaml` declares `apps/*` and `packages/*` — *no* `services/*` glob. Creating `services/hermes/` would not be a workspace member and could not import `@jarvis/shared`, could not run `turbo` tasks, and could not be built/linted/typechecked through the standard pipeline. The DNA Pillar P3 (Extreme Modularization) requires every runtime be a workspace member.
2. `docker-compose.yml` line 53-54 already declares the build path: `dockerfile: apps/hermes/Dockerfile`. The compose has been the source of truth for runtime topology since Phase A and is what `docker compose up` consumes. Moving it back to `services/hermes/` would mean editing the compose, the workspace, and the typegen script simultaneously.
3. Phase A3 (Foundation) shipped the compose with the `apps/hermes/` path baked in; Phase A3 is signed off and on `main`. Reversing it would be a re-litigation of a closed decision.

**Consequence for Part 4 §4.2:** That subsection says `services/hermes/skills/`. **We will update Part 4 §4.2 in the same E0 PR** (single-line doc edit) to align with the chosen path. Same for Part 1 §1.3 (monorepo tree). Doc edits only — no code movement.

**The MCP path:** The same logic applies. `mcp/` at the repo root is the v1.0 OpenClaw YAML stub (handoff §2 says it's superseded). `docker-compose.yml` line 169-170 + 182-183 declares `dockerfile: apps/mcp-github/Dockerfile` and `dockerfile: apps/mcp-vercel/Dockerfile` (which don't exist on disk yet). **We adopt `apps/mcp/`** for the prebuilt MCP base image (one Dockerfile, parameterized per server via compose `command:` and `volumes:`), with per-server subdirs `apps/mcp/{github,vercel,notion,supabase,filesystem,browser}/config.yaml`. Doc reconciliation in same PR.

### 1.2 Chat contract drift — `POST /v1/chat/stream` vs `POST /v1/chat {stream:true}`

**Resolution: `POST /v1/chat/stream` (the client shape).**

**Why:**

1. The client is already shipped and battle-tested. `apps/api/src/lib/hermes.ts` line 96 hard-codes `POST /v1/chat/stream`. Two consumers in the API already use this contract:
   - `apps/api/src/routes/chat/send.ts` line 71 (HTTP SSE relay to the client)
   - `apps/api/src/routes/ws/handler.ts` line 138 (WS bridge, emits `chat:chunk` / `chat:done` / `chat:error`)
   Both relay SSE chunks of shape `{ type, data }` to the client and the WS. If we change the endpoint, both consumers break.
2. The chunk shape `{ type: 'chunk' | 'tool_call' | 'done' | 'error', data: { content?, tool?, args?, error?, usage? } }` is consumed end-to-end. A `{stream:true}` body parameter would force an API-shape change for a non-existent benefit (a single endpoint handling both buffered and streamed requests).
3. The handoff §3 itself says: *"The Hermes server must satisfy the **client that already ships** ... or change both ends in one PR. Do not strand `apps/api/src/lib/hermes.ts`."* Changing both ends in one PR means the Hermes server and the API client must both be modified atomically. That is more risk for zero functional gain.

**Final contract (E0 implements this exactly):**

| Direction | Method | Path | Body | Response |
|---|---|---|---|---|
| Hermes ← | POST | `/v1/chat/stream` | `{ session_id: string, message: string, model?: string, tools?: string[], history?: HermesMessage[] }` | `text/event-stream` |
| Hermes → | SSE | — | — | `data: {"type":"chunk","data":{"content":"…"}}\n\n`, `data: {"type":"tool_call","data":{"tool":"…","args":…}}\n\n`, `data: {"type":"done","data":{"usage":{"tokens_in":N,"tokens_out":M,"duration_ms":K}}}\n\n`, `data: {"type":"error","data":{"error":"…"}}\n\n` |
| Hermes → | SSE terminator | — | — | literal `data: [DONE]\n\n` (the client checks for this on `apps/api/src/lib/hermes.ts` line 140-142) |

**Doc reconciliation in same E0 PR:** Part 4 §4.4 table row "POST /v1/chat" → update to "POST /v1/chat/stream"; the body field is `{ session_id, message, model?, tools?, history? }` (no `stream` param — it IS the streaming endpoint). The streaming-bridge paragraph in Part 4 §4.4 is unchanged.

### 1.3 Other §3 items (in-flight, not blocking fan-out)

- **#1 (Hermes doesn't exist yet):** This is the **E0 serial foundation.** It is the literal first WP. We are not papering over it.
- **#4 (Model IDs unverified — C5):** Resolved in the Tech Lead consult below. Boot-time ping in E0; resolver handles 404s on configured IDs.
- **`mcp/` at repo root:** Will be removed in E3 (the v1.0 OpenClaw stub directory; superseded by Part 4 §4.6). Confirmed superseded; out-of-scope until E3 wipes it.

---

## 2. Tech Lead Consult (1) — Model Routing + Fallback Chain

### 2.1 The decision the Tech Lead must own

> When `nvidia/nemotron-3-super-120b-a12b:free` is down, GLM-5's slug is wrong, or the daily $0.50 budget is hit at 7:59 AM, what is the **exact** fallback behavior — at the level of code, not prose? And how do we know a model is unreachable before we ship a 30-second timeout to the user?

### 2.2 Resolved design (Tech Lead to ratify)

**Routing is per-request, not per-role.** Part 1 §1.5 declares per-role routing (planning / coding / office / fast / audit), but Phase E receives chat via `/v1/chat/stream` without a role tag in the body. Options:

- **A. Implicit role inference** (sketch skill / message context → role). Rejected: adds latency and a second model call before every request; violates "no `any` and no guessing" (P6).
- **B. Default to `coding` for chat, expose `model` field for explicit override.** ✅ Adopted. The API client already accepts `model?: string` (`apps/api/src/lib/hermes.ts` line 33-39, `apps/api/src/routes/chat/send.ts` line 25); if absent, use the `coding` chain. If explicit, skip inference and use the named chain or the bare model.
- **C. Per-skill override.** Each skill doc frontmatter can declare `preferred_model_role: coding | office | fast | audit | planning`. The skill loader reads this; the chat endpoint uses it. ✅ Adopted. Lets `seo-audit.md` declare `fast` (cheap, slow content) and `morning-audit.md` declare `office` (summarization) without per-skill code.

**The chain is applied at the OpenRouter boundary in E0.** Implementation:

```ts
// apps/hermes/src/lib/openrouter.ts (sketch, not a code commit)
type Chain = { primary: string; fallback: string[] };
const CHAINS: Record<Role, Chain> = {
  planning: { primary: NEMOTRON, fallback: [GLM5, MINIMAX_M25] },
  coding:   { primary: NEMOTRON, fallback: [GLM5, MINIMAX_M25] },
  office:   { primary: MINIMAX_M25, fallback: [NEMOTRON] },
  fast:     { primary: GLM5, fallback: [MINIMAX_M25] },
  audit:    { primary: NEMOTRON, fallback: [] }, // no fallback; audits must be deterministic
};

async function chatWithFallback(role: Role, params: ChatParams, ctx: ChainContext): Promise<Stream> {
  const chain = CHAINS[role];
  for (const modelId of [chain.primary, ...chain.fallback]) {
    if (modelId === "") continue; // audit chain with empty fallback
    const startedAt = Date.now();
    try {
      const stream = await openRouterChat({ ...params, model: modelId }, ctx.signal);
      ctx.usage.recordSuccess(modelId, Date.now() - startedAt);
      return stream;
    } catch (err) {
      ctx.usage.recordFailure(modelId, err, Date.now() - startedAt);
      ctx.log.warn({ modelId, err }, "model call failed, trying next in chain");
      if (isFatal(err)) throw err; // e.g. 400 invalid request body — don't retry with a different model
    }
  }
  throw new HermesError("CHAIN_EXHAUSTED", `All models in ${role} chain failed`);
}
```

**Boot-time model ping (C5 fix).** At Hermes boot, before accepting requests, call `GET https://openrouter.ai/api/v1/models` (auth with the API key), filter for the configured IDs, log the result, and warn loudly if any are missing. If the primary is missing but a fallback is present, **auto-swap the working model into the primary slot** (logged at `warn` level) and keep serving. If *all* models in a chain are missing, fail boot. Implementation lives at `apps/hermes/src/lib/model-resolver.ts` and runs from `server.ts` boot block.

**Slug auto-correction (C5 nit).** If `zhipu/glm-5-turbo` returns 404 from the models list, the resolver tries the *likely-correct* alternate slugs in order: `z-ai/glm-5`, `z-ai/glm-5-turbo`, `zhipu/glm-5`, `zhipu/glm-4.5`. If any resolves, log the substitution at `info` and use it. If none resolve, mark the chain entry as "degraded" and skip it in fallback.

**Budget enforcement.** `apps/hermes/src/lib/budget.ts` wraps the chain. State held in Redis (`jarvis:openrouter:budget:{role}:{YYYY-MM-DD}`) keyed by role + day. Per request: estimate cost from `usage.prompt_tokens * input_price + completion_tokens * output_price` (model catalog fetched at boot from `/api/v1/models` → cached). If `daily_spend + estimated >= max_daily_spend`, reject the chain with a `BUDGET_EXHAUSTED` error that maps to `UPSTREAM_ERROR` 502 — the API surfaces it to the user as "budget hit, try again tomorrow or override the model." Override path: explicit `model` parameter in the request body bypasses the budget gate (a tenant admin can always pay for the audit).

**Timeout per model call: 60s.** If a model doesn't stream its first token in 60s, abort and try the next. Total chain timeout: 180s (three models × 60s).

### 2.3 What ships in E0

- `apps/hermes/src/lib/openrouter.ts` — typed client (model catalog cache + chat completions streaming)
- `apps/hermes/src/lib/model-resolver.ts` — boot-time ping + slug auto-correction
- `apps/hermes/src/lib/budget.ts` — Redis-backed daily spend gate
- `apps/hermes/src/config/chains.ts` — the chain table (Zod-validated at boot; refuse to start with a malformed chain)
- One Pino log line per request: `{ model, fallback_attempts, tokens_in, tokens_out, duration_ms, cost_usd }`
- `/health` returns `{ status, model, uptime_s, resolved_models: Record<Role, { primary, fallback_resolved }> }` so the API can include it in `/api/admin/health` aggregation

### 2.4 What does NOT ship in Phase E (deferred to F or later)

- Per-tenant model overrides (multi-tenant SaaS feature; we're single-tenant)
- Streaming-token-precise budget enforcement (estimates are good enough at this scale; a per-token ledger is overkill for v1.5)
- Local model hosting (Ollama, etc.) — out of scope until VPS RAM grows past 16 GB

---

## 3. Tech Lead Consult (2) — Code-Exec Sandbox / Socket-Proxy Trust Boundary

### 3.1 The decision the Tech Lead must own

> Phase E is the first phase that runs **arbitrary code** (Hermes sub-agents in the `ship-feature` / `data-analysis` / `debug-and-fix` skills execute scripts the model wrote). The `docker.sock` is one `curl` away from a container escape if mounted raw. Part 4 §4.5 fixes the *control plane* (socket proxy). What about the *compute plane* — where does untrusted code run, with what blast radius, and who can reach what?

### 3.2 Resolved design (Tech Lead to ratify)

**Two distinct execution surfaces, each with a different threat model:**

| Surface | Purpose | Threat model | Where it runs | Blast radius cap |
|---|---|---|---|---|
| **Sub-agent code-exec** | Hermes sub-agents run `node`/`python`/`bash` scripts generated by the LLM | **Untrusted code** (the LLM was prompt-injected, or a malicious skill arg was passed). Worst case = `rm -rf /`, exfiltrate `SUPABASE_SERVICE_ROLE_KEY`, pivot to other containers. | **In-process**, inside the Hermes container, in a per-task `child_process.spawn` with a scoped working dir, no network, no env-vars other than what the skill explicitly passes | Container's `mem_limit: 512m` + cgroup `pids_max` + a 5-minute hard timeout. Process cannot reach the host network or other containers — confirmed by `docker compose`'s default `network_mode: bridge` isolation on `jarvis-internal` (other containers must be addressed by name) |
| **Container control plane** | `jarvis-*` service management (start/stop/restart/inspect) | **Trusted code** (Hermes is a first-party service) | The **docker-socket-proxy** at `DOCKER_HOST=tcp://docker-socket-proxy:2375` (Part 4 §4.5; H1 fix) | The proxy allows `CONTAINERS=1` + `POST=1` (start/stop/restart) + `INFO=1`. **All other endpoints off** (`EXEC=0 IMAGES=0 VOLUMES=0 NETWORKS=0 BUILD=0 TASKS=0 SERVICES=0`). Worst case = "attacker restarts `jarvis-redis`," not "attacker runs `docker run -v /:/host`" |

**Why these are the right two surfaces:**

- **In-process code-exec** (not `docker exec`) is the right choice for sub-agents because:
  - No new image to ship for every skill (which would be a 50-image fleet)
  - The blast radius IS the Hermes container — already capped at 512m, already on `jarvis-internal`
  - The hermes container runs non-root (the `apps/hermes/Dockerfile` will create a `hermes` user with UID 1001; code-exec spawns as that user)
  - `node:child_process` is sufficient: `spawn('node', ['-e', code], { cwd: perTaskTmp, env: SANITIZED_ENV, timeout: 300_000, stdio: ['ignore', 'pipe', 'pipe'] })`
  - SANITIZED_ENV: only `PATH`, `HOME` (the task tmp), and what the skill explicitly passes; **never** the full `process.env` (this is the CWE-78 / 94 / 95 mitigation)
- **Socket proxy** is the right choice for container control because:
  - It is the audit-recommended H1 fix
  - It already exists in `docker-compose.yml` (line 6-33), runs as the only container that mounts `/var/run/docker.sock` (read-only, with `read_only: true` on the proxy itself)
  - The `EXEC=0` toggle in the proxy is the **decisive** control: even if Hermes is compromised, the proxy will not let Hermes `docker exec` into the API container, into Supabase (hosted anyway, not on this network), or into any MCP container to pivot
- **Sub-agents do NOT use the socket proxy for code-exec.** The two surfaces are disjoint by design. A sub-agent cannot "ask Hermes to restart the API to clear the log" because the path is: sub-agent → Hermes orchestrator → socket-proxy → docker restart; the orchestrator refuses, since the sub-agent only gets `execute_code(snippet)`, not `control_container(name)`.

**The filesystem MCP scope is the third surface, also isolated:** the filesystem MCP container is the only one that mounts `.:/workspace:rw`. The proxy and the API and Hermes do not see this volume. If the filesystem MCP is compromised, the attacker can read/write files in the workspace but cannot reach the host socket (the MCP image has no `DOCKER_HOST`).

**Defense-in-depth check (will be tested in E0):**

- [ ] From inside the Hermes container, `ls /var/run/docker.sock` → "No such file or directory"
- [ ] From inside the Hermes container, `curl http://docker-socket-proxy:2375/_ping` → 200 (proxy is reachable for allowed operations)
- [ ] From inside the Hermes container, `curl -X POST http://docker-socket-proxy:2375/containers/jarvis-redis/exec` → 404 (EXEC is denied by the proxy)
- [ ] From inside a sub-agent's spawned process, `cat /run/secrets/...` → "Permission denied" (the container runs non-root and the secrets aren't in `/run/secrets/...` anyway; the SUPABASE_SERVICE_ROLE_KEY is an env var, not a file)
- [ ] From inside a sub-agent, attempting to spawn a sub-sub-agent → fails (the spawn is hard-locked to a depth of 1 by the orchestrator)

### 3.3 What ships in E0

- `apps/hermes/src/sandbox/spawn.ts` — `runUntrustedCode({ code, language, timeout, env, cwd })` with the sanitized-env contract
- `apps/hermes/src/sandbox/orchestrator.ts` — sub-agent depth limit (max 1) + per-task tmp dir lifecycle
- `apps/hermes/src/lib/docker-control.ts` — thin client over `DOCKER_HOST=tcp://docker-socket-proxy:2375` exposing only `list()`, `inspect(name)`, `restart(name)`, `start(name)`, `stop(name)`; refuses any other Docker Engine call
- `apps/hermes/Dockerfile` — `USER 1001` (non-root) + `--cap-drop=ALL` + `read_only: true` rootfs with a writable `/app/tmp` tmpfs (except `/app/data` which is the named volume)
- `docker-compose.yml` updates in E0: add `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, `tmpfs: [/app/tmp]` to the `hermes` service; pin `docker-socket-proxy` to `tecnativa/docker-socket-proxy:0.3.0` (was `:latest`); keep `mem_limit: 512m`

### 3.4 What does NOT ship in Phase E

- gVisor / kata-containers for sub-agent isolation (out of scale; the 512m cap is the budget for v1.5)
- A separate "code-exec worker pool" container (defer; the in-process sandbox is enough at our load)
- Per-tenant secret isolation (single-tenant)
- Seccomp / AppArmor custom profiles (Docker default profile + dropping caps is sufficient at v1.5's threat model; revisit at SaaS scale)

---

## 4. WP Map (one large phase, built as 5 packages; serial E0, then E1∥E2∥E3, then E4)

```
E0 ──serial──▶ (E1 ∥ E2 ∥ E3) ──▶ E4
Hermes runtime   11 + 18 skills    cron + boot-check
+ sandbox        + pinned MCP      + morning-audit
+ openrouter
+ resolver
```

| WP | Branch | Sub-agent scope | Depends on | Golden template | Closes |
|---|---|---|---|---|---|
| **E0** | `feat/e-hermes-runtime` | `apps/hermes/` runtime: HTTP+WS server, OpenRouter client + chains + boot-ping, sandbox, docker-control, all 6 endpoints in Part 4 §4.4 | E0 (none) — **serial foundation** | `apps/api/src/server.ts` (Fastify patterns) + `apps/api/src/lib/hermes.ts` (the consumer shape) | **C5** (model ID boot-ping), **H1** (no raw socket in Hermes; sandbox documented), **Phase D §7 C-LIVE** partially (Hermes will answer `/health` which lets live-gate get one step further) |
| **E1** | `feat/e-foundational-skills` | 11 skill docs at `apps/hermes/skills/foundational/*.md` in the Part 4 §4.3 frontmatter format. `architectural-dna.md` is the always-on system context. | E0 (loader must exist) | `docs/PHASE-E-HANDOFF.md` §4.1 mapping table | (no audit ID; this is the catalog) |
| **E2** | `feat/e-workflow-skills` | 18 workflow skill docs at `apps/hermes/skills/workflow/*.md` with trigger phrases, `tools_required`, steps, error handling, quality checks | E0 | Part 4 §4.2 tables | (no audit ID) |
| **E3** | `feat/e-mcp-pinned` | `apps/mcp/Dockerfile` (single base image, exact-pinned npm packages), per-server `apps/mcp/{github,vercel,notion,supabase,filesystem,browser}/config.yaml`, compose update, delete the v1.0 `mcp/` OpenClaw stub | A3 (compose); no Phase E dep | Part 4 §4.6 corrected table | **C4** (corrected MCP package names), **H2** (pinned versions, no `npx -y latest`) |
| **E4** | `feat/e-cron` | Cron schedules → `workflows` + `workflow_runs` DB records via the existing CRUD factory (no bespoke writes); `morning-audit` 8 AM job → chat + Telegram notify; model boot-check wired (C5) | E0, E1, E2 (skills must exist), E3 (MCP must answer) | `apps/api/src/factory/crud.ts` (the factory) + `apps/hermes/skills/workflow/morning-audit.md` (the skill) | **C5** (model boot-check live in cron) |

**Hard rules across all WPs (DNA P1–P6 applied):**
- Schema-first: any new table → migration → `supabase gen types` → barrel re-export. No hand-written types.
- Factory CRUD for every DB-touching surface. No bespoke `supabase.from(...).insert(...)` in a handler.
- Semantic OKLCH tokens (no hardcoded colors). The D6 lint gate (`pnpm color-gate`) extends to `apps/hermes/src/**/*.ts` automatically.
- Zero `any` (D6 any-gate extends to the new workspace).
- Zod validation at every API boundary (every Hermes endpoint accepts a Zod-validated body).
- Cache invalidation via the shared `keys` factory (E4's cron writes go through the same `keys.workflows.all()` the dashboard already invalidates).
- Skill doc frontmatter parsed by a shared Zod schema in `@jarvis/shared/schemas/skill.schema.ts` (compile-fails on schema drift).
- All four data-view states for any operator-facing Hermes endpoint: loading (Pino log), empty (`{ skills: [] }`), error (UPSTREAM_ERROR envelope), success (the stream).

---

## 5. E0 — Hermes Runtime (the serial foundation)

### 5.1 File tree (target)

```
apps/hermes/
├── Dockerfile                              # NEW; multi-stage; USER 1001; cap_drop ALL
├── package.json                            # NEW; name "@jarvis/hermes"; type module
├── tsconfig.json                           # NEW; extends @jarvis/config
├── .dockerignore                           # NEW
├── README.md                               # NEW; how to run locally
└── src/
    ├── server.ts                           # NEW; Fastify boot, plugin registration, graceful shutdown
    ├── config/
    │   ├── env.ts                          # NEW; Zod-validated env (OPENROUTER_API_KEY, REDIS_URL, SUPABASE_*, DOCKER_HOST, PORT=8765)
    │   ├── chains.ts                       # NEW; the 5 model chains (planning/coding/office/fast/audit)
    │   └── constants.ts                    # NEW; model role names, error codes, timeouts
    ├── lib/
    │   ├── openrouter.ts                   # NEW; streaming chat completions client
    │   ├── model-resolver.ts               # NEW; boot-time ping + slug auto-correction
    │   ├── budget.ts                       # NEW; Redis-backed daily spend gate
    │   ├── docker-control.ts               # NEW; thin client over socket-proxy (only list/inspect/restart/start/stop)
    │   ├── logger.ts                       # NEW; pino configured per env
    │   ├── response.ts                     # NEW; ok/fail envelopes (matches packages/shared/src/types/api.ts)
    │   └── skill-loader.ts                 # NEW; reads /app/data/skills/**/*.md, Zod-validates frontmatter
    ├── sandbox/
    │   ├── spawn.ts                        # NEW; runUntrustedCode() with sanitized env + depth cap
    │   └── orchestrator.ts                 # NEW; sub-agent lifecycle + per-task tmp dirs
    ├── routes/
    │   ├── health.ts                       # NEW; GET /health
    │   ├── chat-stream.ts                  # NEW; POST /v1/chat/stream (SSE)
    │   ├── skill-run.ts                    # NEW; POST /v1/skill/run (returns run_id; progress over WS)
    │   ├── skills-list.ts                  # NEW; GET /v1/skills
    │   ├── mcp-test.ts                     # NEW; POST /v1/mcp/test
    │   ├── cron-list.ts                    # NEW; GET /v1/cron
    │   └── ws.ts                           # NEW; WS endpoint for skill-run progress + log:entry + notification
    ├── skills/
    │   ├── foundational/                   # created by E1, but loader must work in E0
    │   └── workflow/                       # created by E2
    └── types/
        ├── hermes.ts                       # NEW; server-side equivalent of apps/api/src/lib/hermes.ts types
        └── stream-chunk.ts                 # NEW; HermesStreamChunk (re-exported from shared, validated by Zod)

packages/shared/src/
├── types/
│   └── hermes.ts                           # NEW; the chunk shape + endpoint contracts, exported
└── schemas/
    ├── skill.schema.ts                     # NEW; Zod schema for skill frontmatter (Part 4 §4.3)
    └── cron.schema.ts                      # NEW; Zod schema for cron job records
```

### 5.2 Wire contract (E0 implements; E1/E2 consume; API already consumes)

| Endpoint | Method | Body (Zod) | Response |
|---|---|---|---|
| `/health` | GET | — | `{ status: "ok", model: string, uptime_s: number, resolved_models: Record<Role, { primary: string; fallback_resolved: string[]; missing: string[] }>, sandbox: { code: "ok" | "noexec" } }` |
| `/v1/chat/stream` | POST | `{ session_id: z.string().uuid(), message: z.string().min(1).max(100000), model?: z.string().optional(), tools?: z.array(z.string()).optional(), history?: z.array(HermesMessage).optional(), role?: z.enum(["planning","coding","office","fast","audit"]).default("coding") }` | `text/event-stream` of `HermesStreamChunk` + terminator `data: [DONE]\n\n` |
| `/v1/skill/run` | POST | `{ skill: z.string().min(1), args?: z.record(z.unknown()) }` | `200 { run_id: string }` immediately; progress streams over `ws://hermes:8765/ws` as `{ type: "skill:progress", run_id, step, pct, status }` and `{ type: "skill:result", run_id, output }` or `{ type: "skill:error", run_id, error }` |
| `/v1/skills` | GET | — | `200 { skills: SkillMeta[] }` where `SkillMeta = { name, description, category, trigger, tools_required, estimated_time }` |
| `/v1/mcp/test` | POST | `{ server: z.string().min(1) }` | `200 { server, ok: boolean, tools?: string[], error?: string }` |
| `/v1/cron` | GET | — | `200 { jobs: CronJob[] }` where `CronJob = { id, name, schedule, skill, notify, enabled }` |
| `/ws` | WS (upgrade) | — | JSON frames: `{ type, ... }`. Sub-protocol: client sends `{ type: "subscribe", run_ids?: string[] }` to scope; server pushes progress |

### 5.3 Module routing spec (E0 implements, locked)

```ts
// apps/hermes/src/config/chains.ts
import { z } from "zod";

export const RoleSchema = z.enum(["planning", "coding", "office", "fast", "audit"]);
export type Role = z.infer<typeof RoleSchema>;

export const ChainSchema = z.object({
  primary: z.string().min(1),
  fallback: z.array(z.string()).default([]),
});

// Confirmed against openrouter.ai/models at boot (C5). Slugs are corrected at boot if wrong.
export const CHAINS: Record<Role, ChainSchema["_output"]> = {
  planning: { primary: "nvidia/nemotron-3-super-120b-a12b:free", fallback: ["z-ai/glm-5", "minimax/minimax-m2-5:free"] },
  coding:   { primary: "nvidia/nemotron-3-super-120b-a12b:free", fallback: ["z-ai/glm-5", "minimax/minimax-m2-5:free"] },
  office:   { primary: "minimax/minimax-m2-5:free", fallback: ["nvidia/nemotron-3-super-120b-a12b:free"] },
  fast:     { primary: "z-ai/glm-5", fallback: ["minimax/minimax-m2-5:free"] },
  audit:    { primary: "nvidia/nemotron-3-super-120b-a12b:free", fallback: [] },
};
```

`z-ai/glm-5` replaces Part 1's `zhipu/glm-5-turbo` (C5 — GLM-5 is under Z.ai). If the resolver confirms `z-ai/glm-5` is not free, the resolver will pick the cheapest `z-ai/glm-*` slug and log the substitution.

### 5.4 Sandbox spec (E0 implements, locked)

```ts
// apps/hermes/src/sandbox/spawn.ts (sketch)
export interface RunUntrustedCodeParams {
  code: string;
  language: "node" | "python" | "bash";
  timeoutMs: number;        // hard cap: 300_000
  env: Record<string, string>;  // EXPLICIT only — never process.env
  cwd: string;              // a per-task tmp dir; cleaned up after
}
export interface RunUntrustedCodeResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
  oomKilled: boolean;
}

const SANITIZED_BASE_ENV: Record<string, string> = {
  PATH: "/usr/local/bin:/usr/bin:/bin",
  HOME: "/app/tmp",  // overridden per-task
  LANG: "C.UTF-8",
  // Explicitly NOT propagated:
  // - OPENROUTER_API_KEY
  // - SUPABASE_SERVICE_ROLE_KEY
  // - SUPABASE_URL
  // - JWT_SECRET
  // - MASTER_ENCRYPTION_KEY
  // - DOCKER_HOST (sub-agents do NOT control containers)
};
```

The spawned process **cannot** read Hermes' env vars (they aren't in the spawn env). The spawned process **cannot** reach other containers on `jarvis-internal` by default — Hermes' iptables/Compose network policy will be reviewed in E0 (the proxy is reachable; everything else is by name + service-discovery, which means the sub-agent would need to know `docker-socket-proxy`'s internal hostname AND the proxy's allowed endpoints, both of which are defense-in-depth, not primary).

### 5.5 Compose updates in E0

```yaml
# docker-compose.yml — diffs vs current
hermes:
  build: { context: ., dockerfile: apps/hermes/Dockerfile }
  # ... existing ...
  user: "1001:1001"             # NEW — non-root
  cap_drop: [ALL]               # NEW — no Linux caps
  security_opt: [no-new-privileges:true]  # NEW
  read_only: true               # NEW — rootfs read-only
  tmpfs:                        # NEW — writable scratch
    - /app/tmp:size=64m,mode=1777
  # No change to mem_limit (512m) or networks.

docker-socket-proxy:
  image: tecnativa/docker-socket-proxy:0.3.0   # CHANGED — was :latest (H2 pinning)
```

### 5.6 Boot sequence (E0 implements, locked)

1. `validateEnv()` (Zod; refuse on missing)
2. `initLogger()` (pino)
3. `await resolveModels()` — fetch `/api/v1/models`, validate chain IDs, log substitutions, fail boot if all chain members missing in any chain
4. `await initBudget()` (Redis connect)
5. `await loadSkills()` (read `/app/data/skills/**/*.md`, Zod-validate, log count, fail soft if a doc is malformed — log and skip, don't kill the runtime)
6. `await fastify.listen({ port: 8765, host: "0.0.0.0" })`
7. `await loadCrons()` (E4 will populate; E0 ships the loader, no jobs)
8. Heartbeat: every 30s, ping `/v1/chat/stream` health (a 0-token call to the primary) and log degraded chains

### 5.7 E0 acceptance criteria

- [ ] `pnpm -F @jarvis/hermes typecheck` 0
- [ ] `pnpm -F @jarvis/hermes build` produces `dist/server.js` (single entry; ESM)
- [ ] `docker compose build hermes` succeeds; image is < 300 MB
- [ ] `docker compose up hermes` → `/health` returns 200 with `resolved_models` populated; `model-resolver` logs the resolved chain
- [ ] `curl -X POST http://localhost:8765/v1/chat/stream -d '{"session_id":"...","message":"hi"}' -H 'Content-Type: application/json' -N` streams SSE chunks matching the schema; the last line is `data: [DONE]`
- [ ] `curl http://localhost:8765/v1/skills` returns `{ skills: [] }` (no skill docs yet — E1/E2)
- [ ] `curl -X POST http://localhost:8765/v1/skill/run -d '{"skill":"morning-audit"}'` returns `{ run_id }` and the WS endpoint receives a `skill:result` or `skill:error` within 30s
- [ ] `curl -X POST http://localhost:8765/v1/mcp/test -d '{"server":"github"}'` (no mcp running) returns `{ server:"github", ok:false, error:"MCP not configured" }` (no crash)
- [ ] Sandbox defense-in-depth checks (§3.2) all pass
- [ ] No raw `/var/run/docker.sock` mount on `hermes` (compose diff confirms)
- [ ] Boot fails loudly if `OPENROUTER_API_KEY` missing (env validator works)
- [ ] Boot fails loudly if the primary model is missing in all candidate slugs (resolver works)
- [ ] `pnpm any-gate` 0 (extended to `apps/hermes/src/`)
- [ ] `pnpm color-gate` 0 (extended, even though there's no UI)

### 5.8 E0 PR notes (PR body template)

> **WP:** E0 — Hermes runtime (serial foundation of Phase E)
> **Implements:** Part 1 §1.5, Part 4 §4.4 (full contract), Part 4 §4.7 (C5 boot-ping), Part 4 §4.5 (H1/H2 sandbox + proxy pinning), `docs/PHASE-E-PLAN.md` §5
> **Closes:** **C5** (model ID boot-ping), **H1** (no raw socket in Hermes; sandbox documented), **H2** (socket-proxy image pinned to `0.3.0`)
> **Doc reconciliation in same PR:** Part 4 §4.2 `services/hermes/skills/` → `apps/hermes/skills/`; Part 4 §4.4 table `POST /v1/chat` → `POST /v1/chat/stream` with body shape from §1.2 above; Part 1 §1.3 monorepo tree `services/hermes/` → `apps/hermes/`; Part 1 §1.5 `zhipu/glm-5-turbo` → `z-ai/glm-5` (C5).
> **Pivots:** none
> **Convention:** `feat(hermes): …`; Co-authored-by trailer.

---

## 6. E1 — Foundational Skills (11 docs)

### 6.1 Scope

11 markdown files in `apps/hermes/skills/foundational/`, each conforming to the Part 4 §4.3 frontmatter schema (validated by `packages/shared/src/schemas/skill.schema.ts`).

```
apps/hermes/skills/foundational/
├── architectural-dna.md          # ALWAYS LOADED (system context)
├── premium-ui.md
├── schema-first.md
├── frontend-craft.md
├── ui-auditor.md
├── plan-feature.md
├── execute-implementation.md
├── debug-and-fix.md
├── tech-lead-review.md
├── audit-compliance.md
└── code-review.md
```

### 6.2 Frontmatter schema (locked; E1 implements)

```ts
// packages/shared/src/schemas/skill.schema.ts
import { z } from "zod";

export const SkillFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).max(280),
  trigger: z.array(z.string().min(1)).min(1),
  tools_required: z.array(z.string()).default([]),
  category: z.enum(["swe", "devops", "content", "research", "communication", "analysis", "general", "foundational"]),
  estimated_time: z.string().regex(/^\d+-\d+ minutes?$|^\d+ minutes?$/),
  always_loaded: z.boolean().default(false),   // architectural-dna is the only one true
  preferred_model_role: z.enum(["planning", "coding", "office", "fast", "audit"]).optional(),
});
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export const SkillDocSchema = z.object({
  frontmatter: SkillFrontmatterSchema,
  body: z.string().min(1),  // markdown body
});
```

### 6.3 Body sections (locked; every skill has these H2s)

```markdown
# Skill Name
## Purpose              (1 paragraph; what this skill exists to do)
## Prerequisites        (what state must exist before this skill runs; e.g. "user is authenticated", "repo cloned to /workspace")
## Steps                (ordered; concrete; no vague "investigate")
  ### Step 1: …
  ### Step 2: …
## Output               (what the skill returns; the shape of the success)
## Error Handling       (failure modes + recovery; what to do if a step fails)
## Quality Checks       (self-verification before declaring success; the "done" signal)
```

### 6.4 Content quality bar (E1 executor must hit this)

- Every skill doc is **actionable** — a sub-agent reading it cold can execute the steps without asking the user
- Concrete example invocations: e.g. `morning-audit.md` lists the exact GitHub query it runs and the exact Notion page it reads
- No "TBD" or "TODO" in shipped skill docs (E1 must complete them; partial docs → E1 not done)
- `tools_required: []` is allowed only for skills that don't need MCP (e.g. `architectural-dna.md` is pure prompt context)
- `preferred_model_role` is set explicitly on each — `architectural-dna` → `audit` (large, careful), `debug-and-fix` → `coding`, `plan-feature` → `planning`, etc.

### 6.5 E1 acceptance criteria

- [ ] 11 files exist at the paths above
- [ ] `pnpm -F @jarvis/hermes build` → `await loadSkills()` logs `Loaded 11 foundational skills (1 always-loaded)`
- [ ] `curl http://localhost:8765/v1/skills` returns 11 entries (after E1 merges; E0 alone returns 0)
- [ ] Zod-validated frontmatter; a doc with a malformed frontmatter is logged and skipped (no crash)
- [ ] Each doc has all 6 H2 sections; verified by a `apps/hermes/scripts/verify-skills.ts` (one-off; deleted after E1)
- [ ] `pnpm any-gate` 0
- [ ] PR cites WP E1 + Part 4 §4.1

### 6.6 E1 PR notes

> **WP:** E1 — 11 foundational skills (Part 4 §4.1)
> **Implements:** Part 4 §4.1 mapping table
> **Closes:** (no audit ID)
> **Pivots:** none
> **Notes:** `architectural-dna.md` is the always-loaded system context; setting `always_loaded: true` in frontmatter is the only flag that triggers special loading. Loader is the existing E0 `skill-loader.ts` reading `/app/data/skills/foundational/*.md`.

---

## 7. E2 — Workflow Skills (18 docs)

### 7.1 Scope

18 markdown files in `apps/hermes/skills/workflow/`, one per row in Part 4 §4.2 (the two 9-skill tables). E2 is the longest of the parallel WPs by file count.

```
apps/hermes/skills/workflow/
├── ship-feature.md
├── morning-audit.md
├── debug-and-fix.md                       # note: this is the WORKFLOW skill, distinct from the FOUNDATIONAL debug-and-fix.md (P3-style alias ok since they're in different dirs)
├── deploy-to-vercel.md
├── deploy-to-vps.md
├── github-pr-workflow.md
├── code-review.md                          # same caveat as above
├── research-and-report.md
├── api-integration.md
├── notion-update.md
├── email-draft.md
├── create-proposal.md
├── client-report.md
├── project-onboard.md
├── content-creation.md
├── invoice-generation.md
├── data-analysis.md
└── seo-audit.md
```

### 7.2 Quality bar (stricter than E1 — these are the user-facing ones)

- Every workflow skill declares at least one entry in `trigger:` (natural-language phrases the user can say)
- `tools_required` lists exactly the MCP servers the skill needs (e.g. `morning-audit.md` → `["github", "notion", "gmail"]`); a skill with empty `tools_required` must say so explicitly and justify in the body
- `estimated_time` is realistic (5–60 minutes typical)
- Steps must include a **rollback** step where applicable (e.g. `deploy-to-vps.md` has a "rollback: `git checkout <previous-tag> && docker compose up -d`" step)
- Quality Checks section is non-empty (e.g. `ship-feature.md` checks: PR exists, CI green, Vercel preview URL live, Notion updated, user notified)

### 7.3 E2 acceptance criteria

- [ ] 18 files exist
- [ ] `await loadSkills()` logs `Loaded 29 skills total (11 foundational, 18 workflow)`
- [ ] `curl /v1/skills` returns 18 workflow entries with `category` in `{swe, devops, content, research, communication, analysis}`
- [ ] Every skill has all 6 H2 sections
- [ ] No skill has a TODO or TBD
- [ ] Each skill's `trigger:` array is non-empty and contains realistic user phrases (not Lorem-ipsum)
- [ ] `pnpm any-gate` 0
- [ ] PR cites WP E2 + Part 4 §4.2

---

## 8. E3 — Pinned MCP Image

### 8.1 Scope

- **One base image** `apps/mcp/Dockerfile` that installs all 6 npm MCP servers at exact pinned versions. Compose `image:` references the built base image; per-server services override `command:` to start the right server.
- **Per-server subdirs** `apps/mcp/{github,vercel,notion,supabase,filesystem,browser}/config.yaml` — runtime config (allowed roots, default workspace, etc.). These are bind-mounted into the containers.
- **Compose update:** replace the `mcp-github` / `mcp-vercel` placeholder Dockerfiles with references to the built base image; the four other MCP servers get added (currently only 2 are declared in compose).
- **Delete the v1.0 `mcp/` OpenClaw stub** at the repo root.

### 8.2 Pinned versions (E3 must use these exact pins, not `latest`)

The Tech Lead's research into current MCP package versions (June 2026) yields:

```
@modelcontextprotocol/server-github       # pin at the version current on npm at build time
@notionhq/notion-mcp-server              # pin at the version current on npm at build time
@supabase/mcp-server-supabase            # CORRECTED name (was @supabase/mcp-server — C4)
@playwright/mcp                          # CORRECTED scope (was @anthropic/mcp-server-browser — C4)
@modelcontextprotocol/server-filesystem   # pin at the version current on npm at build time
```

> **Note for the Executor:** the E3 sub-agent must `npm view <pkg> version` each package at build time and pin to the current stable. If any of these packages are deprecated or unpublished at build time, the sub-agent must report this and stop — do NOT silently substitute a different package. The handoff's "verify at deploy time" note in Part 4 §4.6 applies.

Vercel and Linear are **hosted** MCPs (no local container) per Part 4 §4.6; no Dockerfile change is needed for them. Vercel config is in `apps/mcp/vercel/config.yaml` for documentation only (it'll be a "commented" entry: `# Vercel MCP is hosted at https://mcp.vercel.com — connect via OAuth, no local container`).

### 8.3 File tree

```
apps/mcp/
├── Dockerfile                              # NEW; node:20-slim base; installs 6 packages at pinned versions
├── README.md                               # NEW
└── (subdirs)
    ├── github/config.yaml                  # NEW
    ├── vercel/config.yaml                  # NEW (doc-only; Vercel is hosted)
    ├── notion/config.yaml                  # NEW
    ├── supabase/config.yaml                # NEW
    ├── filesystem/config.yaml              # NEW
    └── browser/config.yaml                 # NEW
```

### 8.4 Base Dockerfile (E3 must use exactly this structure; the FROM and pin list is the only configurable bit)

```dockerfile
FROM node:20-slim
# Run as non-root
RUN useradd -m -u 1001 -s /bin/bash mcp
USER 1001
WORKDIR /opt/mcp

# Pin exact versions — no "latest". Renovate/Dependabot proposes upgrades.
# E3 sub-agent runs `npm view <pkg> version` and pins the current stable.
ARG MCP_GITHUB_VERSION
ARG MCP_NOTION_VERSION
ARG MCP_SUPABASE_VERSION
ARG MCP_BROWSER_VERSION
ARG MCP_FILESYSTEM_VERSION

RUN npm install --no-audit --no-fund \
    @modelcontextprotocol/server-github@${MCP_GITHUB_VERSION} \
    @notionhq/notion-mcp-server@${MCP_NOTION_VERSION} \
    @supabase/mcp-server-supabase@${MCP_SUPABASE_VERSION} \
    @playwright/mcp@${MCP_BROWSER_VERSION} \
    @modelcontextprotocol/server-filesystem@${MCP_FILESYSTEM_VERSION}

# Each server's entrypoint is invocable; compose overrides `command:` to pick one
EXPOSE 8765 8766 8767 8768 8769  # arbitrary; not actually used (stdio MCPs)
ENTRYPOINT ["node"]
```

### 8.5 Compose update (E3 ships a docker-compose.diff or a direct edit)

```yaml
# (current compose has mcp-github and mcp-vercel as build services that don't exist)
# E3 replaces them with:
mcp-github:
  image: jarvis-mcp-base:latest    # built from apps/mcp/Dockerfile
  profiles: ["mcp"]
  container_name: jarvis-mcp-github
  command: ["node", "node_modules/@modelcontextprotocol/server-github/dist/index.js"]
  env_file: [apps/mcp/github/.env]   # GITHUB_TOKEN; .env is .gitignored
  restart: unless-stopped
  mem_limit: 128m
  networks: [jarvis-internal]

# Similarly for mcp-notion, mcp-supabase, mcp-filesystem (with workspace volume), mcp-browser.
```

### 8.6 E3 acceptance criteria

- [ ] `apps/mcp/Dockerfile` builds; image < 400 MB
- [ ] All 6 npm packages are installed at exact pinned versions (no `^` or `~` in the Dockerfile)
- [ ] `npm ls` inside the image confirms the pin (not "extraneous")
- [ ] Each per-server service starts with the right `command:` and the right env vars
- [ ] `POST /v1/mcp/test` (Hermes endpoint, after E0+E3) returns `{ server, ok, tools }` for each of the 6 servers — even when run with no token, so the dev can verify the server process is alive
- [ ] The `mcp/` dir at repo root is deleted (a one-line commit; the v1.0 OpenClaw stub is no longer needed)
- [ ] No `npx -y` anywhere in compose (H2 closed)
- [ ] `pnpm any-gate` 0 (no JS/TS to gate; but verify)
- [ ] PR cites WP E3 + Part 4 §4.6 + closes C4 + H2

### 8.7 E3 PR notes

> **WP:** E3 — pinned MCP image (Part 4 §4.6)
> **Implements:** Part 4 §4.6 (corrected + pinned MCP catalog)
> **Closes:** **C4** (corrected MCP package names), **H2** (pinned versions, no `npx -y latest`)
> **Pivots:** `mcp/` repo-root dir → removed (was v1.0 OpenClaw stub, superseded)
> **Notes:** Vercel and Linear are hosted MCPs (not in the local image); their config.yaml files are documentation, not active config. The 6 packages are pinned at build-time versions returned by `npm view <pkg> version`; the E3 sub-agent records the resolved versions in the PR body.

---

## 9. E4 — Cron + Morning-Audit

### 9.1 Scope

- **Cron engine** inside Hermes (Node-cron or BullMQ; BullMQ if we need job persistence across restarts — recommend BullMQ since the morning-audit MUST survive a Hermes restart and not double-fire)
- **Workflow record creation** via the existing CRUD factory — no bespoke `supabase.from('workflows').insert(...)`. The cron engine maps a job trigger to a `workflows` row + a `workflow_runs` row, then runs the skill.
- **Morning-audit 8 AM job** → runs the `morning-audit` skill → emits results to chat (via the API WS) + Telegram (via Hermes' direct Telegram gateway, configured but not yet activated in v1.5 — Phase F wires the real bot; Phase E emits a Telegram-format payload and logs it to `system_logs`)
- **Model boot-check** (C5 close) — at Hermes boot, call the resolved primary once with a 1-token test prompt; if it returns a successful response, log `boot-check OK`; if it fails, log a warning but do not fail boot (the chain fallback handles the runtime case; boot-check is for ops visibility)

### 9.2 File tree (additions to E0)

```
apps/hermes/src/
├── cron/
│   ├── engine.ts                # NEW; BullMQ worker + scheduler
│   ├── jobs/
│   │   ├── morning-audit.ts     # NEW; the 8 AM job
│   │   ├── weekly-review.ts     # NEW; Mon 9 AM (Part 1 §1.5)
│   │   └── model-boot-check.ts  # NEW; the C5 close
│   └── registry.ts              # NEW; the cron job table
```

### 9.3 Wire

```ts
// apps/hermes/src/cron/registry.ts (sketch)
import { CronJobSchema } from "@jarvis/shared/schemas/cron.schema";

export const CRON_JOBS = {
  morning_audit: {
    id: "morning-audit",
    name: "Morning Audit",
    schedule: "0 8 * * *",        // 8 AM daily
    skill: "morning-audit",
    notify: ["api", "telegram"],
    enabled: true,
  },
  weekly_review: {
    id: "weekly-review",
    name: "Weekly Review",
    schedule: "0 9 * * 1",        // Mon 9 AM
    skill: "research-and-report",
    notify: ["api", "telegram"],
    enabled: true,
    args: { topic: "Weekly progress review" },
  },
  model_boot_check: {
    id: "model-boot-check",
    name: "Model Boot Check",
    schedule: "@boot",
    skill: null,                  // built-in; not a skill doc
    notify: [],
    enabled: true,
  },
} as const satisfies Record<string, z.infer<typeof CronJobSchema>>;
```

When a job fires, the engine:
1. Looks up the skill doc at `apps/hermes/skills/workflow/${skill}.md` (Zod-validated)
2. Creates a `workflow_runs` row via the CRUD factory (status=`pending` then `running`)
3. Emits a `workflow:progress` event to the API over WS (the dashboard renders this)
4. Runs the skill
5. Updates the `workflow_runs` row to `success`/`failed` with the output/error
6. Notifies per `notify[]` (Telegram in v1.5 = structured log to `system_logs`; real bot is F)

### 9.4 E4 acceptance criteria

- [ ] BullMQ connects to Redis at boot
- [ ] Cron engine registers 3 jobs; `GET /v1/cron` returns them
- [ ] A manually-triggered `morning-audit` (via `POST /v1/skill/run`) creates a `workflow_runs` row, runs the skill, updates the row, and emits progress over WS — all visible from the dashboard in real-time
- [ ] The 8 AM cron fires (verified by temporarily setting `schedule: "* * * * *"` in a test, then reverting)
- [ ] The model boot-check runs at Hermes start and logs `boot-check OK` or `boot-check DEGRADED` with the failure detail
- [ ] `pnpm any-gate` 0
- [ ] PR cites WP E4 + Part 1 §1.5 + Part 5 Phase E checklist

---

## 10. Phase E Acceptance Criteria (the gate, from Part 5 §5.1)

Every line below is a **testable** assertion. The Auditor will score against this list.

```
[ ] All 18 workflow + 11 foundational skill docs valid (Zod schema) + loaded by Hermes (GET /v1/skills returns 29 entries)
[ ] "morning audit" via chat → real GitHub + Notion + Gmail summary (morning-audit skill end-to-end)
[ ] "ship feature X" via chat → branch + PR created (skill: github-pr-workflow) — NEVER pushes to main directly
[ ] "deploy to Vercel" via chat → Vercel hosted MCP confirms deployment
[ ] Cron morning audit fires at 8 AM → workflow_runs row + WS notification + structured log
[ ] Skill auto-create on novel task: a task with no matching skill triggers skill-loader to draft a new doc (out of v1.5 scope — stub only, log "auto-create not yet implemented" instead)
[ ] Skill auto-refine after 3+ uses: out of v1.5 scope — stub only
[ ] Each MCP server responds to POST /v1/mcp/test (one call per server, ok:true with a tools list)
[ ] Sub-agent spawning: a complex task (e.g. "analyze this CSV") spawns a sub-agent via /v1/skill/run, result collected, parent notified
```

Plus the standing DNA gates:
```
[ ] tsc --noEmit 0 across all 4 apps (api, web, mobile, hermes)
[ ] any-gate 0
[ ] color-gate 0
[ ] type-drift guard green (no schema drift in supabase/migrations)
[ ] pnpm audit: type-drift + color + any + factory + import — all 0
[ ] factory-check: every new DB-touching surface goes through the factory
[ ] import-check: no sideways feature imports; the new apps/hermes/ module is isolated
[ ] Zod at every Hermes boundary
[ ] Hermes package.json in the pnpm workspace (apps/* glob picks it up)
[ ] SKILL doc frontmatter Zod-validated; malformed docs logged and skipped
[ ] Boot-time model ping (C5) — primary resolves OR auto-corrected slug is logged
[ ] Socket-proxy pinned to 0.3.0 (H2)
[ ] No raw /var/run/docker.sock on Hermes (H1) — compose confirms
[ ] Hermes Dockerfile: USER 1001, cap_drop ALL, read_only true, no-new-privileges true
[ ] Sandbox: SANITIZED_BASE_ENV does not include OPENROUTER_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, JWT_SECRET, MASTER_ENCRYPTION_KEY, DOCKER_HOST
```

---

## 11. Carryover Ledger (rolls to Phase F; do NOT recircle into E)

Per the handoff §7 directive: these are tracked, non-blocking, and assigned forward. None block E.

| ID | Item | Severity | Lands in |
|----|------|----------|----------|
| C-D1 | `apps/mobile/lib/websocket.ts` keeps its own `:4000` fallback in `getWsUrl()` | P2 | **F** (config unification) |
| C-D2 | `getExpoPushTokenAsync({ projectId: undefined })` — real APNs/FCM needs `extra.eas.projectId` + EAS build | Phase F | **F** push wiring |
| C-D3 | Dashboard `api.getRaw<ServiceHealth[]>("/api/services")` likely receives the `{ok,data}` envelope, not the array (pre-existing D3 latent) | P1 (latent) | **Live-gate checklist** (deferred) + verify when `/api/services` shape is exercised |
| C-D4 | Workflow runs = N parallel requests under one cache key (no server batch endpoint) | P2 | **API** (B/E touch) — `GET /api/workflows/runs?ids=` |
| C-D5 | Cosmetic: stale `expo-notifications 0.32.x` comments; redundant idempotent auto-select effect in `chat-view.tsx` | P3 | opportunistic |
| C-LIVE | Live `GET /api/cms/workflows → 200` smoke — deferred to manual dev-server checklist | Gate (deferred) | `PHASE-D-LIVE-GATE-FINDINGS.md` §3 |

**None of C-D1..C-D5 are E's problem.** Flagged again in the F handoff to ensure they aren't lost.

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|:---:|:---:|-----------|
| **C5 (model IDs unverified)** | High | High | Boot-time ping in E0; auto-correction; fail boot if all chains missing |
| **C4 (MCP package names drift between E3 planning and E3 build)** | Medium | Medium | E3 sub-agent records resolved versions in PR body; orchestrator reviews before merge |
| **Sandbox escape** | Low | Critical | Defense-in-depth: 5 checks in §3.2; container-level cap_drop ALL + no-new-privileges; non-root user; sanitized env; depth-1 sub-agent limit |
| **OpenRouter rate limit at 8 AM** (morning-audit is the same minute across all tenants eventually) | Medium | Medium | BullMQ retries with backoff; budget gate prevents overspend; if budget hit, morning-audit emits an "audit deferred" message rather than failing |
| **Skills doc count off (29 ≠ 18+11 = 29 expected but if any doc is dropped, E1/E2 fail)** | Low | Low | `await loadSkills()` returns `{ foundational: 11, workflow: 18, total: 29 }`; the boot log asserts `total === 29`; an under-count fails boot |
| **E0 sub-agent running a 60s timeout for the boot-time ping eats 60s of startup** | Medium | Low | Boot ping is fire-and-forget — boot completes; the ping resolves in the background and updates the `/health` response when done |
| **BullMQ requires Redis to be up; Redis isn't strictly required by E0** | Medium | Medium | E4's engine lazy-inits; if Redis is down, log a warning and disable cron (chat still works; cron is the casualty) |
| **Pino logs bloat disk** | Low | Low | Hermes' container has `mem_limit: 512m`; logs go to stdout (Docker's job to rotate); no log file in the container |
| **Hermes runs in-process code that connects to the internet (sub-agents may need to fetch URLs)** | Low | Medium | SANITIZED_BASE_ENV does not forbid egress; if a sub-agent tries to curl `https://attacker.example`, it succeeds. This is by design (sub-agents need to call APIs). The blast-radius cap is the container's resource limits, not network policy. Documented in the Dockerfile README. |
| **WS auth handshake on the Hermes side is open (no tenant check)** | Medium | Medium | The Hermes WS is **internal-only** (Compose network `jarvis-internal`, no port published); only the API container can reach it. Document in the README. F-level hardening if we ever expose it. |

---

## 13. Open Questions for the BRAIN (none blocking; ratify or override before E0)

These are decisions I made on the Tech Lead's behalf. Each is reversible; ratify or override before E0 starts.

1. **BullMQ vs node-cron for the cron engine.** Recommended BullMQ (job persistence, retries, observability) at the cost of a Redis dependency in E4. **Alternative:** node-cron (in-process, no persistence — a Hermes restart at 7:59 AM means the 8 AM job is missed). **Recommendation:** BullMQ. **Ratify or override?**

2. **Sub-agent depth limit = 1 (no sub-sub-agents).** Recommended for v1.5 — a sub-sub-agent adds complexity with no current skill requiring it. **Ratify or override?**

3. **Boot ping is fire-and-forget; boot does not block on it.** Recommended — a 60s boot delay is unacceptable; the ping resolves in the background and updates `/health` when done. **Alternative:** block boot (simpler, slower). **Recommendation:** fire-and-forget. **Ratify or override?**

4. **Vercel + Linear are documented but not in the local image.** Recommended (matches Part 4 §4.6). **Ratify or override?**

5. **The `mcp/` repo-root dir is deleted in E3.** Recommended (it's the v1.0 OpenClaw stub, fully superseded by Part 4 §4.6). **Alternative:** keep it, mark as legacy. **Recommendation:** delete. **Ratify or override?**

6. **Hermes WS is internal-only (no port published).** Recommended (matches "internal network only" in Part 4 §4.4). **Ratify or override?**

7. **Skill auto-create / auto-refine (Part 5 Phase E checklist items 6–7) are STUB-ONLY in v1.5.** Recommended — these are learning-loop features that need real usage data to validate; we don't have usage data yet. The skill-loader logs `auto-create: stub — log "not yet implemented" instead`. **Ratify or override?**

---

## 14. Definition of Done (per WP, before Code Review)

Standard sub-agent mark-off (V1.5 handoff §6):

```
WORK PACKAGE: <id>  ·  IMPLEMENTS: Part <n> §<x>  ·  CLOSES: <audit IDs or none>

[ ] Scope matches this plan doc §5–§9 — no scope creep, no out-of-boundary files (P3)
[ ] Types imported from @jarvis/shared (generated) — zero hand-written schema types (P1/P6)
[ ] No `any` in production paths; tsc --noEmit clean (P6)
[ ] Zod validation at every boundary (P6)
[ ] CRUD goes through the factory; no bespoke CRUD (P2)
[ ] No new hardcoded colors (P4) — even though Hermes has no UI, the gate extends
[ ] Sandbox defense-in-depth checks pass (E0 only)
[ ] Boot-time model ping runs and logs (E0)
[ ] Hermes package.json in pnpm workspace; docker-compose build works
[ ] Conventional commit(s); PR body cites WP id + Part/section + audit IDs closed
[ ] Any deviation from the plan is documented in the PR (P5)
```

---

## 15. Approval Block

This plan is **Plan-gated**. No Execute sub-agent writes code until this section is signed.

```
APPROVED  ☐  REVISE  ☐  REJECT  ☐

Reviewer: __________________________________   Date: ____________

Notes:
________________________________________________________________
________________________________________________________________

Conditions (if REVISE):
________________________________________________________________
________________________________________________________________
```

**Routing after approval:**

```
Orchestrator ──approve──▶ Execute (E0 only, serial)
                              ▼
                         Code Review (E0)
                              ▼
                         Execute (E1 ∥ E2 ∥ E3, fan-out)
                              ▼
                         Code Review (E1, E2, E3)
                              ▼
                         Execute (E4, serial after E1–E3)
                              ▼
                         Code Review (E4)
                              ▼
                         Phase integration on phase/e-skills
                              ▼
                         Part 5 Phase E checklist (§10 above)
                              ▼
                         Auditor (≥ 8.5; 0 Code Review blockers)
                              ▼
                         PR phase/e-skills → develop
```

**If the gate fails:** the Orchestrator's directive says P0/P1 fixes roll into the Phase F handoff rather than recircle. So if the Auditor scores < 8.5, the fixes are documented in `docs/PHASE-F-HANDOFF.md` §… rather than re-looping Phase E.

---

*Phase E plan — © 2026 Kidus Abdula / VersaLabs Studio. Plan-gated: approve before any Execute sub-agent writes code. Tech Lead consult questions answered in §2 (model routing) and §3 (sandbox/socket-proxy). WP map: E0 → (E1 ∥ E2 ∥ E3) → E4. Report at the phase gate, not per WP.*
