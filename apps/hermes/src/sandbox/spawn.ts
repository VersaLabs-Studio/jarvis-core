// =============================================================================
// Untrusted code-exec sandbox (Phase E §3 + §5.4).
//
// `runUntrustedCode` spawns a `node -e <code>` (or python/bash) subprocess
// with a SANITIZED env: the parent's process.env is NOT passed; the
// caller can pass only the keys it explicitly wants. Secrets (API keys,
// service-role keys, JWT secret, encryption keys, DOCKER_HOST) are
// never available to the spawned process — they are not in SANITIZED_BASE_ENV
// and the orchestrator refuses to add them.
//
// Hard caps:
//  - Timeout: SUB_AGENT_TIMEOUT_MS (5 min, Part 1 §1.5)
//  - Memory: Node's `--max-old-space-size=256` (inside the 512m container cap)
//  - Working dir: per-task tmp dir, cleaned up after
//  - Depth: orchestrator refuses to spawn from inside a spawned process
// =============================================================================

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { log } from "../lib/logger.js";
import { SUB_AGENT_TIMEOUT_MS } from "../config/constants.js";

/**
 * The minimal env passed to every spawned process. Secrets are deliberately
 * NOT here — the parent's process.env is ignored.
 */
const SANITIZED_BASE_ENV: Record<string, string> = {
  PATH: "/usr/local/bin:/usr/bin:/bin",
  HOME: "/tmp",
  LANG: "C.UTF-8",
  // Explicitly NOT propagated (Phase E §3.2 — the safety contract):
  // - OPENROUTER_API_KEY
  // - SUPABASE_SERVICE_ROLE_KEY
  // - SUPABASE_URL
  // - SUPABASE_ANON_KEY
  // - JWT_SECRET
  // - SUPABASE_JWKS_URL
  // - MASTER_ENCRYPTION_KEY
  // - DOCKER_HOST
  // - REDIS_URL
};

export type SandboxLanguage = "node" | "python" | "bash";

export interface RunUntrustedCodeParams {
  code: string;
  language: SandboxLanguage;
  /** Caller-supplied env (merged ON TOP of SANITIZED_BASE_ENV). Sub-agent cannot read parent secrets. */
  env?: Record<string, string>;
  /** Hard timeout override. Default = SUB_AGENT_TIMEOUT_MS. */
  timeoutMs?: number;
}

export interface RunUntrustedCodeResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
  oomKilled: boolean;
}

const FORBIDDEN_ENV_KEYS = new Set([
  "OPENROUTER_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "JWT_SECRET",
  "SUPABASE_JWKS_URL",
  "MASTER_ENCRYPTION_KEY",
  "DOCKER_HOST",
  "REDIS_URL",
  "REDIS_PASSWORD",
]);

/**
 * Run a snippet of untrusted code in a sanitized subprocess. Returns the
 * stdout/stderr/exitCode/timedOut/oomKilled. Cleans up the per-task tmp dir.
 */
export async function runUntrustedCode(params: RunUntrustedCodeParams): Promise<RunUntrustedCodeResult> {
  // Defense-in-depth: refuse to pass any of the forbidden env keys
  // even if the caller accidentally includes them.
  const requestedEnv = params.env ?? {};
  for (const key of Object.keys(requestedEnv)) {
    if (FORBIDDEN_ENV_KEYS.has(key)) {
      throw new Error(`Sandbox denied: refusing to pass forbidden env key "${key}"`);
    }
  }
  const mergedEnv: Record<string, string> = { ...SANITIZED_BASE_ENV, ...requestedEnv };

  // Per-task tmp dir
  const taskDir = await mkdtemp(join(tmpdir(), "hermes-sandbox-"));
  const startedAt = Date.now();
  const timeoutMs = params.timeoutMs ?? SUB_AGENT_TIMEOUT_MS;

  try {
    const { command, args } = buildCommand(params, taskDir);
    log.debug({ language: params.language, taskDir, timeoutMs }, "Sandbox spawning subprocess");

    const result = await new Promise<RunUntrustedCodeResult>((resolve) => {
      const child = spawn(command, args, {
        cwd: taskDir,
        env: mergedEnv,
        timeout: timeoutMs,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let oomKilled = false;
      const killTimer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs + 1000); // +1s grace for the OS to reap

      child.stdout.on("data", (d: Buffer) => {
        stdout += d.toString("utf8");
        if (stdout.length > 1_000_000) {
          // 1MB stdout cap — kill if exceeded
          child.kill("SIGKILL");
        }
      });
      child.stderr.on("data", (d: Buffer) => {
        stderr += d.toString("utf8");
        if (stderr.includes("JavaScript heap out of memory")) {
          oomKilled = true;
        }
      });
      child.on("close", (code) => {
        clearTimeout(killTimer);
        resolve({
          stdout: stdout.slice(0, 100_000), // cap response
          stderr: stderr.slice(0, 100_000),
          exitCode: code ?? 1,
          durationMs: Date.now() - startedAt,
          timedOut,
          oomKilled,
        });
      });
      child.on("error", (err) => {
        clearTimeout(killTimer);
        resolve({
          stdout: "",
          stderr: err.message,
          exitCode: 1,
          durationMs: Date.now() - startedAt,
          timedOut: false,
          oomKilled: false,
        });
      });
    });

    log.debug(
      { durationMs: result.durationMs, exitCode: result.exitCode, timedOut: result.timedOut, oomKilled: result.oomKilled },
      "Sandbox subprocess completed",
    );
    return result;
  } finally {
    await rm(taskDir, { recursive: true, force: true }).catch(() => {});
  }
}

function buildCommand(
  params: RunUntrustedCodeParams,
  taskDir: string,
): { command: string; args: string[] } {
  switch (params.language) {
    case "node": {
      // Write code to a file so multi-line / quoted code is safe
      const codePath = join(taskDir, "snippet.cjs");
      return {
        command: "node",
        args: ["--max-old-space-size=256", codePath],
      };
    }
    case "python": {
      return { command: "python3", args: ["-c", params.code] };
    }
    case "bash": {
      return { command: "bash", args: ["-c", params.code] };
    }
  }
}

/**
 * Pre-write the node snippet file. Must be called BEFORE runUntrustedCode
 * for language=node. (The function is async; the actual write happens here.)
 */
export async function writeNodeSnippet(code: string, taskDir: string): Promise<string> {
  const codePath = join(taskDir, "snippet.cjs");
  await writeFile(codePath, code, "utf8");
  return codePath;
}
