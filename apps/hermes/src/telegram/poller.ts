// =============================================================================
// Telegram inbound poller (F — two-way channel for MVP).
//
// Long-polls getUpdates in a background loop. Gated on TELEGRAM_BOT_TOKEN
// present AND a non-empty TELEGRAM_ALLOW_FROM allow-list. Updates from
// unauthorized chat ids are IGNORED (security gate).
//
// For allowed text messages: routes through the existing agent runtime
// (skill-matcher → nonStreamChatWithToolCalls) — same path as chat-stream.ts.
// Sends the agent's final output back via bot.sendMessage.
//
// Design constraints:
//  - Non-fatal: all Telegram I/O is isolated from cron engine / sandbox.
//  - Loop survives transient failures without crashing hermes.
//  - Long-poll (NOT webhook): the VPS has no public HTTPS yet.
// =============================================================================

import { getEnv } from "../config/env.js";
import { log } from "../lib/logger.js";
import { getAlwaysLoadedSystemContext, getLoadedSkills } from "../lib/skill-loader.js";
import { matchSkillToMessage } from "../lib/skill-matcher.js";
import { nonStreamChatWithToolCalls, OpenRouterError } from "../lib/openrouter.js";
import { chainForRole } from "../config/chains.js";
import { getResolved } from "../lib/model-resolver.js";
import { sendMessage, getUpdates, type TelegramUpdate } from "./bot.js";
import type { HermesMessage, HermesRole } from "@jarvis/shared";

const POLL_TIMEOUT_SEC = 30;
const BACKOFF_MS = 3_000;
const MAX_BACKOFF_MS = 30_000;
const TELEGRAM_MAX_MSG_LEN = 4096;

// ---------------------------------------------------------------------------
// Allow-list parser
// ---------------------------------------------------------------------------

/**
 * Parse TELEGRAM_ALLOW_FROM into a Set of chat ids.
 * Format: comma-separated integers (e.g. "343865518,123456789").
 * Empty/unset => empty set (inbound DISABLED entirely).
 */
export function parseAllowList(raw: string | undefined): Set<number> {
  if (!raw || raw.trim() === "") return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map(Number)
      .filter((n) => !Number.isNaN(n)),
  );
}

// ---------------------------------------------------------------------------
// Message handler — routes through the existing agent runtime
// ---------------------------------------------------------------------------

async function handleMessage(chatId: number, text: string): Promise<void> {
  const startTime = Date.now();

  // Skill-matcher (same as chat-stream.ts §4.3)
  const matchedSkill = matchSkillToMessage(text, getLoadedSkills());
  let role: HermesRole = "office"; // default for Telegram (general Q&A)
  const messages: HermesMessage[] = [];

  // System context (always-loaded skills)
  const systemContext = getAlwaysLoadedSystemContext();
  if (systemContext) {
    messages.push({ role: "system", content: systemContext });
  }

  // Inject matched skill body into system prompt
  if (matchedSkill) {
    log.info(
      { skill: matchedSkill.frontmatter.name, chatId },
      "Telegram matched a skill trigger",
    );
    if (matchedSkill.frontmatter.preferred_model_role) {
      role = matchedSkill.frontmatter.preferred_model_role;
    }
    messages.push({
      role: "system",
      content: [
        `# Active skill: ${matchedSkill.frontmatter.name}`,
        "",
        matchedSkill.body,
      ].join("\n"),
    });
  }

  messages.push({ role: "user", content: text });

  // Resolve model via the role's chain (same as chat-stream.ts)
  const chainIds = chainForRole(role);
  const resolved = getResolved();
  const resolveChain = (configured: string): string => {
    const chain = resolved[role];
    if (chain.primary.configured === configured) return chain.primary.resolved;
    const fb = chain.fallback.find((f) => f.configured === configured);
    return fb?.resolved ?? configured;
  };

  // Chain fallback (mirrors chat-stream.ts / nonStreamChatWithToolCalls)
  let reply: string | null = null;
  let lastError: unknown = null;

  for (const configuredId of chainIds) {
    const modelId = resolveChain(configuredId);
    try {
      const result = await nonStreamChatWithToolCalls({
        role,
        messages,
        tools: [], // no tool calling for Telegram (v1.5)
      });
      reply = result.text || "(empty response)";
      log.info(
        {
          chatId,
          model: result.model,
          tokensIn: result.usage.tokens_in,
          tokensOut: result.usage.tokens_out,
          durationMs: Date.now() - startTime,
        },
        "Telegram agent responded",
      );
      break;
    } catch (err) {
      lastError = err;
      if (err instanceof OpenRouterError) {
        if (err.code === "VALIDATION") {
          log.error({ err: err.message, modelId }, "Telegram: validation error (no retry)");
          break;
        }
        log.warn({ err: err.message, code: err.code, modelId }, "Telegram: model failed, trying next");
        continue;
      }
      log.error({ err: err instanceof Error ? err.message : String(err), modelId }, "Telegram: unexpected error");
      continue;
    }
  }

  // Chain exhausted
  if (!reply) {
    const errMsg = lastError instanceof Error ? lastError.message : "All models in chain failed";
    reply = `Sorry, I couldn't process that right now. (${errMsg.slice(0, 100)})`;
    log.error({ chatId, err: errMsg }, "Telegram: chain exhausted");
  }

  // Truncate if over Telegram limit
  if (reply.length > TELEGRAM_MAX_MSG_LEN) {
    reply = reply.slice(0, TELEGRAM_MAX_MSG_LEN - 20) + "\n…(truncated)";
  }

  await sendMessage(chatId, reply);
}

// ---------------------------------------------------------------------------
// Main poll loop
// ---------------------------------------------------------------------------

let _running = false;
let _offset: number | undefined;

async function processUpdate(update: TelegramUpdate, allowList: Set<number>): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.text) return; // ignore non-text messages

  const chatId = msg.chat.id;

  // SECURITY GATE: ignore unauthorized chat ids
  if (!allowList.has(chatId)) {
    log.warn({ chatId, from: msg.from?.username ?? "unknown" }, "telegram: ignoring unauthorized chat");
    return;
  }

  log.info({ chatId, from: msg.from?.username ?? "unknown", text: msg.text.slice(0, 100) }, "telegram: processing message");

  // Brief ack (non-blocking)
  void sendMessage(chatId, "Got it, processing…");

  // Route through agent runtime
  await handleMessage(chatId, msg.text);
}

/**
 * Start the Telegram poller. Called from server.ts on boot.
 * Gated on TELEGRAM_BOT_TOKEN + non-empty TELEGRAM_ALLOW_FROM.
 * Returns immediately (polling runs in background).
 */
export function startPoller(): void {
  const env = getEnv();

  if (!env.TELEGRAM_BOT_TOKEN) {
    log.info("Telegram: TELEGRAM_BOT_TOKEN not set; bot disabled");
    return;
  }

  const allowList = parseAllowList(env.TELEGRAM_ALLOW_FROM);
  if (allowList.size === 0) {
    log.info("Telegram: TELEGRAM_ALLOW_FROM empty/unset; inbound DISABLED (outbound notifications still work)");
    return;
  }

  log.info({ allowListSize: allowList.size }, "Telegram poller starting (inbound enabled)");

  _running = true;
  void pollLoop(allowList);
}

/** Stop the poller (graceful shutdown). */
export function stopPoller(): void {
  _running = false;
  log.info("Telegram poller stopping");
}

async function pollLoop(allowList: Set<number>): Promise<void> {
  let backoff = BACKOFF_MS;

  while (_running) {
    try {
      const updates = await getUpdates(_offset, POLL_TIMEOUT_SEC);
      if (updates.length > 0) {
        // Process sequentially to maintain offset ordering
        for (const update of updates) {
          await processUpdate(update, allowList);
        }
        const lastUpdate = updates[updates.length - 1];
        if (lastUpdate) {
          _offset = lastUpdate.update_id + 1;
        }
        backoff = BACKOFF_MS; // reset backoff on success
      }
    } catch (err) {
      // Should not happen (getUpdates catches internally), but defensive
      log.warn({ err: err instanceof Error ? err.message : String(err) }, "Telegram poll loop error");
      await sleep(backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
