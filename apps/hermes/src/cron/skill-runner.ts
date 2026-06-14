// =============================================================================
// Cron skill-runner (Phase E §5.4 E4 — C2 closure).
//
// `invokeSkillViaApi` is the C2 binding fix. It does NOT mark a workflow
// "success" on the 202 `{run_id}` from POST /v1/skill/run. Instead:
//
//   1. POST /v1/skill/run → {run_id}
//   2. Open a WebSocket to /ws, subscribe to [run_id]
//   3. Await the real `skill:result` or `skill:error` message
//   4. Return the result; the engine writes the terminal status to
//      workflow_runs based on the message type
//
// The §3-prelude bug: the engine's `invokeSkillViaApi` returned the
// 202 `{run_id}` as the result. The skill might still be running, might
// fail, or might never finish. Marking "success" on the 202 was the
// wrong signal; the §7 gate catches it as a hollow audit.
// =============================================================================

import { log } from "../lib/logger.js";

export type SkillCompletion =
  | { kind: "result"; runId: string; output: unknown }
  | { kind: "error"; runId: string; error: string };

export interface InvokeSkillParams {
  /** Base URL of the Hermes HTTP server (e.g. http://localhost:8765). */
  baseUrl: string;
  /** WebSocket URL of the Hermes WS endpoint (e.g. ws://localhost:8765/ws). */
  wsUrl: string;
  /** The skill name to invoke (e.g. "morning-audit"). */
  skill: string;
  /** The skill's args. */
  args: Record<string, unknown>;
  /** Optional runId to correlate. If not provided, the server's run_id is used. */
  runId?: string;
  /** Hard timeout (ms). Default: 5 minutes. */
  timeoutMs?: number;
}

/**
 * Invoke a skill via the Hermes API and await the real completion over WS.
 * Throws on:
 *   - The initial POST returning non-2xx
 *   - The WebSocket failing to connect within 5s
 *   - The skill not completing within `timeoutMs`
 *   - Network/parse errors
 */
export async function invokeSkillViaApi(params: InvokeSkillParams): Promise<SkillCompletion> {
  const timeoutMs = params.timeoutMs ?? 5 * 60_000;
  const subscribeRunId = params.runId ?? "any";

  // Step 1: POST /v1/skill/run → {run_id}
  const initResponse = await fetch(`${params.baseUrl}/v1/skill/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill: params.skill, args: params.args }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!initResponse.ok) {
    const text = await initResponse.text().catch(() => "unknown");
    throw new Error(`POST /v1/skill/run returned ${initResponse.status}: ${text.slice(0, 200)}`);
  }
  const initJson = (await initResponse.json()) as { ok: true; data: { run_id: string } };
  const runId = initJson.data.run_id;

  // Step 2: Open WS, subscribe to this run_id, await skill:result or skill:error
  return await new Promise<SkillCompletion>((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(params.wsUrl);
    } catch (err) {
      reject(new Error(`WebSocket construction failed: ${err instanceof Error ? err.message : String(err)}`));
      return;
    }

    const timer = setTimeout(() => {
      try { ws.close(); } catch { /* ignore */ }
      reject(new Error(`Skill '${params.skill}' did not complete within ${timeoutMs}ms`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      try { ws.close(); } catch { /* ignore */ }
    };

    ws.addEventListener("open", () => {
      try {
        ws.send(JSON.stringify({ type: "subscribe", run_ids: [runId] }));
      } catch (err) {
        cleanup();
        reject(new Error(`WS send failed: ${err instanceof Error ? err.message : String(err)}`));
      }
    });

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString()) as Record<string, unknown>;
        const eventType = data["type"];
        const eventRunId = data["run_id"];
        // If the caller passed a specific runId to subscribe to, only
        // match that one. Otherwise accept any.
        if (subscribeRunId !== "any" && eventRunId !== runId) return;
        if (eventType === "skill:result" && eventRunId === runId) {
          cleanup();
          resolve({ kind: "result", runId, output: data["output"] });
        } else if (eventType === "skill:error" && eventRunId === runId) {
          cleanup();
          const errMsg = typeof data["error"] === "string" ? data["error"] : "unknown error";
          resolve({ kind: "error", runId, error: errMsg });
        }
      } catch (err) {
        log.warn({ err: err instanceof Error ? err.message : String(err) }, "WS message parse failed; ignoring");
      }
    });

    ws.addEventListener("error", () => {
      cleanup();
      reject(new Error("WebSocket error (see server logs)"));
    });

    ws.addEventListener("close", (event) => {
      cleanup();
      if (event.code !== 1000) {
        // Abnormal close
        reject(new Error(`WebSocket closed abnormally: code=${event.code} reason=${event.reason}`));
      }
    });
  });
}
