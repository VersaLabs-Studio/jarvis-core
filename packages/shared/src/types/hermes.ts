// =============================================================================
// @jarvis/shared — Hermes Wire Contract
// Types and shapes used by the Hermes agent runtime, the Fastify API client,
// and the web/mobile consumers. Single source of truth for the wire format.
// Phase E §5.2 / Part 4 §4.4.
// =============================================================================

/**
 * A single tool invocation emitted by the LLM in an assistant message.
 * `id` is the OpenRouter tool_call_id (used by the tool message to correlate
 * its response). `args` is the parsed JSON arguments object.
 */
export interface HermesToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * A single message in a chat history. Mirrors the `chat_messages` table shape
 * but kept as a Hermes-specific type since Hermes does not need the full DB
 * row (no `tenant_id`, no `model`, etc.).
 *
 * Phase E §3 (C3 binding): the agentic skill-runner uses the `tool_calls`
 * (assistant) and `tool_call_id` (tool) fields to round-trip tool invocations
 * through the LLM. The chat-stream route ignores these (the chat surface
 * is single-shot LLM → client, not an agentic loop).
 */
export interface HermesMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  model?: string;
  tools_used?: string[];
  /** Assistant messages with tool invocations: one entry per tool_call. */
  tool_calls?: HermesToolCall[];
  /** Tool messages: the tool_call_id from the assistant's tool_call this responds to. */
  tool_call_id?: string;
}

/**
 * SSE chunk types emitted by Hermes on `POST /v1/chat/stream`.
 * The shape is consumed by `apps/api/src/lib/hermes.ts` (HTTP SSE relay) and
 * `apps/api/src/routes/ws/handler.ts` (WS relay) and forwarded to clients as
 * `chat:chunk` / `chat:done` / `chat:error` events.
 *
 * - `chunk`     — incremental content token from the LLM
 * - `tool_call` — tool invocation with name and arguments
 * - `done`      — stream complete, includes token usage metrics
 * - `error`     — error during generation
 */
export type HermesStreamChunkType = "chunk" | "tool_call" | "done" | "error";

export interface HermesUsageMetrics {
  tokens_in: number;
  tokens_out: number;
  duration_ms: number;
}

export interface HermesStreamChunkData {
  content?: string;
  tool?: string;
  args?: unknown;
  error?: string;
  usage?: HermesUsageMetrics;
}

export interface HermesStreamChunk {
  type: HermesStreamChunkType;
  data: HermesStreamChunkData;
}

/**
 * Parameters accepted by `POST /v1/chat/stream`.
 * Matches the shape the API client (`apps/api/src/lib/hermes.ts`) already
 * serializes — the wire is unchanged from the v1.0 client.
 */
export interface SendMessageParams {
  sessionId: string;
  message: string;
  model?: string;
  tools?: string[];
  history?: HermesMessage[];
  /**
   * Optional role tag for chain selection. Defaults to `coding` at the route
   * boundary. Skills may override via the skill frontmatter
   * `preferred_model_role` (E1).
   */
  role?: HermesRole;
}

/** Five model roles (Part 1 §1.5; Part 4 §4.7). */
export type HermesRole = "planning" | "coding" | "office" | "fast" | "audit";

/**
 * A model's identity in the OpenRouter catalog. Used by the model-resolver
 * (C5 fix + F2 audit fix) to record which slugs resolved, which were
 * auto-corrected, and which were NOT in the catalog at all.
 */
export interface ResolvedModel {
  /** The configured ID (what the user wrote in chains.ts). */
  configured: string;
  /** The ID actually used after resolution (may equal `configured`). */
  resolved: string;
  /** True if the resolver substituted a different ID. */
  autoCorrected: boolean;
  /** The candidate slugs tried in order before settling on `resolved`. Empty if no correction. */
  candidatesTried: string[];
  /**
   * True iff the model was located in the OpenRouter catalog — either the
   * configured ID itself, a SLUG_CORRECTIONS candidate, or a same-publisher
   * fallback. False when the catalog fetch succeeded but the model is
   * genuinely missing (the runtime call will 404), or when the catalog
   * fetch failed (degraded mode — we accept the configured ID as-is).
   *
   * The boot-time fail check in `resolveAllChains` uses this field: a
   * chain is "entirely missing" only when its resolved primary AND every
   * fallback all have `foundInCatalog === false`.
   */
  foundInCatalog: boolean;
}

export interface ChainResolution {
  primary: ResolvedModel;
  fallback: ResolvedModel[];
  missing: string[];
}

export interface ResolvedModels {
  planning: ChainResolution;
  coding: ChainResolution;
  office: ChainResolution;
  fast: ChainResolution;
  audit: ChainResolution;
}

/**
 * `GET /health` response — what the API rolls up into `/api/admin/health`.
 */
export interface HermesHealth {
  status: "ok" | "degraded" | "starting";
  model: string;
  uptime_s: number;
  resolved_models: ResolvedModels;
  sandbox: {
    code: "ok" | "noexec";
  };
  boot_check?: "ok" | "degraded" | "pending";
}

/**
 * Metadata exposed by `GET /v1/skills`. One entry per loaded skill doc.
 */
export interface SkillMeta {
  name: string;
  description: string;
  category: string;
  trigger: string[];
  tools_required: string[];
  estimated_time: string;
  /** True if the skill doc is always loaded (system context). */
  always_loaded: boolean;
  preferred_model_role?: HermesRole;
  /** Path of the doc in the Hermes image (informational). */
  source: string;
}

/**
 * `GET /v1/skills` response.
 */
export interface SkillsListResponse {
  skills: SkillMeta[];
}

/**
 * `POST /v1/skill/run` response — returns the run_id; progress streams
 * over the Hermes WS endpoint as `skill:progress` / `skill:result` / `skill:error`.
 */
export interface SkillRunResponse {
  run_id: string;
}

/**
 * `POST /v1/skill/run` body.
 */
export interface SkillRunParams {
  skill: string;
  args?: Record<string, unknown>;
}

/**
 * `POST /v1/mcp/test` body + response.
 */
export interface McpTestParams {
  server: string;
}

export interface McpTestResponse {
  server: string;
  ok: boolean;
  tools?: string[];
  error?: string;
}

/**
 * `GET /v1/cron` response — the in-memory cron registry.
 */
export interface CronListResponse {
  jobs: CronJobMeta[];
}

export interface CronJobMeta {
  id: string;
  name: string;
  schedule: string;
  skill: string | null;
  args?: Record<string, unknown>;
  notify: Array<"api" | "telegram">;
  enabled: boolean;
  last_run_at?: string;
  next_run_at?: string;
}

/**
 * Error codes used internally by Hermes. Surfaced as the standard envelope
 * `UPSTREAM_ERROR` to API clients (Part 2 §2.5).
 */
export type HermesErrorCode =
  | "CHAIN_EXHAUSTED"
  | "MODEL_NOT_FOUND"
  | "BUDGET_EXHAUSTED"
  | "TIMEOUT"
  | "VALIDATION"
  | "UPSTREAM_ERROR"
  | "INTERNAL"
  | "SKILL_NOT_FOUND"
  | "SKILL_MALFORMED"
  | "MCP_NOT_CONFIGURED"
  | "SANDBOX_DENIED";
