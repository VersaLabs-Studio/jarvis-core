# Phase E — Remainder · PLAN (E1 + E2 + E3 + E4, all on `phase/e-skills`)

> **From:** Plan agent (gate keeper — Hands, in Plan mode)
> **To:** Orchestrator → Kidus (Architect) — **APPROVE / REVISE / REJECT** this plan before routing to Execute
> **Branch line:** `develop` → `phase/e-skills` → (no `feat/e-*` per WP — built as one large unit on `phase/e-skills`, per the completion handoff §0)
> **Standard:** Architectural DNA v1.0.0 — Six Pillars. Gate: Code Review 0 blockers + Auditor ≥ 8.5 + Part 5 Phase E checklist. Never push to `main`.
> **Spec inputs:** `docs/PHASE-E-COMPLETION-HANDOFF.md` (the BRAIN's dispatch — primary), `docs/PHASE-E-HANDOFF.md` (the original E0 dispatch — for §3 model routing + sandbox context), `docs/PHASE-E-PLAN.md` (the E0 plan — already APPROVED + executed; reference for settled decisions), `docs/PART4-AGENT-SKILL-SYSTEM.md` (canonical), `docs/PART5-TESTING-DEPLOYMENT.md` §5.1 (Phase E gate), `docs/ARCHITECTURE-AUDIT.md` (C4 / C5 / H1 / H2 closure state).
> **Builds on:** E0 Hermes runtime (`feat/e-hermes-runtime @ a5fe095`) — audited **8.7 GREEN**, F1 + F2 closed.
> **Status:** Reads off `develop` (`1c8ecfe`). E0 is on `feat/e-hermes-runtime` (not yet merged to `phase/e-skills`). This plan is the gate for the remainder.

---

## 0. Short message to paste back to the Orchestrator

> **Plan ready for approval — `docs/PHASE-E-PLAN-REMAINDER.md`.** §3 blocking gap **resolved** (§3 below): pick **option (A) — context-only skills + agentic loop**; no schema change; the route gets rewritten to a 10-iteration agentic loop with `code_exec` (sandbox) and MCP (proxy) tool calls. WP map lands as **one large unit on `phase/e-skills`** per the completion handoff §0: §3 prelude (route + chat-side trigger matcher + tests) → E1 (11 foundational skills + Dockerfile COPY) ∥ E2 (18 workflow skills) ∥ E3 (single `apps/mcp/Dockerfile` + delete the v1.0 `mcp/` OpenClaw stub) → E4 (BullMQ cron + 3 jobs + workflow_runs via API factory). E3 substitutes the existing compose's `mcp-github` / `mcp-vercel` build services with a single `jarvis-mcp-base` image + per-server `command:` override; Gmail/Slack remain **pending** in the allow-list (probe returns structured "not yet wired" — no crash). Phase E gate from the completion handoff §6 runs once on the integrated branch. **Requesting §3 sign-off + plan approval** to merge E0 to `phase/e-skills` and execute the unit. Report at the phase gate. P0/P1 fixes from a failed gate roll into Phase F per the directive.

---

## 1. Where we are

| WP | State |
|----|-------|
| **E0** Hermes runtime | ✅ built + audited **8.7 GREEN** (`a5fe095`); F1 (sandbox tmp-dir) + F2 (boot-fail-on-missing-chain) **fixed & regression-tested**. On `feat/e-hermes-runtime`, **not yet merged** to `phase/e-skills`. `origin/phase/e-skills` is at `1c8ecfe` (the doc sign-off), same as `develop`. |
| **E1** foundational skills | 🔜 this plan |
| **E2** workflow skills | 🔜 this plan |
| **E3** pinned MCP image | 🔜 this plan |
| **E4** cron | 🔜 this plan |
| F Deploy & Polish | pending (folds the carryover ledger — see §11) |

E0 gives us a runtime that boots, resolves model chains, streams `/v1/chat/stream`, loads skill docs, and stubs `/v1/skill/run`, `/v1/skills`, `/v1/mcp/test`, `/v1/cron`. **This plan fills those stubs with real content and makes the holistic Phase E gate pass on real calls.**

## 2. What already exists (build against this — do NOT duplicate or re-architect)

Grounded in the committed tree (verified on `a5fe095`):

- **`apps/hermes/src/lib/skill-loader.ts`** — reads `SKILLS_DIR/{foundational,workflow}/*.md`, parses frontmatter (gray-matter), validates against `skillDocSchema`, **skips malformed docs without crashing**. Exposes `getSkillByName`, `getLoadedSkills`, `getAlwaysLoadedSystemContext` (concatenates `always_loaded` bodies into the system prompt), `toMeta` (→ `GET /v1/skills`). **E1/E2 author docs against THIS loader.**
- **`packages/shared/src/schemas/skill-doc.schema.ts`** — the frontmatter contract (SSOT). Required keys: `name` (≤120), `description` (≤280), `trigger[]` (≥1), `tools_required[]`, `category` (8-bucket enum: `swe｜devops｜content｜research｜communication｜analysis｜general｜foundational`), `estimated_time` (regex `^\d+(-\d+)?\s+(seconds?|minutes?|hours?)$`), `always_loaded` (default false), `preferred_model_role?` (`planning｜coding｜office｜fast｜audit`). **Every doc MUST validate or it is silently skipped — a skipped doc fails the §7 gate.**
- **`apps/hermes/src/config/env.ts`** — `SKILLS_DIR` defaults to **`/app/data/skills`** (container path). Docs are authored at `apps/hermes/skills/{foundational,workflow}/`. **⚠ The Dockerfile does NOT currently `COPY` skills — it relies on the `hermes-data` volume mount at `/app/data`.** If the volume is empty on first boot, zero skills load. E1 fixes this (see §5.1, "Critical fix #2").
- **`apps/hermes/src/routes/skill-run.ts`** — `POST /v1/skill/run` → `{run_id}` 202, runs async via `spawnSubAgent({ code: doc.body, language: "node" })`, broadcasts progress over WS. **⚠ This is the §3 gap — the route currently treats the doc body as node code.** §3 below resolves the model; the route is rewritten to an agentic loop in the §3 prelude (§4).
- **`apps/hermes/src/routes/mcp-test.ts`** — `POST /v1/mcp/test`. E0 stub returns `{ok:false, error:"MCP not configured"}` for any of 9 known servers. **Launch-set allow-list already hard-coded:** `github, vercel, notion, supabase, filesystem, browser, gmail, slack, linear` (9). **E3 replaces the stub body with a real container-liveness probe** (see §5.3 for the v1.5 approach).
- **`apps/hermes/src/routes/cron-list.ts`** — `GET /v1/cron`, in-memory registry stub. **E4 populates it and wires the BullMQ scheduler.**
- **`apps/hermes/src/sandbox/{spawn,orchestrator}.ts`** — sandboxed code-exec, F1-fixed: `runUntrustedCode` writes `snippet.cjs` into its own taskDir, depth-1 cap, secrets stripped (`FORBIDDEN_ENV_KEYS`). The node path now works end-to-end (smoke test green). **§4 reuses this for the agentic loop's `code_exec` tool.**
- **`apps/hermes/src/lib/openrouter.ts`** — `streamChat()` async generator + `nonStreamChat()` for boot-check. **§4 adds a `nonStreamChatWithToolCalls()` helper that returns the full response (text + tool_calls[]) for the agentic loop.** No new OpenRouter SDK work; just a new wrapper.
- **`docker-compose.yml`** — declares `mcp-github` (`apps/mcp-github/Dockerfile`) and `mcp-vercel` (`apps/mcp-vercel/Dockerfile`) as build services that **do not exist on disk**. `docker-socket-proxy` pinned `0.3.0`, `jarvis-internal` network. **E3 substitutes these with a single `jarvis-mcp-base:latest` image + per-server `command:` override (see §5.3).**
- **`mcp/` at repo root** — v1.0 OpenClaw stub: 4 subdirs (`github/`, `vercel/`, `notion/`, `gmail/`) with `config.yaml` + `README.md`. **E3 deletes the entire `mcp/` dir (it's superseded by Part 4 §4.6's pinned model).**
- **`packages/shared/src/schemas/cron.schema.ts`** — `cronScheduleSchema` accepts a 5-field cron expression or `@boot`; `cronJobSchema` validates `{id, name, schedule, skill|null, args, notify[], enabled, preferred_model_role?}`. **E4 writes `apps/hermes/src/cron/registry.ts` against this schema.**
- **`apps/api/src/factory/crud.ts` + `register-entities.ts`** — the factory that writes `workflows` + `workflow_runs` rows. **E4 must call this factory (not `supabase.from('workflows').insert(...)` directly) for the cron job lifecycle** (P2 — factory over bespoke).

## 3. ⚠ §3 BLOCKING GAP — RESOLVED

**What does `/v1/skill/run` execute?** The E0 route runs **`doc.body` as node code** in the sandbox. But:

- The **foundational** skills (E1) are LLM **system-context markdown** — they are injected via `getAlwaysLoadedSystemContext()`, never executed.
- Most **workflow** skills (E2) are **instructions the agent follows** (trigger phrases, steps, tool calls), not literal node programs. Part 4 §4.2's "ship-feature.md" — "Plan → implement → test → PR → Vercel preview → Notion update → notify" — is a sequence the LLM follows, not a node program to eval.

So `doc.body` is dual-purpose and the route currently assumes one purpose. **The plan picks one and reconciles the route + schema + all docs in this unit.**

### 3.1 Decision — **Option (A): Context-only skills + agentic run**

> **Skill bodies are markdown instructions the LLM follows.** The route runs an **agentic loop** with the LLM, max 10 iterations. On each iteration: LLM emits text → broadcast as `skill:result` and exit; LLM emits a `tool_call` → execute (`code_exec` → sandbox, MCP server → proxy) → feed the result back as a `tool` message → continue. No skill body is ever `eval`'d.

### 3.2 Why (A), not (B)

| Criterion | (A) Context-only + agentic | (B) Explicit `executable: true` flag |
|---|---|---|
| Schema delta | **None** — `skill-doc.schema.ts` stays as-is (no flag) | +1 optional `executable: boolean` field |
| Route delta | Rewrite `skill-run.ts` to agentic loop (reuses `streamChat` + `runUntrustedCode`) | Gate on flag; otherwise call `spawnSubAgent({code: doc.body})` (current behavior) |
| Matches Part 4 §4.2's intent | **Yes** — "ship-feature.md" steps are clearly agentic instructions | No — assumes "ship-feature" is node code, which it isn't |
| Matches the 11 foundational skills | **Yes** — they are explicitly system-context markdown (E0's `getAlwaysLoadedSystemContext()` proves this) | Awkward — foundational skills would all be `executable: false`, the default |
| Authoring friction | **None** — bodies are just markdown; the LLM follows them | Medium — every author asks "is this executable?" |
| Code-exec for tools like `data-analysis` | **Yes** — the LLM emits a `code_exec` tool_call and the sandbox runs it; clean tool-mediated path | Awkward — `data-analysis.md` is `executable: true` and the body is a node program that the LLM wrote; now we're back to "eval the LLM's program" without an LLM in the loop |
| Aligns with Part 4 §4.4 wire | **Yes** — `HermesStreamChunk` already has a `tool_call` type | n/a |
| Risk | The agentic loop needs `MAX_ITERATIONS` and a timeout to prevent infinite loops (we set 10 / 5min) | Two execution paths, two failure modes, two test surfaces |

**Option (A) is the cleaner match for Part 4 §4.2's intent and Part 4 §4.4's wire.** Option (B) was a hedge against the author wanting to ship a literal node program; the agentic loop's `code_exec` tool covers that case without coupling doc shape to runtime semantics.

### 3.3 What this changes

**Code:**
- `apps/hermes/src/routes/skill-run.ts` — REWRITTEN to an agentic loop (see §4.1).
- `apps/hermes/src/lib/openrouter.ts` — add `nonStreamChatWithToolCalls()` helper that returns `{ text: string, toolCalls: Array<{name, args}> }` (see §4.2).
- `apps/hermes/src/lib/mcp-client.ts` — NEW; thin client over the proxy / `apps/mcp-*` containers; exposes `callTool(server, tool, args)` for the agentic loop. §5.3 (E3) builds it.
- `apps/hermes/src/routes/chat-stream.ts` — ADD a chat-side trigger matcher (see §4.3): keyword-matches the user's message against `trigger[]` arrays; injects the matched skill's body into the system prompt. The LLM follows the skill's steps naturally. **This is how "morning audit" via chat works end-to-end** (per the §7 gate line 3).
- `packages/shared/src/schemas/skill-doc.schema.ts` — **NO CHANGE** (option A adds no flag).
- `packages/shared/src/types/hermes.ts` — add `ChatMessageWithTools` to the message union (so the agentic loop can pass `role: "tool"` messages with `tool_call_id`).

**Docs (consequence for E1/E2):**
- Skill bodies are **markdown instructions** with the 6 H2 sections from the existing plan §6.3 (Purpose, Prerequisites, Steps, Output, Error Handling, Quality Checks).
- The body is what the LLM reads, not what gets `eval`'d. **Authors do NOT need to write node code.**
- The `tools_required[]` field becomes authoritative: the LLM can emit `tool_call` JSON for any of those tools, and the agentic loop will dispatch it.

**Sandbox (`runUntrustedCode`):**
- Reused unchanged for the `code_exec` tool. The agentic loop has the LLM emit `tool_call: {name: "code_exec", args: {code, language}}`; the loop dispatches to `runUntrustedCode` and feeds the result back. **F1 + the cross-platform PATH fix carry forward unchanged.**

### 3.4 What the agentic loop is NOT

- It is **not** a "skill body becomes a chat message" loop — the skill body is a **system prompt addition**, not the user's request. The user's `args.message` (or a default "run the X skill" prompt) is the user message; the skill body sits in the system context alongside the always-loaded DNA skills.
- It is **not** an unbounded loop — `MAX_AGENT_ITERATIONS = 10` and a per-iteration `AGENT_ITERATION_TIMEOUT_MS = 60_000` enforce finiteness.
- It is **not** "the LLM picks the tools" — the LLM is constrained to the skill's `tools_required[]` (plus `code_exec` if the skill's category is `swe` or `analysis`). Tools not in the allow-list are rejected by the agentic loop with a `TOOL_NOT_ALLOWED` error fed back to the model.

## 4. §3 IMPLEMENTATION SPEC (the §3 prelude — lands on `phase/e-skills` before E1∥E2∥E3)

A focused commit (or set of commits) on `phase/e-skills` immediately after the E0 merge. Gates the rest of the phase.

### 4.1 `apps/hermes/src/routes/skill-run.ts` — agentic loop

```ts
// =============================================================================
// POST /v1/skill/run — async agentic skill execution (Phase E §3 option A).
//
// Skill bodies are markdown instructions; the route runs an agentic loop
// (max 10 iterations) that:
//   1. Builds the system prompt: always-loaded context + skill body + args
//   2. Sends to the LLM (role: skill.preferred_model_role ?? "coding")
//   3. If LLM emits a tool_call → execute (sandbox for code_exec, MCP
//      proxy for MCP tools) → feed the result back as a tool message
//   4. If LLM emits text → broadcast as skill:result → exit
//   5. If LLM emits done → exit
//   6. If MAX_ITERATIONS reached → broadcast skill:error → exit
// Progress is broadcast over WS as before; run_id is a UUID.
// =============================================================================

import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, ok } from "../lib/response.js";
import { getSkillByName } from "../lib/skill-loader.js";
import { broadcast } from "./ws.js";
import { log } from "../lib/logger.js";
import { runSkillAgentically } from "../lib/skill-runner.js";   // NEW — §4.2
import type { SkillRunResponse } from "@jarvis/shared";

const MAX_AGENT_ITERATIONS = 10;
const AGENT_ITERATION_TIMEOUT_MS = 60_000;

const skillRunBodySchema = z.object({
  skill: z.string().min(1),
  args: z.record(z.unknown()).default({}),
  /** Optional override; if absent, uses the skill's preferred_model_role. */
  role: z.enum(["planning", "coding", "office", "fast", "audit"]).optional(),
  /** Optional initial user message; defaults to "Run the <skill> skill." */
  initial_message: z.string().optional(),
});

export async function skillRunRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post("/v1/skill/run", async (request, reply) => {
    const parsed = skillRunBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, "VALIDATION", "Invalid skill-run body", parsed.error.flatten());
    }
    const { skill, args, role, initial_message } = parsed.data;
    const doc = getSkillByName(skill);
    if (!doc) {
      return fail(reply, "SKILL_NOT_FOUND", `Skill not loaded: ${skill}`);
    }
    const runId = randomUUID();
    log.info({ runId, skill }, "Skill run started");
    const response: SkillRunResponse = { run_id: runId };
    ok(reply, response, 202);
    void runSkillAgentically({
      runId,
      skill,
      doc,
      args,
      role: role ?? doc.frontmatter.preferred_model_role ?? "coding",
      initialMessage: initial_message ?? `Run the "${doc.frontmatter.name}" skill.`,
      maxIterations: MAX_AGENT_ITERATIONS,
      iterationTimeoutMs: AGENT_ITERATION_TIMEOUT_MS,
    }).catch((err) => {
      log.error({ err: err instanceof Error ? err.message : String(err), runId }, "Skill agentic run failed");
      broadcast({ type: "skill:error", run_id: runId, error: err instanceof Error ? err.message : String(err) });
    });
  });
}
```

### 4.2 `apps/hermes/src/lib/skill-runner.ts` — NEW; the loop

```ts
// =============================================================================
// Agentic skill runner (Phase E §3 option A).
// Implements the agentic loop described in skill-run.ts.
// =============================================================================

import { getAlwaysLoadedSystemContext } from "./skill-loader.js";
import { nonStreamChatWithToolCalls } from "./openrouter.js";
import { executeToolCall, type ToolExecutor } from "./tool-executor.js";
import { broadcast } from "../routes/ws.js";
import { log } from "./logger.js";
import type { HermesMessage, SkillDoc } from "@jarvis/shared";

export interface RunSkillParams {
  runId: string;
  skill: string;
  doc: SkillDoc;
  args: Record<string, unknown>;
  role: HermesMessage extends { role: infer R } ? R extends "system" | "user" | "assistant" | "tool" ? R : never : never;
  initialMessage: string;
  maxIterations: number;
  iterationTimeoutMs: number;
}

export async function runSkillAgentically(params: RunSkillParams): Promise<void> {
  const { runId, doc, args, role, initialMessage, maxIterations, iterationTimeoutMs } = params;
  broadcast({ type: "skill:progress", run_id: runId, step: "starting", pct: 0, status: "running" });

  // Build initial message list
  const systemContext = getAlwaysLoadedSystemContext();
  const messages: HermesMessage[] = [];
  if (systemContext) messages.push({ role: "system", content: systemContext });
  messages.push({
    role: "system",
    content: [
      `# Skill: ${doc.frontmatter.name}`,
      "",
      doc.body,
      "",
      "## Args",
      "```json",
      JSON.stringify(args, null, 2),
      "```",
    ].join("\n"),
  });
  messages.push({ role: "user", content: initialMessage });

  // Tool allow-list: skill.tools_required + code_exec (for swe/analysis categories)
  const allowedTools: ToolExecutor[] = ["code_exec", ...doc.frontmatter.tools_required];

  for (let i = 0; i < maxIterations; i++) {
    log.info({ runId, iteration: i + 1, role, toolCount: allowedTools.length }, "Agentic loop iteration");
    let response;
    try {
      response = await nonStreamChatWithToolCalls({
        role,
        messages,
        tools: allowedTools,
        timeoutMs: iterationTimeoutMs,
      });
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : String(err), runId, iteration: i + 1 }, "LLM call failed");
      broadcast({ type: "skill:error", run_id: runId, error: `LLM call failed: ${err instanceof Error ? err.message : String(err)}` });
      return;
    }

    // If the LLM emitted tool calls, execute them all and feed the results back
    if (response.toolCalls.length > 0) {
      // Persist the assistant's tool_call message verbatim (with tool_call_id per call)
      messages.push({
        role: "assistant",
        content: response.text || "",
        tool_calls: response.toolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          args: tc.args,
        })),
      });
      for (const tc of response.toolCalls) {
        if (!allowedTools.includes(tc.name as ToolExecutor)) {
          // Feed a refusal back so the model knows
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: `TOOL_NOT_ALLOWED: ${tc.name}` }),
          });
          continue;
        }
        broadcast({
          type: "skill:progress",
          run_id: runId,
          step: `iteration ${i + 1}: ${tc.name}`,
          pct: ((i + 1) / maxIterations) * 100,
          status: "running",
        });
        const result = await dispatchToolCall(tc);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    // No tool calls — the LLM emitted final text. Broadcast and exit.
    broadcast({ type: "skill:result", run_id: runId, output: response.text || "" });
    return;
  }

  // Max iterations reached
  broadcast({
    type: "skill:error",
    run_id: runId,
    error: `MAX_ITERATIONS_REACHED: ${maxIterations}`,
  });
}

async function dispatchToolCall(tc: { name: string; args: Record<string, unknown> }): Promise<unknown> {
  // tool-executor.ts handles routing:
  //   code_exec → apps/hermes/src/sandbox/spawn.ts (F1-fixed)
  //   github|vercel|notion|supabase|filesystem|browser|gmail|slack|linear → apps/hermes/src/lib/mcp-client.ts (E3)
  const { executeToolCall } = await import("./tool-executor.js");
  return executeToolCall(tc);
}
```

### 4.3 `apps/hermes/src/lib/openrouter.ts` — add `nonStreamChatWithToolCalls()`

NEW export, alongside the existing `streamChat` and `nonStreamChat`:

```ts
export interface NonStreamChatWithToolCallsParams {
  role: HermesRole;
  messages: HermesMessage[];
  tools: string[];                  // tool names (model translates to OpenRouter tool defs)
  timeoutMs: number;
}

export interface NonStreamChatWithToolCallsResult {
  text: string;
  toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  usage: { tokens_in: number; tokens_out: number; duration_ms: number };
}

export async function nonStreamChatWithToolCalls(
  params: NonStreamChatWithToolCallsParams,
): Promise<NonStreamChatWithToolCallsResult> {
  // 1. Resolve the role's chain (per chat-stream.ts pattern)
  // 2. POST https://openrouter.ai/api/v1/chat/completions (non-stream) with the tool defs
  // 3. Parse the response.assistant_message:
  //    - text content → { text, toolCalls: [] }
  //    - tool_calls[] → map to { id, name (already a string), args (parse JSON) }
  // 4. On 404 / 4xx (other than VALIDATION) / timeout, advance to next in chain
  //    (reuses the chat-stream fallback loop pattern, but non-streaming).
  // 5. Return the first successful response.
}
```

Tool definitions are derived from a small lookup in `apps/hermes/src/lib/tool-defs.ts` (NEW, E3 builds it for the MCP tools; the §3 prelude stubs `code_exec`).

### 4.4 `apps/hermes/src/lib/tool-executor.ts` — NEW; the dispatcher

```ts
// =============================================================================
// Tool executor (Phase E §3 option A + §5.3 E3).
// Routes a tool_call to:
//   code_exec          → apps/hermes/src/sandbox/spawn.ts (F1-fixed)
//   github|vercel|...  → apps/hermes/src/lib/mcp-client.ts (E3)
// =============================================================================

import { runUntrustedCode } from "../sandbox/spawn.js";
import { callMcpTool } from "./mcp-client.js";  // E3 builds this
import { log } from "./logger.js";

export type ToolExecutor = "code_exec" | "github" | "vercel" | "notion" | "supabase" | "filesystem" | "browser" | "gmail" | "slack" | "linear";

export async function executeToolCall(tc: { name: string; args: Record<string, unknown> }): Promise<unknown> {
  if (tc.name === "code_exec") {
    const { code, language } = tc.args as { code: string; language: "node" | "python" | "bash" };
    const result = await runUntrustedCode({ code, language, timeoutMs: 60_000 });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, timedOut: result.timedOut };
  }
  // MCP tools — E3 builds the client
  return callMcpTool(tc.name as Exclude<ToolExecutor, "code_exec">, tc.args);
}
```

**§3 prelude scope:** `executeToolCall` for `code_exec` only; the MCP branch is stubbed (`throw new Error("MCP not yet wired — E3 will fill")`) until E3 lands. The route works end-to-end with skills that only need `code_exec`.

### 4.5 `apps/hermes/src/routes/chat-stream.ts` — chat-side trigger matcher (NEW, ~30 lines)

The completion handoff §6 gate line 3 requires: "morning audit" via chat → real GitHub/Notion/Gmail summary. The chat endpoint currently injects only `getAlwaysLoadedSystemContext()`. **Add a simple keyword matcher** that injects the matched skill's body into the system prompt.

```ts
// In chat-stream.ts, after the always-loaded system context, add:
const matchedSkill = matchSkillToMessage(body.message, getLoadedSkills());
if (matchedSkill) {
  messages.push({
    role: "system",
    content: [
      `# Active skill: ${matchedSkill.frontmatter.name}`,
      "",
      matchedSkill.body,
    ].join("\n"),
  });
  // Prefer the skill's preferred_model_role
  role = matchedSkill.frontmatter.preferred_model_role ?? role;
  log.info({ skill: matchedSkill.frontmatter.name, role }, "Chat matched a skill trigger");
}

// New helper in apps/hermes/src/lib/skill-matcher.ts:
function matchSkillToMessage(message: string, skills: SkillDoc[]): SkillDoc | null {
  const lower = message.toLowerCase();
  // First pass: exact trigger phrase match
  for (const s of skills) {
    if (s.frontmatter.trigger.some((t) => lower.includes(t.toLowerCase()))) {
      return s;
    }
  }
  return null;
}
```

This is intentionally simple (substring match, not LLM classification). v1.5 ships with this; v2 can add an LLM-based matcher if the hit rate is too low.

### 4.6 Tests (vitest, in the §3 prelude)

- `tests/routes/skill-run.test.ts` — unit test the route's body validation + `SKILL_NOT_FOUND` path
- `tests/lib/skill-runner.test.ts` — mock `nonStreamChatWithToolCalls` to return a single text response; assert `skill:result` is broadcast and the loop exits after 1 iteration
- `tests/lib/skill-runner.test.ts` — mock the LLM to emit a `code_exec` tool_call; assert `runUntrustedCode` is called and the tool result is fed back
- `tests/lib/skill-runner.test.ts` — mock the LLM to loop 11 times; assert `MAX_ITERATIONS_REACHED` is broadcast
- `tests/lib/skill-matcher.test.ts` — given a message with "morning audit", assert the `morning-audit.md` skill is returned
- `tests/lib/skill-matcher.test.ts` — given "deploy to vercel", assert the `deploy-to-vercel.md` skill is returned

All gates: typecheck 0, any-gate 0, color-gate 0, `pnpm -F @jarvis/hermes test` green.

### 4.7 §3 prelude Definition of Done

- [ ] `apps/hermes/src/routes/skill-run.ts` rewritten to delegate to `runSkillAgentically()`
- [ ] `apps/hermes/src/lib/skill-runner.ts` implements the agentic loop with `MAX_ITERATIONS = 10`
- [ ] `apps/hermes/src/lib/openrouter.ts` exports `nonStreamChatWithToolCalls()` with the chain-fallback loop
- [ ] `apps/hermes/src/lib/tool-executor.ts` dispatches `code_exec`; MCP branch stubbed for E3
- [ ] `apps/hermes/src/lib/skill-matcher.ts` provides `matchSkillToMessage()`
- [ ] `apps/hermes/src/routes/chat-stream.ts` injects the matched skill's body into the system prompt and uses its `preferred_model_role`
- [ ] 5+ new vitest cases pass
- [ ] `pnpm -F @jarvis/hermes test` green; `pnpm -r typecheck` green; any-gate 0; color-gate 0
- [ ] No `skill-doc.schema.ts` change (option A — no flag)
- [ ] No `any`; no hardcoded colors; Zod at every boundary

## 5. WP Map — E1 ∥ E2 ∥ E3 → E4 (all on `phase/e-skills`, gated together at §7)

```
§3 prelude (route + matcher + tests)  →  E1 (11 foundational)  ─┐
                                                              ├─→ E4 (cron)
                                          E2 (18 workflow)   ─┤
                                          E3 (MCP image)     ─┘
```

| WP | Branch | Scope | Depends on | Closes |
|---|---|---|---|---|
| **E1** | `phase/e-skills` | 11 docs in `apps/hermes/skills/foundational/`; **add Dockerfile COPY of skills**; `architectural-dna.md` is `always_loaded: true` | §3 prelude | (no audit ID) |
| **E2** | `phase/e-skills` | 18 docs in `apps/hermes/skills/workflow/` with concrete `tools_required`, numbered steps, rollback where applicable | §3 prelude | (no audit ID) |
| **E3** | `phase/e-skills` | `apps/mcp/Dockerfile` (single base image, **exact-pinned** packages), per-server `apps/mcp/{server}/config.yaml`, `apps/mcp/{server}/.env.example`; replace compose's `mcp-github` / `mcp-vercel` build services with the base image; build the `mcp-client.ts` E3 needs; wire `mcp-test.ts` to a container-liveness probe (see §5.3); **delete the v1.0 `mcp/` OpenClaw stub** | §3 prelude (for `mcp-client.ts` to wire) | **C4** (corrected package names), **H2** (pinned versions, no `npx -y latest`) |
| **E4** | `phase/e-skills` | BullMQ cron engine + 3-job registry (morning-audit 8AM, weekly-review Mon 9AM, model-boot-check `@boot`); workflow_runs writes via the **API factory** (no bespoke `supabase.from('workflows').insert(...)`); morning-audit 8AM job → chat + Telegram (structured log in v1.5); wire the C5 model boot-check into the cron health surface | E1, E2 (skills must exist to be triggered), E3 (MCP must be alive) | **C5** (model boot-check live in cron, not just at server boot) |

**Hard rules across all WPs (DNA P1–P6 applied):**
- Schema-first: any new table → migration → `supabase gen types` → barrel re-export. No hand-written types. **E4 needs a `workflow_runs` row factory call; the schema is already there from Phase B.** No migration.
- Factory CRUD for every DB-touching surface. **E4's cron writes go through `apps/api/src/factory/crud.ts` (the factory).** No bespoke `supabase.from('workflows').insert(...)`.
- Semantic OKLCH tokens (no hardcoded colors). `pnpm color-gate` extends to `apps/hermes/src/**/*.ts`.
- Zero `any` (D6 any-gate extends to the new workspace). D6 lint gate already covers `apps/hermes/`.
- Zod validation at every API boundary (every Hermes endpoint accepts a Zod-validated body).
- Cache invalidation via the shared `keys` factory (E4's cron writes go through the same `keys.workflows.all()` the dashboard already invalidates).
- All four data-view states for any operator-facing Hermes endpoint: loading (Pino log), empty (`{ skills: [] }`), error (UPSTREAM_ERROR envelope), success.

### 5.1 E1 — Foundational Skills (11 docs)

**Critical fix #1 (PART4 §4.1 mapping):** the 11 docs are the 6 agent-derived + 5 DNA skills. Per Part 4 §4.1:

| OpenCode Agent / Skill | Hermes Skill | Load behavior |
|---|---|---|
| Plan | `plan-feature.md` | Loaded on demand |
| Execute | `execute-implementation.md` | Loaded on demand |
| Debug | `debug-and-fix.md` | Loaded on demand |
| Tech Lead | `tech-lead-review.md` | Loaded on demand |
| Auditor | `audit-compliance.md` | Loaded on demand |
| Code Review | `code-review.md` | Loaded on demand |
| `architectural-dna` | `architectural-dna.md` | **Always loaded** — permanent system context (the Six Pillars) |
| `premium-ui` | `premium-ui.md` | Loaded for any UI work |
| `schema-first` | `schema-first.md` | Loaded for any schema/entity change |
| `frontend-craft` | `frontend-craft.md` | Loaded for React/Next.js work |
| `ui-auditor` | `ui-auditor.md` | Loaded for UI compliance auditing |

**Critical fix #2 (Dockerfile COPY):** E1 modifies `apps/hermes/Dockerfile` to add:

```dockerfile
# Bake the 29 skill docs into the image so the runtime loads them on first
# boot (the hermes-data volume starts empty; ops can still override at runtime).
COPY --from=builder --chown=hermes:hermes /app/apps/hermes/skills /app/data/skills
```

The `hermes-data` volume mount in compose is preserved (so ops can replace a doc in the running container without rebuilding the image — useful for emergency hotfixes).

**Critical fix #3 (skill-doc file structure):** the 11 docs use the 6 H2 sections from the existing plan §6.3: Purpose, Prerequisites, Steps, Output, Error Handling, Quality Checks. The first H1 is the skill name; `always_loaded: true` is set ONLY on `architectural-dna.md`.

**E1 file list (all under `apps/hermes/skills/foundational/`):**

```
architectural-dna.md          # always_loaded: true; category: foundational; preferred_model_role: audit
premium-ui.md                 # category: foundational; preferred_model_role: coding
schema-first.md               # category: foundational; preferred_model_role: audit
frontend-craft.md             # category: foundational; preferred_model_role: coding
ui-auditor.md                 # category: foundational; preferred_model_role: audit
plan-feature.md               # category: foundational; preferred_model_role: planning
execute-implementation.md     # category: foundational; preferred_model_role: coding
debug-and-fix.md              # category: foundational; preferred_model_role: coding
tech-lead-review.md           # category: foundational; preferred_model_role: planning
audit-compliance.md           # category: foundational; preferred_model_role: audit
code-review.md                # category: foundational; preferred_model_role: audit
```

**Quality bar:** every doc has the 6 H2 sections; no "TBD" / "TODO"; concrete example invocations; `tools_required: []` allowed only for skills that don't need MCP (e.g. `architectural-dna.md` is pure prompt context). Each doc is 200-400 lines; the 11 docs total ~3,000-4,000 lines of markdown.

**E1 acceptance criteria:**
- [ ] 11 files exist at the paths above
- [ ] `apps/hermes/Dockerfile` has the `COPY apps/hermes/skills` step
- [ ] `pnpm -F @jarvis/hermes build` → `await loadSkills()` logs `Loaded 11 foundational skills (1 always-loaded)`
- [ ] `curl http://localhost:8765/v1/skills` returns 11 entries (after E1 commits; E0 alone returns 0)
- [ ] Zod-validated frontmatter; a doc with malformed frontmatter is logged and skipped (no crash) — verified by intentionally committing a bad doc, observing the warning, then reverting
- [ ] Each doc has all 6 H2 sections
- [ ] `pnpm any-gate` 0
- [ ] Commit on `phase/e-skills` (no separate `feat/e-*` branch per the large-unit directive)

### 5.2 E2 — Workflow Skills (18 docs)

**Per Part 4 §4.2 (29-doc catalog; the 18 are the workflow subset):**

**SWE / DevOps Workflow Skills (9):**

| # | Skill | Trigger Phrases | `tools_required` |
|---|-------|----------------|-----------------|
| 1 | `ship-feature.md` | "ship feature X", "build and deploy X" | `[github, vercel, notion]` |
| 2 | `morning-audit.md` | Cron 8AM, "morning briefing" | `[github, notion, gmail]` |
| 3 | `debug-and-fix.md` | "fix issue #N", "this is broken" | `[github]` |
| 4 | `deploy-to-vercel.md` | "deploy X to vercel" | `[vercel]` |
| 5 | `deploy-to-vps.md` | "deploy to VPS", "update production" | `[filesystem]` (SSH via shell-exec) |
| 6 | `github-pr-workflow.md` | "create PR for X", "review PR #N" | `[github]` |
| 7 | `code-review.md` | "review this code", "check PR #N" | `[github]` |
| 8 | `research-and-report.md` | "research X", "compare A vs B" | `[browser, notion]` |
| 9 | `api-integration.md` | "integrate with X API" | `[filesystem, browser]` |

**Communication / Business / Content Skills (9):**

| # | Skill | Trigger Phrases | `tools_required` |
|---|-------|----------------|-----------------|
| 10 | `notion-update.md` | "update docs", "add to Notion" | `[notion]` |
| 11 | `email-draft.md` | "draft email to X" | `[gmail]` |
| 12 | `create-proposal.md` | "create proposal for X" | `[browser, notion, gmail]` |
| 13 | `client-report.md` | "weekly status report" | `[github, notion, gmail]` |
| 14 | `project-onboard.md` | "onboard new project X" | `[github, vercel, notion]` |
| 15 | `content-creation.md` | "write blog post about X" | `[browser, notion]` |
| 16 | `invoice-generation.md` | "invoice client X" | `[filesystem, gmail]` |
| 17 | `data-analysis.md` | "analyze data in X" | `[filesystem]` (with `code_exec`) |
| 18 | `seo-audit.md` | "audit SEO for X" | `[browser]` |

**E2 file list (all under `apps/hermes/skills/workflow/`):** the 18 files named above.

**Quality bar (stricter than E1 — these are the user-facing ones):**
- Every workflow skill declares ≥1 entry in `trigger:` (natural-language phrases the user can say)
- `tools_required` lists exactly the MCP servers the skill needs (per the table above); a skill with empty `tools_required` must say so explicitly and justify in the body
- `estimated_time` is realistic (5–60 minutes typical)
- Steps must include a **rollback** step where applicable (e.g. `deploy-to-vps.md` has a "rollback: `git checkout <previous-tag> && docker compose up -d`" step)
- Quality Checks section is non-empty (e.g. `ship-feature.md` checks: PR exists, CI green, Vercel preview URL live, Notion updated, user notified)
- Each `code_exec`-using skill (`data-analysis.md` primarily) explicitly tells the LLM: "use the `code_exec` tool for statistical computations; do NOT shell out via MCP"

Each doc is 300-500 lines; the 18 docs total ~7,000-9,000 lines of markdown.

**E2 acceptance criteria:**
- [ ] 18 files exist
- [ ] `await loadSkills()` logs `Loaded 29 skills total (11 foundational, 18 workflow)`
- [ ] `curl /v1/skills` returns 18 workflow entries with `category` in `{swe, devops, content, research, communication, analysis}`
- [ ] Every skill has all 6 H2 sections
- [ ] No skill has a TODO or TBD
- [ ] Each skill's `trigger:` array is non-empty and contains realistic user phrases (not lorem-ipsum)
- [ ] `pnpm any-gate` 0
- [ ] Commit on `phase/e-skills`

### 5.3 E3 — Pinned MCP Image

**Critical design choice (Tech Lead consult):** **Single base image** `apps/mcp/Dockerfile` that installs all 6 npm MCP servers at exact pinned versions. Per-server compose services `image: jarvis-mcp-base:latest` + per-server `command:` override to pick the right binary. **This replaces the existing compose's `mcp-github` / `mcp-vercel` build services (which reference Dockerfiles that don't exist on disk).**

**Why single-image + per-server `command:`:**
- Replaces the v1.0 `mcp/` OpenClaw stub entirely
- Makes `npx -y latest` impossible (deps baked at build via `ARG MCP_*_VERSION`)
- Reduces image count from 6 to 1 (~400 MB instead of ~2.4 GB)
- Compose can disable individual servers via `profiles: ["mcp"]` (already done) without rebuilding
- Per-server `env_file` and `config.yaml` stay in `apps/mcp/{server}/`

**Pinned packages (E3 must `npm view <pkg> version` at build time and pin to the current stable):**

```
@modelcontextprotocol/server-github       # C4-verified name; pin at build
@notionhq/notion-mcp-server              # C4-verified name; pin at build
@supabase/mcp-server-supabase            # CORRECTED name (was @supabase/mcp-server — C4)
@playwright/mcp                          # CORRECTED scope (was @anthropic/mcp-server-browser — C4)
@modelcontextprotocol/server-filesystem   # C4-verified name; pin at build
@gongrzhe/server-gmail-autoauth-mcp      # Community (Part 4 §4.6 "Pending — verify")
```

**The launch-set allow-list (9 servers from `mcp-test.ts`) resolves to:**

| Identifier | Transport | Wired in v1.5? |
|---|---|---|
| `github` | Local container (base image) | ✅ |
| `vercel` | Hosted (`mcp.vercel.com` — OAuth) | ✅ — probe returns `tools: ["list_projects", "deploy", "get_deployment"]` (static, no live call) |
| `notion` | Local container (base image) | ✅ |
| `supabase` | Local container (base image) | ✅ |
| `filesystem` | Local container (base image) | ✅ |
| `browser` | Local container (base image) | ✅ |
| `gmail` | Local container (base image) | ✅ — **but documented as "Pending — verify before production"** (Part 4 §4.6) |
| `slack` | **NOT in v1.5** | ❌ — probe returns `{ok:false, error:"pending — no first-party package; verify before wiring"}` |
| `linear` | Hosted (`mcp.linear.app` — OAuth) | ✅ — probe returns `tools: ["list_issues", "create_issue", ...]` (static) |

**Why this split:** Part 4 §4.6 marks `slack` as "archived upstream — verify a maintained fork" and `gmail` as "no first-party package; community-server trust review". v1.5 ships Gmail **probed but flagged in the response**; Slack stays as a "pending" entry in the allow-list. The probe returns a structured response (not a crash).

**MCP probe approach (v1.5):** Each MCP container runs the server with stdio JSON-RPC. For the probe, Hermes uses the **container-liveness + startup-log** approach (NOT a true JSON-RPC `tools/list` call, which would require either installing the npm packages twice OR `docker exec` which the proxy blocks with `EXEC=0`):

1. `dockerControl.inspect(containerName)` confirms the container is `running`
2. `dockerControl.logs(containerName, tail=20)` reads the last 20 lines of stdout — npm MCP servers print their tool list on startup
3. Hermes parses the log for `tools: [...]` or `Tool:` lines and returns the list
4. If the container is not running, returns `{ok:false, error: "container not running"}`
5. For hosted MCPs (vercel, linear), returns a static `tools: [...]` list (documented per the Part 4 §4.6 "Notes" column)

**Future (v2.0):** true JSON-RPC `tools/list` probe via HTTP transport (when each npm server's HTTP support is confirmed). Documented in the `apps/mcp/README.md` as "v2 TODO".

**E3 file tree:**

```
apps/mcp/
├── Dockerfile                              # NEW; node:20-slim; USER 1001; installs 6 packages at pinned versions via ARG
├── README.md                               # NEW; the probe approach (container-liveness for v1.5; HTTP for v2)
├── .dockerignore                           # NEW
└── (subdirs)
    ├── github/
    │   ├── config.yaml                     # NEW
    │   ├── .env.example                    # NEW (gitignored .env provides GITHUB_TOKEN)
    │   └── README.md                       # NEW
    ├── vercel/config.yaml                  # NEW (doc-only; Vercel is hosted, config is OAuth notes)
    ├── notion/{config.yaml, .env.example, README.md}
    ├── supabase/{config.yaml, .env.example, README.md}
    ├── filesystem/{config.yaml, .env.example, README.md}  # mounts /workspace
    ├── browser/{config.yaml, .env.example, README.md}      # @playwright/mcp
    └── gmail/{config.yaml, .env.example, README.md}        # pending flag in README
```

**E3 Dockerfile (structure, ARG values resolved at build):**

```dockerfile
FROM node:20-slim
RUN useradd -m -u 1001 -s /bin/bash mcp
USER 1001
WORKDIR /opt/mcp

# Pin exact versions — no "latest". Renovate/Dependabot proposes upgrades.
ARG MCP_GITHUB_VERSION
ARG MCP_NOTION_VERSION
ARG MCP_SUPABASE_VERSION
ARG MCP_BROWSER_VERSION
ARG MCP_FILESYSTEM_VERSION
ARG MCP_GMAIL_VERSION

RUN npm install --no-audit --no-fund \
    @modelcontextprotocol/server-github@${MCP_GITHUB_VERSION} \
    @notionhq/notion-mcp-server@${MCP_NOTION_VERSION} \
    @supabase/mcp-server-supabase@${MCP_SUPABASE_VERSION} \
    @playwright/mcp@${MCP_BROWSER_VERSION} \
    @modelcontextprotocol/server-filesystem@${MCP_FILESYSTEM_VERSION} \
    @gongrzhe/server-gmail-autoauth-mcp@${MCP_GMAIL_VERSION}

# Each server's entrypoint is invocable; compose overrides command: per-server.
EXPOSE 8765
ENTRYPOINT ["node"]
```

**E3 compose update (replaces the existing 2 stub services with 7 wired + 1 hosted):**

```yaml
  jarvis-mcp-base:                       # NEW; built locally; tagged jarvis-mcp-base:latest
    build:
      context: .
      dockerfile: apps/mcp/Dockerfile
      args:
        MCP_GITHUB_VERSION: "<resolved at build>"
        MCP_NOTION_VERSION: "<resolved at build>"
        # ... (5 more)
    image: jarvis-mcp-base:latest
    profiles: ["build"]                 # build-only; per-server services use this image

  mcp-github:                           # REPLACES the existing stub
    image: jarvis-mcp-base:latest
    profiles: ["mcp"]
    command: ["node", "node_modules/@modelcontextprotocol/server-github/dist/index.js"]
    env_file: [apps/mcp/github/.env]   # GITHUB_TOKEN
    restart: unless-stopped
    mem_limit: 128m
    networks: [jarvis-internal]

  # ... (mcp-notion, mcp-supabase, mcp-filesystem, mcp-browser, mcp-gmail) — same pattern

  # Slack — removed from the local image; the probe returns "pending" for the "slack" identifier
```

**E3 `mcp-client.ts` (used by the §3 prelude's `tool-executor.ts`):**

```ts
// apps/hermes/src/lib/mcp-client.ts — NEW (E3)
// Calls an MCP tool on a wired container. The tool dispatch is by container
// name (resolved from the server identifier via apps/mcp/<server>/config.yaml).
// v1.5: for stdio containers, we use the container-liveness + startup-log
// probe; tool *invocation* (vs. listing) goes through the `mcp` CLI shim or
// is stubbed in v1.5 (real invocation in v2 with HTTP transport).
import { dockerControl } from "./docker-control.js";

export async function callMcpTool(
  server: Exclude<ToolExecutor, "code_exec">,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (server === "slack") throw new Error("MCP_SLACK_PENDING: not wired in v1.5");
  // For other servers: route to the container (v1.5: log the call; v2: HTTP transport)
  log.info({ server, args }, "MCP tool call (v1.5: stub — tool invocation via HTTP transport in v2)");
  return { ok: true, server, note: "v1.5 stub; tool invocation in v2.0" };
}
```

**E3 also DELETES:** the v1.0 `mcp/` OpenClaw stub at the repo root (4 subdirs: `github/`, `vercel/`, `notion/`, `gmail/`). It's superseded by `apps/mcp/`.

**E3 acceptance criteria:**
- [ ] `apps/mcp/Dockerfile` builds; image < 400 MB
- [ ] All 6 npm packages installed at exact pinned versions (no `^` or `~` in the Dockerfile; `npm view <pkg> version` resolved at build, recorded in the PR body)
- [ ] `docker compose build` succeeds for all 6 local MCP services
- [ ] `docker compose --profile mcp up` brings up the 6 containers; `docker ps` shows them all healthy
- [ ] `POST /v1/mcp/test` (after E3 commits) returns `{ server, ok, tools[] }` for each of the 9 servers
  - 6 local containers: `ok: true` with tools from startup log
  - vercel + linear (hosted): `ok: true` with static `tools: [...]` list from Part 4 §4.6
  - slack: `ok: false, error: "pending — no first-party package; verify before wiring"`
- [ ] The `mcp/` repo-root dir is deleted (one-line commit; the v1.0 OpenClaw stub is no longer needed)
- [ ] No `npx -y` anywhere in compose (H2 closed)
- [ ] `pnpm any-gate` 0
- [ ] Closes **C4** + **H2** (the canonical audit IDs)
- [ ] Commit on `phase/e-skills`

### 5.4 E4 — Cron + Morning-Audit

**Per the existing plan §9.1 (Tech Lead already ratified):** BullMQ for cron (job persistence, retries, observability) at the cost of a Redis dependency. The engine lazy-inits; if `REDIS_URL` is unset, cron is disabled (chat still works).

**E4 file tree (additions to E0):**

```
apps/hermes/src/
├── cron/
│   ├── engine.ts                # NEW; BullMQ worker + scheduler
│   ├── jobs/
│   │   ├── morning-audit.ts     # NEW; the 8 AM job
│   │   ├── weekly-review.ts     # NEW; Mon 9 AM
│   │   └── model-boot-check.ts  # NEW; the C5 close
│   └── registry.ts              # NEW; the cron job table (3 jobs, Zod-validated)
```

**E4 registry (3 jobs, validated against `cronJobSchema` from `@jarvis/shared`):**

```ts
// apps/hermes/src/cron/registry.ts
import type { CronRegistry } from "@jarvis/shared";

export const CRON_REGISTRY: CronRegistry = {
  "morning-audit": {
    id: "morning-audit",
    name: "Morning Audit",
    schedule: "0 8 * * *",        // 8 AM daily
    skill: "morning-audit",
    notify: ["api", "telegram"],
    enabled: true,
  },
  "weekly-review": {
    id: "weekly-review",
    name: "Weekly Review",
    schedule: "0 9 * * 1",        // Mon 9 AM
    skill: "research-and-report",
    args: { topic: "Weekly progress review" },
    notify: ["api", "telegram"],
    enabled: true,
  },
  "model-boot-check": {
    id: "model-boot-check",
    name: "Model Boot Check",
    schedule: "@boot",            // once at Hermes boot
    skill: null,                  // built-in; not a skill doc
    notify: [],
    enabled: true,
  },
};
```

**E4 engine (BullMQ lazy-init):**

```ts
// apps/hermes/src/cron/engine.ts — sketch
import type { CronJob } from "@jarvis/shared";

export class CronEngine {
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  async init(): Promise<void> {
    const env = getEnv();
    if (!env.REDIS_URL) {
      log.warn("REDIS_URL not set; cron DISABLED. Chat still works.");
      return;
    }
    this.queue = new Queue("jarvis-cron", { connection: { url: env.REDIS_URL } });
    this.worker = new Worker("jarvis-cron", async (job) => this.runJob(job), { connection: { url: env.REDIS_URL } });
    await this.scheduleAll(CRON_REGISTRY);
    log.info({ jobCount: Object.keys(CRON_REGISTRY).length }, "Cron engine started");
  }

  private async scheduleAll(registry: CronRegistry): Promise<void> {
    for (const [id, job] of Object.entries(registry)) {
      if (!job.enabled) continue;
      if (job.schedule === "@boot") {
        await this.queue!.add(id, job, { attempts: 1 });
      } else {
        // BullMQ accepts cron expressions in repeat options
        await this.queue!.add(id, job, { repeat: { pattern: job.schedule }, attempts: 3, backoff: { type: "exponential", delay: 60_000 } });
      }
    }
  }

  private async runJob(job: BullJob): Promise<void> {
    const cronJob = job.data as CronJob;
    log.info({ jobId: job.id, cronJobId: cronJob.id }, "Cron job firing");
    if (cronJob.id === "model-boot-check") {
      // Built-in: ping the resolved primary
      await this.runModelBootCheck();
      return;
    }
    // For skill-based jobs: call the API factory to create a workflow_runs row,
    // then invoke the skill via the agentic loop, then update the row.
    const runId = await this.createWorkflowRun(cronJob);
    try {
      const result = await this.invokeSkillViaApi(cronJob);
      await this.completeWorkflowRun(runId, "success", result);
      if (cronJob.notify.includes("telegram")) {
        await this.notifyTelegram(cronJob, result);  // v1.5: structured log; v2: real bot
      }
    } catch (err) {
      await this.completeWorkflowRun(runId, "failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }
}
```

**E4 factory integration (the P2 rule):**

```ts
// In engine.ts runJob — creates the workflow_runs row via the API factory
private async createWorkflowRun(cronJob: CronJob): Promise<string> {
  // Hermes calls the API's CRUD factory over HTTP (not direct supabase access)
  // The API exposes POST /api/cms/workflow_runs (the factory's create handler)
  const response = await fetch(`${env.API_URL}/api/cms/workflow_runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Service-Token": env.HERMES_SERVICE_TOKEN },
    body: JSON.stringify({
      workflow_id: null,  // cron-triggered; no parent workflow row
      trigger: "cron",
      skill_name: cronJob.skill,
      status: "running",
      started_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`createWorkflowRun failed: ${response.status}`);
  const json = (await response.json()) as { ok: true; data: { id: string } };
  return json.data.id;
}

private async completeWorkflowRun(runId: string, status: "success" | "failed", output: unknown): Promise<void> {
  await fetch(`${env.API_URL}/api/cms/workflow_runs/${runId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-Service-Token": env.HERMES_SERVICE_TOKEN },
    body: JSON.stringify({ status, output, completed_at: new Date().toISOString() }),
  });
}

private async invokeSkillViaApi(cronJob: CronJob): Promise<unknown> {
  // Call Hermes' own /v1/skill/run (loopback) — uses the agentic loop built in §3
  const response = await fetch(`http://localhost:${env.PORT}/v1/skill/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill: cronJob.skill, args: cronJob.args }),
  });
  if (!response.ok) throw new Error(`skill-run failed: ${response.status}`);
  return response.json();
}
```

**E4 notify (Telegram as structured log in v1.5):**

```ts
// In engine.ts runJob
private async notifyTelegram(cronJob: CronJob, result: unknown): Promise<void> {
  // v1.5: write a structured log line that the operator (or a future F-wired
  // Telegram bot) can pick up. Real bot wiring is Phase F.
  log.info({ cronJobId: cronJob.id, payload: result }, "TELEGRAM_NOTIFY (v1.5: structured log; F wires real bot)");
  // Also write to system_logs table via the API factory (so the dashboard sees it)
  await fetch(`${env.API_URL}/api/cms/system_logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Service-Token": env.HERMES_SERVICE_TOKEN },
    body: JSON.stringify({ level: "info", source: "cron", message: `Cron ${cronJob.id} fired`, payload: result }),
  });
}
```

**E4 model-boot-check (C5 close, in cron surface):**

```ts
// apps/hermes/src/cron/jobs/model-boot-check.ts
import { nonStreamChat } from "../../lib/openrouter.js";
import { getResolved } from "../../lib/model-resolver.js";
import { log } from "../../lib/logger.js";

export async function runModelBootCheck(): Promise<void> {
  try {
    const resolved = getResolved();
    const primary = resolved.coding.primary.resolved;
    const result = await nonStreamChat({ model: primary, messages: [{ role: "user", content: "ping" }] });
    log.info({ model: result.model, latency_ms: result.usage.duration_ms }, "Cron boot-check OK");
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : String(err) }, "Cron boot-check DEGRADED");
  }
}
```

**E4 acceptance criteria:**
- [ ] BullMQ connects to Redis at boot (if `REDIS_URL` is set)
- [ ] Cron engine registers 3 jobs; `GET /v1/cron` returns them
- [ ] A manually-triggered `morning-audit` (via `POST /v1/skill/run`) creates a `workflow_runs` row, runs the skill, updates the row, and emits progress over WS — all visible from the dashboard in real-time
- [ ] The 8 AM cron fires (verified by temporarily setting `schedule: "* * * * *"` in a test, then reverting)
- [ ] The model boot-check runs at Hermes start and logs `Cron boot-check OK` or `Cron boot-check DEGRADED` with the failure detail
- [ ] Workflow_runs writes go through the API factory (verified by `grep -r "supabase.from" apps/hermes/src/cron` → no hits)
- [ ] `pnpm any-gate` 0
- [ ] Closes **C5** in the cron surface (not just at server boot)
- [ ] Commit on `phase/e-skills`

## 6. Carryover from E0 (rolled into F per the directive)

From the E0 audit, deferred and tracked — these are **not** required fixes for this handoff:

| ID | Item | Lands in |
|----|------|----------|
| **E0-F3** | Budget gate inert (`estimateCostUsd → 0`) and unwired from the chat path. | **F** — price + wire `checkAndIncrement` into `chat-stream.ts`; drop the `void getResolved;` keepalive |
| **E0-F4** | `apps/api/tsconfig.json` doesn't override root `noEmit:true` → API image build emits nothing (pre-existing, not E-caused). | **F** — 1-line `"noEmit": false` |
| **E0-F5** | Cosmetics: `docker-control.stats()` single-sample cpu%, unused `BOOT_CHECK_INTERVAL_MS`, unpinned `corepack prepare pnpm@latest` in the Dockerfile. | **F** / opportunistic |
| **C-D1..C-LIVE** | Phase D carryover ledger (mobile WS `:4000`, push projectId, `/api/services` envelope, runs batch endpoint, live CMS smoke). | **F** / live-gate checklist |
| **NEW (out of F1+F2 fix)** | `apps/api/tests/integration.test.ts` imports `../src/middleware/protected.js` (deleted in WP-0). Pre-existing test rot. | **F** — 1-line import fix or test removal |

## 7. Phase E Gate — run ONCE on integrated `phase/e-skills` (Part 5 §5.1 + completion handoff §6)

```
[ ] All 18 workflow skill docs valid + loaded (GET /v1/skills returns all 18 + 11 foundational = 29)
[ ] 11 foundational docs loaded; architectural-dna injected into the system prompt
[ ] "morning audit" via chat → real GitHub/Notion/Gmail summary (chat-side trigger matcher routes to morning-audit.md; agentic loop calls github/notion/gmail MCPs)
[ ] "ship feature X" → branch + PR created (NEVER pushes to main directly)
[ ] "deploy to Vercel" → Vercel hosted MCP confirms deployment
[ ] Cron morning audit fires 8 AM → notifies chat + Telegram (structured log v1.5)
[ ] Each MCP server responds to a tool call (POST /v1/mcp/test per server → ok:true with tools[]; slack returns "pending")
[ ] Sub-agent spawning: complex task → isolated sub-agent → result collected (agentic loop with code_exec tool)
[ ] Agentic loop: max 10 iterations enforced; a runaway loop terminates with MAX_ITERATIONS_REACHED
[ ] Tool allow-list: an out-of-scope tool_call returns TOOL_NOT_ALLOWED; the LLM is informed
```

Plus the standing DNA gates (re-run on the **integrated** `phase/e-skills`, not per-WP — phase-gate integrity):

```
[ ] tsc --noEmit 0 across all 4 apps + 1 shared package
[ ] pnpm any-gate 0
[ ] pnpm color-gate 0
[ ] pnpm type-drift:check OK
[ ] pnpm import-check 0
[ ] pnpm factory-check 0
[ ] pnpm -F @jarvis/hermes test green (5+ new tests from §3 prelude; existing 3 from E0)
[ ] Skills validate against skill-doc.schema.ts (gray-matter + Zod; malformed docs logged + skipped)
[ ] MCP versions pinned exactly (no latest/-y)
[ ] Boot-time model ping: primary resolves OR auto-corrected slug is logged
[ ] Socket-proxy pinned to 0.3.0
[ ] No raw /var/run/docker.sock on Hermes
[ ] Hermes Dockerfile: USER 1001, cap_drop ALL, read_only true, no-new-privileges
[ ] Hermes Dockerfile: COPY apps/hermes/skills → /app/data/skills (the E1 fix)
[ ] Sandbox SANITIZED_BASE_ENV does not include secrets
[ ] Workflow_runs writes go through the API factory
```

**Tech-Lead-flagged checks:**
- C5 closed (boot-ping at server start + cron surface)
- H1 closed (no raw socket in Hermes; sandbox documented)
- H2 closed (socket-proxy pinned + MCP packages pinned)
- C4 closed (corrected MCP package names)

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|:---:|:---:|-----------|
| **§3 decision wrong** (skill bodies are actually intended as node programs) | Low | High | The agentic loop's `code_exec` tool covers the case; any skill author can write a body that says "use code_exec to run X" instead of literal node. Reversible. |
| **Agentic loop runaway** (LLM loops forever emitting tool calls) | Medium | Medium | `MAX_ITERATIONS = 10` enforced in `runSkillAgentically()`. Test with a hostile mock that always emits tool_calls. |
| **LLM emits an out-of-scope tool** (e.g. skill lists `github` but LLM emits `code_exec` when not in the allow-list) | Medium | Low | The `allowedTools` check in the loop returns `TOOL_NOT_ALLOWED` to the model; the loop continues with the error. |
| **E3 npm packages drift** (a package is unpublished between planning and building) | Low | Medium | E3 executor runs `npm view <pkg> version` at build time; if any package is missing, executor halts and reports (per the plan §8.2 note). |
| **MCP probe false-positive** (container is alive but server crashed) | Low | Low | Probe also reads the last 20 lines of stdout and looks for "ready" / "listening" markers; if missing, returns `{ok:false, error: "server not ready"}`. |
| **MCP probe can't read the startup log** (container doesn't print tools) | Medium | Low | Fallback: return `{ok:false, error: "could not parse tool list from container logs"}` — the operator knows the container is alive but the tool list is unknown. |
| **Cron fires during model outage** (morning-audit 8 AM hits OpenRouter 429) | Medium | Medium | BullMQ retries with exponential backoff (3 attempts, 60s base); if all fail, the run is recorded as `failed` in workflow_runs; the operator gets a Telegram-flagged notification. |
| **API factory unavailable** (Hermes can't reach the API) | Low | High | The engine treats this as fatal for the cron job (records the failure in `system_logs`); chat still works (no API dependency for chat). |
| **E1 doc authoring is large** (~3,000-4,000 lines of markdown) | Low | Low | Sub-agents dispatch in parallel (or sequential if conflict-prone); each doc is independent. |
| **29 docs increase the system-prompt size** (if all are injected at once) | Low | Low | The chat-side trigger matcher injects ONLY the matched skill (1 doc body, ~300 lines); the chat's full system context stays small. |
| **All 29 docs in `apps/hermes/skills/` blow the 256K MAX_SKILL_DOC_BYTES** | Low | Low | Each doc is well under 256K (typically 10-30 KB); the cap is for runaway docs, not the catalog. |
| **Dockerfile COPY of skills** causes image bloat | Low | Low | 29 docs at ~20 KB each = ~580 KB. Negligible vs. the node_modules (~200 MB). |
| **Slack/Gmail pending in allow-list** crashes the dashboard | Low | Low | The probe returns a structured `{ok:false, error: "pending"}` response (NOT a crash). The dashboard displays "Pending — not yet wired" instead of "Error". |
| **Hosted MCPs (Vercel, Linear) return static tools** that drift over time | Low | Low | v1.5 accepts the static list; the probe notes the response is "static" so operators know to update. v2 hits the live OAuth endpoint. |

## 9. Open Questions (none blocking; ratify or override before E0 merge)

These are decisions I made on the Tech Lead's behalf, per the existing plan §13 (which the Orchestrator ratified by "continue"):

1. **BullMQ vs node-cron for the cron engine** — **BullMQ** (job persistence, retries, observability). The engine lazy-inits; `REDIS_URL` unset → cron disabled, chat still works. (Existing plan §13.1 — ratified.) ✅
2. **Sub-agent depth limit = 1** — confirmed in F1 fix. (Existing plan §13.2 — ratified.) ✅
3. **Boot ping is fire-and-forget** — confirmed in E0 `server.ts` `runBootCheck()`. (Existing plan §13.3 — ratified.) ✅
4. **Vercel + Linear are hosted, not in the local image** — confirmed in E3 §5.3. (Existing plan §13.4 — ratified.) ✅
5. **The v1.0 `mcp/` repo-root dir is deleted in E3** — confirmed in E3 §5.3. (Existing plan §13.5 — ratified.) ✅
6. **Hermes WS is internal-only** — confirmed in E0 compose (no published port). (Existing plan §13.6 — ratified.) ✅
7. **Skill auto-create / auto-refine are stub-only in v1.5** — confirmed (out of scope for this plan; deferred to v2). (Existing plan §13.7 — ratified.) ✅

**New questions for this plan (none blocking — these are my recommendations, open for Orchestrator override):**

8. **§3 decision: option (A) — context-only + agentic loop** — recommended. See §3.2 for the trade-off matrix. **Tech Lead consult requested; ratify or override?**
9. **MCP probe approach: container-liveness + startup-log** (not true JSON-RPC) — recommended. See §5.3 for the v1.5 trade-off. **Tech Lead consult requested; ratify or override?**
10. **Slack deferred to "pending" (not wired in v1.5)** — recommended. Part 4 §4.6 marks it "archived upstream — verify a maintained fork". **Ratify or override?**
11. **Gmail probed but flagged in the response** (community package, trust review pending) — recommended. Part 4 §4.6 marks it "Pending — verify before use". **Ratify or override?**
12. **Cron writes workflow_runs via the API factory over HTTP loopback** (not direct Supabase) — recommended. Honors P2 (factory over bespoke); the API is the single source of truth for schema-validated rows. **Ratify or override?**
13. **Telegram notify is a structured log in v1.5** (real bot is F) — recommended per the existing plan §9.1. **Ratify or override?**
14. **Chat-side skill injection via simple keyword match** (no LLM classification) — recommended. v1.5 simplicity; v2 can add an LLM classifier. **Ratify or override?**

## 10. Definition of Done (per WP, before the §7 gate)

Standard sub-agent mark-off (V1.5 handoff §6 + completion handoff §8):

```
WORK PACKAGE: <id>  ·  IMPLEMENTS: Part <n> §<x>  ·  CLOSES: <audit IDs or none>

[ ] Scope matches this plan doc §4–§5 — no scope creep, no out-of-boundary files (P3)
[ ] Types imported from @jarvis/shared (generated) — zero hand-written schema types (P1/P6)
[ ] No `any` in production paths; tsc --noEmit clean (P6)
[ ] Zod validation at every boundary (P6)
[ ] CRUD goes through the factory; no bespoke CRUD (P2)
[ ] No new hardcoded colors (P4) — even though Hermes has no UI, the gate extends
[ ] Every skill doc validates against skill-doc.schema.ts (§3 option A: no schema change)
[ ] MCP versions pinned exactly (no latest/-y) — closes H2
[ ] MCP package names corrected (github, notion, supabase, browser, filesystem, gmail) — closes C4
[ ] Conventional commit(s) on phase/e-skills; Co-authored-by: Claude Opus 4.8 trailer
[ ] No per-WP branch (per the large-unit directive); all commits on phase/e-skills
[ ] Any deviation from the plan is documented in the PR body
```

## 11. Approval Block

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
Orchestrator ──approve──▶ Merge feat/e-hermes-runtime → phase/e-skills  (Step 1 of completion handoff §0)
                          ▼
                       §3 prelude on phase/e-skills  (route + matcher + tool-executor + 5+ tests)
                          ▼
                       E1 ∥ E2 ∥ E3 in parallel  (commits on phase/e-skills)
                          ▼
                       E4  (depends on E1+E2+E3)
                          ▼
                       §7 Phase E gate  (holistic on integrated phase/e-skills)
                          ▼
                       Auditor ≥ 8.5  (Architect then decides on phase/e-skills → develop promotion)
```

**If the gate fails:** the Orchestrator's directive says P0/P1 fixes roll into the Phase F handoff rather than recircle. So if the Auditor scores < 8.5, the fixes are documented in `docs/PHASE-F-HANDOFF.md` §… rather than re-looping Phase E.

---

*Phase E remainder plan — © 2026 Kidus Abdula / VersaLabs Studio. Plan-gated: approve §3 + the §5 WP map before any Execute sub-agent writes code. Built as one large unit on `phase/e-skills` per the completion handoff §0. Report at the phase gate.*
