# Phase E — Completion · Handoff to the Mesh (E1 + E2 + E3 + E4)

> **From:** Kidus Abdula (Architect) via Opus 4.8 BRAIN
> **To:** Orchestrator → **Plan** (gate) → Execute (fan-out) → Code Review → Auditor
> **Base branch:** `phase/e-skills` (E0 lands here first — see §0 step 1)
> **Standard:** Architectural DNA v1.0.0 — Six Pillars. Merge floor **≥ 8.5**, 0 Code-Review blockers, green Part 5 Phase E gate. Never push to `main`.
> **Spec inputs:** `PART4-AGENT-SKILL-SYSTEM.md` §4.1–§4.6 (canonical), `PART1 §1.5` (model routing + sandbox), `PART2 §2.5/§2.8` (envelope + WS), `PART5` Phase E gate.
> **Builds on:** E0 Hermes runtime (`feat/e-hermes-runtime @ a5fe095`) — audited **8.7/10 GREEN**, F1 + F2 closed.

---

## 0. Short message to paste to the Orchestrator

> **Orchestrator — complete Phase E on `phase/e-skills`.** E0 (Hermes runtime) is signed off at 8.7 with F1+F2 fixed (`feat/e-hermes-runtime @ a5fe095`, all gates green). **Step 1: merge `feat/e-hermes-runtime` → `phase/e-skills`** (WP checkpoint passed) so the rest of the phase builds on the runtime. **Route to Plan FIRST** — this remainder is Plan-gated. Plan MUST resolve the **§3 blocking gap** (what `/v1/skill/run` actually executes) before any skill doc is authored, because it decides the shape of all 29 docs. Then fan out **E1 (11 foundational skills) ∥ E2 (18 workflow skills) ∥ E3 (pinned MCP image) → E4 (cron)** per §4. Build the remainder as **one large unit on `phase/e-skills`**; run the **holistic Phase E gate (§6) once** on the integrated branch; roll any P0/P1 into the Phase F handoff rather than recircling. Do **not** promote `phase/e-skills` to `develop`/`main` — that is the architect's call after the gate is green. Report at the phase gate.

---

## 1. Where we are

| WP | State |
|----|-------|
| **E0** Hermes runtime | ✅ built + audited **8.7 GREEN** (`a5fe095`); F1 (sandbox tmp-dir) + F2 (boot-fail-on-missing-chain) **fixed & regression-tested**. On `feat/e-hermes-runtime`, **not yet merged** to `phase/e-skills`. |
| **E1** foundational skills | 🔜 this handoff |
| **E2** workflow skills | 🔜 this handoff |
| **E3** pinned MCP image | 🔜 this handoff |
| **E4** cron | 🔜 this handoff |
| F Deploy & Polish | pending (folds the carryover ledger — see §7) |

E0 gives us a runtime that boots, resolves model chains, streams `/v1/chat/stream`, loads skill docs, and stubs `/v1/skill/run`, `/v1/skills`, `/v1/mcp/test`, `/v1/cron`. **This handoff fills those stubs with real content and makes the holistic Phase E gate pass on real calls.**

## 2. What already exists (build against this — do NOT duplicate or re-architect)

Grounded in the committed tree, not the spec:

- **`apps/hermes/src/lib/skill-loader.ts`** — reads `SKILLS_DIR/{foundational,workflow}/*.md`, parses frontmatter (gray-matter), validates against `skillDocSchema`, **skips malformed docs without crashing**. Exposes `getSkillByName`, `getLoadedSkills`, `getAlwaysLoadedSystemContext` (concatenates `always_loaded` bodies into the system prompt), `toMeta` (→ `GET /v1/skills`). **E1/E2 author docs against THIS loader.**
- **`packages/shared/src/schemas/skill-doc.schema.ts`** — the frontmatter contract (SSOT). Required keys: `name` (≤120), `description` (≤280), `trigger[]` (≥1), `tools_required[]`, `category` (8-bucket enum: `swe｜devops｜content｜research｜communication｜analysis｜general｜foundational`), `estimated_time` (regex `^\d+(-\d+)?\s+(seconds?|minutes?|hours?)$`), `always_loaded` (default false), `preferred_model_role?` (`planning｜coding｜office｜fast｜audit`). **Every doc MUST validate or it is silently skipped — a skipped doc fails the §6 gate.**
- **`apps/hermes/src/config/env.ts`** — `SKILLS_DIR` defaults to **`/app/data/skills`** (container path). Docs are authored at `apps/hermes/skills/{foundational,workflow}/`. **The Dockerfile must `COPY apps/hermes/skills → /app/data/skills`** — verify this COPY exists; if not, E1 adds it (else zero skills load in the image).
- **`apps/hermes/src/routes/skill-run.ts`** — `POST /v1/skill/run` → `{run_id}` 202, runs async via `spawnSubAgent({ code: doc.body, language: "node" })`, broadcasts progress over WS. **⚠️ This is the §3 gap — see below.**
- **`apps/hermes/src/routes/mcp-test.ts`** — `POST /v1/mcp/test`. E0 stub returns `{ok:false, error:"MCP not configured"}`. Launch-set allow-list already hard-coded: **`github, vercel, notion, supabase, filesystem, browser, gmail, slack, linear`** (9). **E3 replaces the stub body with a real stdio/JSON-RPC probe.**
- **`apps/hermes/src/routes/cron-list.ts`** — `GET /v1/cron`, in-memory registry stub. **E4 populates it and wires the scheduler.**
- **`apps/hermes/src/sandbox/{spawn,orchestrator}.ts`** — sandboxed code-exec, F1-fixed: `runUntrustedCode` writes `snippet.cjs` into its own taskDir, depth-1 cap, secrets stripped (`FORBIDDEN_ENV_KEYS`). The node path now works end-to-end (smoke test green).
- **`docker-compose.yml`** — already declares `mcp-github` (`apps/mcp-github/Dockerfile`) and `mcp-vercel` (`apps/mcp-vercel/Dockerfile`), `docker-socket-proxy` pinned `0.3.0`, `jarvis-internal` network. **E3 adds the remaining pinned images + Dockerfiles.**

## 3. ⚠️ BLOCKING gap Plan MUST resolve before any doc is authored

**What does `/v1/skill/run` execute?** The E0 route runs **`doc.body` as node code** in the sandbox. But:
- The **foundational** skills (E1) are LLM **system-context markdown** — they are injected via `getAlwaysLoadedSystemContext()`, never executed.
- Most **workflow** skills (E2) are **instructions the agent follows** (trigger phrases, steps, tool calls), not literal node programs.

So `doc.body` is dual-purpose and the route currently assumes one purpose. Plan must pick ONE model and reconcile the route + schema + all docs in the same unit:

- **(A) Context-only skills + agentic run** *(recommended)* — skill bodies are markdown. `/v1/skill/run` loads the named skill into the system prompt and drives an **LLM turn** with the declared `tools_required`; the sandbox is invoked only when the model emits a code tool-call. No skill body is ever `eval`'d. Cleanest match to Part 4's "skills are instructions."
- **(B) Explicit executable flag** — add `executable: true` to the frontmatter schema; only those skills carry a node-code body and reach `spawnSubAgent({code: doc.body})`; all others are context-only. Smaller change to E0, but couples authoring to runtime shape.

Pick one, update `skill-doc.schema.ts` + `skill-run.ts` accordingly, THEN author the 29 docs against the settled contract. **This is the serial gate of this unit — the same discipline E0 applied to the path/contract inconsistencies.** Request a Tech Lead consult.

## 4. Scope — Phase E remainder as one large unit

`E1 ∥ E2 ∥ E3 → E4`, all on `phase/e-skills`, gated together (§6).

| WP | Scope | Grounding |
|----|-------|-----------|
| **E1 — foundational skills** | 11 docs in `apps/hermes/skills/foundational/` (Part 4 §4.1): 6 agent-derived + 5 DNA skills, frontmatter-valid, `category: foundational`. `architectural-dna.md` → `always_loaded: true` (the only always-on doc). Verify/add the Dockerfile `COPY … → /app/data/skills`. **First consumer of the F1-fixed node path** if model (B) is chosen — add one executable smoke skill. | loader + schema above; §3 decision |
| **E2 — workflow skills** | 18 docs in `apps/hermes/skills/workflow/` (Part 4 §4.2): 9 SWE/DevOps + 9 comms/business. Each: ≥1 `trigger` phrase, exact `tools_required` (names matching the §4.6 launch set), numbered steps, error handling, quality checks, `estimated_time`, `preferred_model_role`. All must appear in `GET /v1/skills`. | §6 gate line 1 |
| **E3 — pinned MCP image** | Prebuilt Dockerfile(s) under `apps/mcp-*` with **exact-pinned** versions + corrected package names (Part 4 §4.6 — closes **C4/H2**). Launch set = the 9 in `mcp-test.ts`. **No `npx -y latest` at runtime.** Then replace the `mcp-test.ts` stub with a real stdio/JSON-RPC probe so `POST /v1/mcp/test {server}` returns live `tools[]`. GitHub via docker image; Filesystem scoped `/workspace`; Supabase read-scoped; Browser `@playwright/mcp`; Vercel hosted OAuth. | `mcp-test.ts`, compose `mcp-github`/`mcp-vercel` |
| **E4 — cron** | Scheduler → registry behind `GET /v1/cron`. Cron writes go through the **`@jarvis/shared` factory** into `workflows`/`workflow_runs` (no bespoke SQL). Morning-audit **8 AM** job → chat summary + **Telegram** notify. Wire the C5 model boot-check into the cron health surface. | `cron-list.ts` stub; B3 |

## 5. Contract stubs to fill (Part 4 §4.4 — already surfaced by E0)

```
GET  /v1/skills    → { skills: SkillMeta[] }   E1+E2 populate; every authored doc must appear
POST /v1/skill/run → { run_id }; progress over WS   §3 decision wires the real execution path
POST /v1/mcp/test  → { server, ok, tools[] }   E3 replaces the "MCP not configured" stub
GET  /v1/cron      → { jobs: CronJobMeta[] }   E4 populates + schedules
```
Errors keep mapping to the `UPSTREAM_ERROR` envelope (§2.5). Secrets (`SUPABASE_SERVICE_ROLE_KEY`/`JWT_SECRET`) stay in the Hermes container — never logged, never returned. H1 holds: Docker only via `docker-socket-proxy`; no raw socket; sandbox non-root + capped.

## 6. Phase E gate — run ONCE on integrated `phase/e-skills` (Part 5 §6, real calls)

```
[ ] All 18 workflow skill docs valid + loaded (GET /v1/skills returns all 18)
[ ] 11 foundational docs loaded; architectural-dna injected into the system prompt
[ ] "morning audit" via chat → real GitHub/Notion/Gmail summary
[ ] "ship feature X" → branch + PR created (NEVER pushes to main directly)
[ ] "deploy to Vercel" → Vercel hosted MCP confirms deployment
[ ] Cron morning audit fires 8 AM → notifies chat + Telegram
[ ] Each MCP server responds to a tool call (POST /v1/mcp/test per server → ok:true, tools[])
[ ] Sub-agent spawning: complex task → isolated sub-agent → result collected (F1 path live)
```
Plus standing DNA gates (re-run on the **merged** branch, not per-WP — phase-gate integrity): `tsc --noEmit` 0 · any-gate 0 · color-gate 0 · types from `@jarvis/shared` · Zod at boundaries · factory CRUD only · type-drift green · `pnpm -F @jarvis/hermes test` green. **Tech-Lead checks:** model IDs resolve at boot (C5); sandbox cannot reach the host socket (H1).

## 7. Carry-forward — do NOT pull into this unit (assigned to Phase F)

From the E0 audit, deferred and tracked — these are **not** required fixes for this handoff:

| ID | Item | Lands in |
|----|------|----------|
| E0-F3 | Budget gate inert (`estimateCostUsd → 0`) and unwired from the chat path. | **F** — price + wire `checkAndIncrement` into `chat-stream.ts`; drop the `void getResolved;` keepalive |
| E0-F4 | `apps/api/tsconfig.json` doesn't override root `noEmit:true` → API image build emits nothing (pre-existing, not E-caused). | **F** — 1-line `"noEmit": false` |
| E0-F5 | Cosmetics: `docker-control.stats()` single-sample cpu%, unused `BOOT_CHECK_INTERVAL_MS`, unpinned `corepack prepare pnpm@latest` in the Dockerfile. | **F** / opportunistic |
| C-D1…C-LIVE | Phase D carryover ledger (mobile WS `:4000`, push projectId, `/api/services` envelope, runs batch endpoint, live CMS smoke). | **F** / live-gate checklist |

## 8. Definition of Done (per WP, before Code Review)

Scope matches approved plan · generated types only · no `any` · Zod at boundaries · factory CRUD · **every skill doc validates against `skill-doc.schema.ts`** · MCP versions pinned exactly (no `latest`/`-y`) · Conventional Commits + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` · PR cites WP id + Part/section + audit IDs closed (C4/C5/H1/H2) · deviations documented · **the holistic §6 gate is run on the integrated `phase/e-skills`, not per-WP.**

---

*Phase E completion handoff — © 2026 Kidus Abdula / VersaLabs Studio. Plan-gated: resolve §3 before authoring any skill doc.*
