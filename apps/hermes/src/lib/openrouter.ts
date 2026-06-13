// =============================================================================
// OpenRouter streaming chat completions client (Phase E §2.2).
//
// Wraps `https://openrouter.ai/api/v1/chat/completions` with:
//  - Per-call timeout (AbortController + AbortSignal.timeout)
//  - SSE parsing → HermesStreamChunk
//  - Usage extraction (tokens_in/out + duration_ms)
//  - 4xx/5xx error mapping to HermesErrorCode
// =============================================================================

import type { HermesMessage, HermesStreamChunk, HermesToolCall, HermesUsageMetrics, HermesRole } from "@jarvis/shared";
import { log } from "./logger.js";
import { getEnv } from "../config/env.js";
import { PER_MODEL_TIMEOUT_MS } from "../config/constants.js";
import { chainForRole } from "../config/chains.js";
import { getResolved } from "./model-resolver.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterChatParams {
  model: string;
  messages: HermesMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Optional tools (function-calling); passed through to OpenRouter as-is. */
  tools?: Array<{ type: "function"; function: { name: string; description?: string; parameters: unknown } }>;
}

export interface OpenRouterStreamResult {
  chunks: HermesStreamChunk[];
  usage: HermesUsageMetrics | null;
  model: string;
}

export class OpenRouterError extends Error {
  public readonly code: "UPSTREAM_ERROR" | "TIMEOUT" | "MODEL_NOT_FOUND" | "VALIDATION";
  public readonly status: number;
  public readonly model: string;
  constructor(
    code: "UPSTREAM_ERROR" | "TIMEOUT" | "MODEL_NOT_FOUND" | "VALIDATION",
    message: string,
    status: number,
    model: string,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.model = model;
  }
}

/**
 * Stream chat completions from OpenRouter.
 *
 * Yields HermesStreamChunk events in real time AND accumulates the full
 * result for the caller. Throws OpenRouterError on 4xx/5xx/timeout.
 *
 * Note: the API client (apps/api/src/lib/hermes.ts) only consumes
 * HermesStreamChunk. This function returns both the generator AND a
 * promise that resolves to the full result; the route uses one or the
 * other depending on whether it streams.
 */
export async function* streamChat(
  params: OpenRouterChatParams,
): AsyncGenerator<HermesStreamChunk> {
  const env = getEnv();
  const body = {
    model: params.model,
    messages: params.messages,
    stream: true,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 4096,
    ...(params.tools ? { tools: params.tools } : {}),
  };

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://jarvis.versalabs.dev",
        "X-Title": "JARVIS Hermes",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new OpenRouterError("TIMEOUT", `Model ${params.model} timed out after ${PER_MODEL_TIMEOUT_MS}ms`, 504, params.model);
    }
    throw new OpenRouterError("UPSTREAM_ERROR", err instanceof Error ? err.message : "fetch failed", 502, params.model);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown");
    if (response.status === 404) {
      throw new OpenRouterError("MODEL_NOT_FOUND", `Model ${params.model} not found (404): ${text.slice(0, 200)}`, 404, params.model);
    }
    if (response.status === 400) {
      throw new OpenRouterError("VALIDATION", `Model ${params.model} rejected request (400): ${text.slice(0, 200)}`, 400, params.model);
    }
    throw new OpenRouterError("UPSTREAM_ERROR", `OpenRouter ${response.status} for ${params.model}: ${text.slice(0, 200)}`, response.status, params.model);
  }

  if (!response.body) {
    throw new OpenRouterError("UPSTREAM_ERROR", "No response body from OpenRouter", 502, params.model);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const startedAt = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE: lines are separated by \n\n; each event may have data: lines.
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const dataLines = event
          .split("\n")
          .filter((l) => l.startsWith("data: "))
          .map((l) => l.slice(6));
        if (dataLines.length === 0) continue;
        const data = dataLines.join("\n");
        if (data === "[DONE]") {
          // OpenRouter's terminal token. We DON'T yield it — the route
          // adds the literal `data: [DONE]\n\n` after the stream.
          return;
        }
        try {
          const parsed = JSON.parse(data) as OpenRouterStreamEvent;
          const chunk = openRouterEventToChunk(parsed, startedAt);
          if (chunk) yield chunk;
        } catch (err) {
          log.warn({ err, data: data.slice(0, 200) }, "Failed to parse OpenRouter SSE event");
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * One-shot non-streaming call. Used for the model boot-check.
 * Returns the assistant message content and usage metrics.
 */
export async function nonStreamChat(
  params: OpenRouterChatParams & { stream?: false },
): Promise<{ content: string; usage: HermesUsageMetrics; model: string }> {
  const env = getEnv();
  const body = {
    model: params.model,
    messages: params.messages,
    stream: false,
    temperature: params.temperature ?? 0,
    max_tokens: 1, // boot-check uses 1 token
  };

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown");
    throw new OpenRouterError(
      response.status === 404 ? "MODEL_NOT_FOUND" : "UPSTREAM_ERROR",
      `Boot-check failed for ${params.model} (${response.status}): ${text.slice(0, 200)}`,
      response.status,
      params.model,
    );
  }

  const data = (await response.json()) as OpenRouterNonStreamResponse;
  return {
    content: data.choices[0]?.message?.content ?? "",
    usage: {
      tokens_in: data.usage?.prompt_tokens ?? 0,
      tokens_out: data.usage?.completion_tokens ?? 0,
      duration_ms: 0,
    },
    model: data.model ?? params.model,
  };
}

// ---------------------------------------------------------------------------
// OpenRouter wire types
// ---------------------------------------------------------------------------

interface OpenRouterStreamEvent {
  id?: string;
  object?: string;
  model?: string;
  choices?: Array<{
    index: number;
    delta?: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: "function";
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface OpenRouterNonStreamResponse {
  id?: string;
  model?: string;
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
    index: number;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * One-shot non-streaming call that returns BOTH text and tool_calls in a
 * single response. Used by the agentic skill-runner (Phase E §3, §4.2) so
 * the loop can branch on `toolCalls.length > 0` to execute tools and feed
 * the results back, vs. broadcasting the text as `skill:result`.
 *
 * Implements the same chain-fallback semantics as chat-stream.ts:
 *   1. Try the role's primary (using the resolved ID; handles C5 auto-correction)
 *   2. On 4xx (other than VALIDATION) / 404 / TIMEOUT, try each fallback
 *   3. On VALIDATION (400), do NOT retry — the body is bad
 *   4. If every model fails, throw CHAIN_EXHAUSTED as UPSTREAM_ERROR (502)
 *
 * Returns the first successful response. The caller is responsible for the
 * agentic loop (max iterations, tool allow-list enforcement, etc.).
 */
export interface NonStreamChatWithToolCallsParams {
  role: HermesRole;
  messages: HermesMessage[];
  /** Tool definitions to advertise to the LLM. Names must be unique. */
  tools: Array<{ type: "function"; function: { name: string; description?: string; parameters: unknown } }>;
  /** Per-call timeout (ms). Defaults to PER_MODEL_TIMEOUT_MS. */
  timeoutMs?: number;
}

export interface NonStreamChatWithToolCallsResult {
  /** The assistant's text content (may be empty when only tool_calls are returned). */
  text: string;
  /** Tool invocations the LLM requested (may be empty). */
  toolCalls: HermesToolCall[];
  usage: HermesUsageMetrics;
  model: string;
}

export async function nonStreamChatWithToolCalls(
  params: NonStreamChatWithToolCallsParams,
): Promise<NonStreamChatWithToolCallsResult> {
  const env = getEnv();
  const chainIds = chainForRole(params.role);
  const resolved = getResolved();
  // Map each chain ID to its resolved ID (handles slug auto-correction).
  const resolveChain = (configured: string): string => {
    const chain = resolved[params.role];
    if (chain.primary.configured === configured) return chain.primary.resolved;
    const fb = chain.fallback.find((f) => f.configured === configured);
    return fb?.resolved ?? configured;
  };

  const timeoutMs = params.timeoutMs ?? PER_MODEL_TIMEOUT_MS;
  const startedAt = Date.now();
  let lastError: unknown = null;

  for (const configuredId of chainIds) {
    const modelId = resolveChain(configuredId);
    log.info({ role: params.role, modelId, messageCount: params.messages.length }, "nonStreamChatWithToolCalls: trying model");
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://jarvis.versalabs.dev",
          "X-Title": "JARVIS Hermes",
        },
        body: JSON.stringify({
          model: modelId,
          messages: params.messages,
          stream: false,
          temperature: 0.7,
          max_tokens: 4096,
          tools: params.tools,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "unknown");
        if (response.status === 400) {
          // Don't retry with a different model — the request body is bad.
          throw new OpenRouterError(
            "VALIDATION",
            `Model ${modelId} rejected request (400): ${text.slice(0, 200)}`,
            400,
            modelId,
          );
        }
        if (response.status === 404) {
          throw new OpenRouterError(
            "MODEL_NOT_FOUND",
            `Model ${modelId} not found (404): ${text.slice(0, 200)}`,
            404,
            modelId,
          );
        }
        throw new OpenRouterError(
          "UPSTREAM_ERROR",
          `OpenRouter ${response.status} for ${modelId}: ${text.slice(0, 200)}`,
          response.status,
          modelId,
        );
      }

      const data = (await response.json()) as OpenRouterNonStreamResponse;
      const message = data.choices[0]?.message;
      const text = message?.content ?? "";
      const toolCalls: HermesToolCall[] = (message?.tool_calls ?? []).map((tc) => {
        let args: Record<string, unknown> = {};
        try {
          const parsed = JSON.parse(tc.function.arguments) as unknown;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            args = parsed as Record<string, unknown>;
          } else {
            args = { value: parsed };
          }
        } catch {
          args = { _raw: tc.function.arguments };
        }
        return { id: tc.id, name: tc.function.name, args };
      });
      return {
        text,
        toolCalls,
        usage: {
          tokens_in: data.usage?.prompt_tokens ?? 0,
          tokens_out: data.usage?.completion_tokens ?? 0,
          duration_ms: Date.now() - startedAt,
        },
        model: data.model ?? modelId,
      };
    } catch (err) {
      lastError = err;
      if (err instanceof OpenRouterError) {
        if (err.code === "VALIDATION") {
          // Don't retry — the body is bad regardless of the model.
          log.error({ err: err.message, modelId }, "nonStreamChatWithToolCalls: validation error (no retry)");
          throw err;
        }
        log.warn({ err: err.message, code: err.code, modelId }, "nonStreamChatWithToolCalls: model failed, trying next");
        continue;
      }
      log.error({ err: err instanceof Error ? err.message : String(err), modelId }, "nonStreamChatWithToolCalls: unexpected error");
      continue;
    }
  }

  // Chain exhausted
  const message = lastError instanceof Error ? lastError.message : "All models in chain failed";
  log.error({ role: params.role, message }, "nonStreamChatWithToolCalls: chain exhausted");
  throw new OpenRouterError("UPSTREAM_ERROR", `CHAIN_EXHAUSTED: ${message}`, 502, chainIds[chainIds.length - 1] ?? "unknown");
}

function openRouterEventToChunk(
  ev: OpenRouterStreamEvent,
  startedAt: number,
): HermesStreamChunk | null {
  const choice = ev.choices?.[0];
  if (!choice) return null;
  const delta = choice.delta;

  if (delta?.content) {
    return { type: "chunk", data: { content: delta.content } };
  }

  if (delta?.tool_calls && delta.tool_calls.length > 0) {
    const tc = delta.tool_calls[0]!;
    return {
      type: "tool_call",
      data: {
        tool: tc.function?.name ?? "unknown",
        args: tc.function?.arguments ? safeParseArgs(tc.function.arguments) : undefined,
      },
    };
  }

  if (choice.finish_reason) {
    return {
      type: "done",
      data: {
        usage: {
          tokens_in: ev.usage?.prompt_tokens ?? 0,
          tokens_out: ev.usage?.completion_tokens ?? 0,
          duration_ms: Date.now() - startedAt,
        },
      },
    };
  }

  return null;
}

function safeParseArgs(argsJson: string): unknown {
  try {
    return JSON.parse(argsJson);
  } catch {
    return argsJson; // leave as raw string; LLM streamed partial args
  }
}
