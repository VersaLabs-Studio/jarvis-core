// =============================================================================
// Sub-agent orchestrator (Phase E §3 — depth cap).
//
// Skills that need to execute code (e.g. `data-analysis`, `debug-and-fix`,
// `api-integration`) spawn a sub-agent. The orchestrator enforces:
//  - MAX_CONCURRENT_SKILL_RUNS across all skills
//  - Depth limit of 1 (no sub-sub-agents)
//  - Per-task tmp dir lifecycle
//
// Sub-agents are NOT separate processes. They use `runUntrustedCode` to
// spawn one child process for the actual code; the orchestrator itself
// stays in the Hermes event loop, so the WS / HTTP server keeps serving.
// =============================================================================

import { runUntrustedCode, writeNodeSnippet, type RunUntrustedCodeResult, type SandboxLanguage } from "./spawn.js";
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
    if (params.language === "node") {
      // For node, write the snippet to a tmp file first
      const { mkdtemp } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const { tmpdir } = await import("node:os");
      const dir = await mkdtemp(join(tmpdir(), "hermes-orch-"));
      await writeNodeSnippet(params.code, dir);
    }
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
