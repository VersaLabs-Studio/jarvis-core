// =============================================================================
// POST /v1/chat/stream — SSE chat completions (Phase E §5.2).
//
// Body: { session_id, message, model?, tools?, history?, role? }
// Response: text/event-stream of `data: <HermesStreamChunk>\n\n`, ending
// with the literal `data: [DONE]\n\n` (consumed by apps/api/src/lib/hermes.ts).
//
// Chain fallback: tries the role's primary, then each fallback. On per-model
// 404 / 4xx (other than VALIDATION) or TIMEOUT, advances to the next. On
// CHAIN_EXHAUSTED, returns 502 with the standard envelope.
// =============================================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { fail } from "../lib/response.js";
import { log } from "../lib/logger.js";
import { getResolved } from "../lib/model-resolver.js";
import { chainForRole } from "../config/chains.js";
import {
  streamChat,
  OpenRouterError,
  type OpenRouterChatParams,
} from "../lib/openrouter.js";
import { getAlwaysLoadedSystemContext } from "../lib/skill-loader.js";
import { CHAIN_TOTAL_TIMEOUT_MS } from "../config/constants.js";
import type { HermesMessage, HermesRole, HermesStreamChunk } from "@jarvis/shared";

const chatStreamBodySchema = z.object({
  session_id: z.string().min(1),
  message: z.string().min(1).max(100_000),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system", "tool"]),
        content: z.string().min(1),
        model: z.string().optional(),
        tools_used: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  role: z.enum(["planning", "coding", "office", "fast", "audit"]).default("coding"),
});

export async function chatStreamRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post("/v1/chat/stream", async (request, reply) => {
    const parsed = chatStreamBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, "VALIDATION", "Invalid chat-stream body", parsed.error.flatten());
    }
    const body = parsed.data;

    // If the caller named an explicit model, use it (admin override — bypasses chain).
    // Otherwise, use the role's chain.
    const explicitModel = body.model;
    const role: HermesRole = body.role;
    const chainIds = explicitModel ? [explicitModel] : chainForRole(role);
    const resolved = getResolved();

    // Build the messages array (system context + history + user message)
    const systemContext = getAlwaysLoadedSystemContext();
    const messages: HermesMessage[] = [];
    if (systemContext) {
      messages.push({ role: "system", content: systemContext });
    }
    if (body.history) {
      messages.push(...body.history);
    }
    messages.push({ role: "user", content: body.message });

    // Set SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const chainStartedAt = Date.now();
    let lastError: unknown = null;

    for (const modelId of chainIds) {
      if (Date.now() - chainStartedAt > CHAIN_TOTAL_TIMEOUT_MS) {
        log.warn({ role, totalElapsedMs: Date.now() - chainStartedAt }, "Chain total timeout reached; aborting");
        break;
      }
      try {
        // Use the resolved ID (handles slug auto-correction)
        const resolvedId = resolveModelId(modelId, resolved, role);
        log.info(
          { role, modelId, resolvedId, sessionId: body.session_id },
          "Chat stream: trying model",
        );
        const chatParams: OpenRouterChatParams = {
          model: resolvedId,
          messages,
          stream: true,
        };
        for await (const chunk of streamChat(chatParams)) {
          if (!reply.raw.writable) {
            log.warn({ sessionId: body.session_id }, "Client disconnected; aborting stream");
            return;
          }
          reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
          if (chunk.type === "done") {
            reply.raw.write("data: [DONE]\n\n");
            reply.raw.end();
            return;
          }
        }
        // Stream completed without a "done" chunk — emit one and close
        const fallback: HermesStreamChunk = { type: "done", data: { usage: { tokens_in: 0, tokens_out: 0, duration_ms: Date.now() - chainStartedAt } } };
        reply.raw.write(`data: ${JSON.stringify(fallback)}\n\n`);
        reply.raw.write("data: [DONE]\n\n");
        reply.raw.end();
        return;
      } catch (err) {
        lastError = err;
        if (err instanceof OpenRouterError) {
          if (err.code === "VALIDATION") {
            // Don't retry with a different model — the request body is bad.
            log.error({ err: err.message, modelId }, "Chat stream: validation error (no retry)");
            reply.raw.write(
              `data: ${JSON.stringify({ type: "error", data: { error: err.message } satisfies HermesStreamChunk["data"] })}\n\n`,
            );
            reply.raw.end();
            return;
          }
          log.warn({ err: err.message, code: err.code, modelId }, "Chat stream: model failed, trying next");
          continue;
        }
        log.error({ err: err instanceof Error ? err.message : String(err), modelId }, "Chat stream: unexpected error");
        continue;
      }
    }

    // Chain exhausted
    const message = lastError instanceof Error ? lastError.message : "All models in chain failed";
    log.error({ role, message }, "Chat stream: chain exhausted");
    reply.raw.write(
      `data: ${JSON.stringify({ type: "error", data: { error: `CHAIN_EXHAUSTED: ${message}` } })}\n\n`,
    );
    reply.raw.end();
  });
}

/**
 * Look up the resolved model ID for a given configured ID + role.
 * Falls back to the configured ID if no resolution was recorded.
 */
function resolveModelId(
  configured: string,
  resolved: ReturnType<typeof getResolved>,
  role: HermesRole,
): string {
  const chain = resolved[role];
  if (chain.primary.configured === configured) return chain.primary.resolved;
  const fb = chain.fallback.find((f) => f.configured === configured);
  return fb?.resolved ?? configured;
}
