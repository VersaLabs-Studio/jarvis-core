// =============================================================================
// Telegram Bot API client (F — two-way channel for MVP).
//
// Thin wrappers around the Telegram Bot HTTP API. Uses global fetch +
// AbortSignal.timeout. Non-fatal on error (log.warn, never throw into
// the boot path).
//
// API docs: https://core.telegram.org/bots/api
// =============================================================================

import { getEnv } from "../config/env.js";
import { log } from "../lib/logger.js";

const TELEGRAM_API = "https://api.telegram.org";
const DEFAULT_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Types (minimal — only what the poller + notify need)
// ---------------------------------------------------------------------------

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
    date: number;
  };
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function botToken(): string {
  return getEnv().TELEGRAM_BOT_TOKEN ?? "";
}

function botUrl(method: string): string {
  return `${TELEGRAM_API}/bot${botToken()}/${method}`;
}

// ---------------------------------------------------------------------------
// sendMessage — POST /bot<token>/sendMessage
// ---------------------------------------------------------------------------

export async function sendMessage(chatId: number, text: string): Promise<boolean> {
  if (!botToken()) return false;
  try {
    const response = await fetch(botUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    const data = (await response.json()) as TelegramApiResponse<unknown>;
    if (!data.ok) {
      log.warn({ chatId, description: data.description }, "Telegram sendMessage failed");
      return false;
    }
    return true;
  } catch (err) {
    log.warn({ chatId, err: err instanceof Error ? err.message : String(err) }, "Telegram sendMessage threw");
    return false;
  }
}

// ---------------------------------------------------------------------------
// getUpdates — GET /bot<token>/getUpdates (long-poll)
// ---------------------------------------------------------------------------

export async function getUpdates(
  offset?: number,
  timeoutSec = 30,
): Promise<TelegramUpdate[]> {
  if (!botToken()) return [];
  try {
    const params = new URLSearchParams({
      timeout: String(timeoutSec),
    });
    if (offset !== undefined) {
      params.set("offset", String(offset));
    }
    const response = await fetch(`${botUrl("getUpdates")}?${params.toString()}`, {
      signal: AbortSignal.timeout((timeoutSec + 5) * 1000), // extra 5s buffer
    });
    const data = (await response.json()) as TelegramApiResponse<TelegramUpdate[]>;
    if (!data.ok) {
      log.warn({ description: data.description }, "Telegram getUpdates failed");
      return [];
    }
    return data.result ?? [];
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : String(err) }, "Telegram getUpdates threw");
    return [];
  }
}
