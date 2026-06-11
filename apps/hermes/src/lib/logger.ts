// =============================================================================
// Hermes logger (pino). Production emits raw JSON; dev pretty-prints.
// Singleton; use `log.info({ ... }, "msg")` everywhere in Hermes.
// =============================================================================

import pino, { type Logger } from "pino";
import { getEnv } from "../config/env.js";

let _log: Logger | null = null;

export function getLogger(): Logger {
  if (_log) return _log;
  const env = getEnv();
  _log = pino({
    level: env.NODE_ENV === "production" ? "info" : "debug",
    base: { service: "hermes" },
    ...(env.NODE_ENV !== "production"
      ? {
          transport: {
            target: "pino-pretty",
            options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
          },
        }
      : {}),
  });
  return _log;
}

export const log = new Proxy({} as Logger, {
  get(_target, prop) {
    return getLogger()[prop as keyof Logger];
  },
});
