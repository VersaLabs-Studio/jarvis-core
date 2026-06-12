// =============================================================================
// Sub-agent orchestrator (Phase E §3 — depth cap).
//
// Skills that need to execute code (e.g. `data-analysis`, `debug-and-fix`,
// `api-integration`) spawn a sub-agent. The orchestrator enforces:
//  - MAX_CONCURRENT_SKILL_RUNS across all skills
//  - Depth limit of 1 (no sub-sub-agents)
//  - Per-task tmp dir lifecycle (delegated to runUntrustedCode)
//
// Sub-agents are NOT separate processes. They use `runUntrustedCode` to
// spawn one child process for the actual code; the orchestrator itself
// stays in the Hermes event loop, so the WS / HTTP server keeps serving.
//
// F1 fix: the snippet file is now written by `runUntrustedCode` itself,
// inside the same per-task tmp dir that `node` will run from. Previously
// this orchestrator wrote to a separate `hermes-orch-*` dir that the
// spawn never read from — the node child got ENOENT on `snippet.cjs` and
// every `language: "node"` skill silently crashed. The pre-write block
// and its import of `writeNodeSnippet` are gone.
// =============================================================================

import { runUntrustedCode, type RunUntrustedCodeResult, type SandboxLanguage } from "./spawn.js";
import { log } from "../lib/logger.js";
import { MAX_CONCURRENT_SKILL_RUNS, SUB_AGENT_TIMEOUT_MS } from "../config/constants.js";

interface ActiveRun {
  runId: string;
  skill: string;
  startedAt: number;
}

const _active: Set<ActiveRun> = new Set();

/**
 * Spawn a sub-agent to run the given code. Resolves when the subprocess
 * finishes. Caller (a skill runner) is responsible for emitting progress
 * over the WS endpoint.
 */
export async function spawnSubAgent(params: {
  runId: string;
  skill: string;
  code: string;
  language: SandboxLanguage;
  env?: Record<string, string>;
  timeoutMs?: number;
}): Promise<RunUntrustedCodeResult> {
  if (_active.size >= MAX_CONCURRENT_SKILL_RUNS) {
    throw new Error(`Sub-agent pool exhausted (max ${MAX_CONCURRENT_SKILL_RUNS} concurrent)`);
  }
  const run: ActiveRun = { runId: params.runId, skill: params.skill, startedAt: Date.now() };
  _active.add(run);
  log.info({ runId: run.runId, skill: run.skill, active: _active.size }, "Sub-agent starting");
  try {
    const result = await runUntrustedCode({
      code: params.code,
      language: params.language,
      env: params.env,
      timeoutMs: params.timeoutMs ?? SUB_AGENT_TIMEOUT_MS,
    });
    return result;
  } finally {
    _active.delete(run);
    log.info(
      { runId: run.runId, skill: run.skill, active: _active.size, durationMs: Date.now() - run.startedAt },
      "Sub-agent finished",
    );
  }
}

export function getActiveCount(): number {
  return _active.size;
}

export function getActiveRuns(): ActiveRun[] {
  return Array.from(_active);
}
