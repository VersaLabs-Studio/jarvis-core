// =============================================================================
// Smoke test for `runUntrustedCode` (F1 audit fix).
//
// F1 bug: `orchestrator.ts` used to write the node snippet to a separate
// `hermes-orch-*` dir while `spawn.ts:buildCommand('node')` ran
// `node …/snippet.cjs` from `runUntrustedCode`'s OWN `hermes-sandbox-*`
// taskDir. The file was never in the cwd `node` started in, so every
// `language: "node"` skill got `ENOENT` on `snippet.cjs` and the run
// reported `exitCode: 1` with empty stdout.
//
// F1 fix: `runUntrustedCode` now writes the snippet into its own taskDir
// immediately before spawn. This test exercises the exact path: a trivial
// `console.log` snippet, `language: "node"`, and asserts that the
// subprocess actually ran and returned exit code 0. If the F1 regression
// returns, this test fails (exitCode 1, stdout empty).
//
// The logger singleton in `src/lib/logger.ts` calls `getEnv()` on first
// use, which validates the env. We set a fake `OPENROUTER_API_KEY` in
// `beforeEach` so `validateEnv()` doesn't `process.exit(1)` mid-test.
// =============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { runUntrustedCode } from "../../src/sandbox/spawn.js";

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key-1234567890";
});

describe("runUntrustedCode (F1 smoke — node snippet in own taskDir)", () => {
  it("runs a trivial language:node console.log snippet with exitCode === 0", async () => {
    const result = await runUntrustedCode({
      code: 'console.log("smoke");',
      language: "node",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("smoke");
    expect(result.timedOut).toBe(false);
    expect(result.oomKilled).toBe(false);
  });
});
