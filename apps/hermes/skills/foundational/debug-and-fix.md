---
name: debug-and-fix
description: Root-cause analysis on reported bugs. Reproduce first, isolate the minimal failing case, fix at the root (not the symptom), add a regression test, verify the fix doesn't break adjacent code, document the fix in the PR.
trigger:
  - "fix issue #"
  - "this is broken"
  - "bug report"
  - "regression"
tools_required: ["github"]
category: foundational
estimated_time: "5-30 minutes"
always_loaded: false
preferred_model_role: coding
---

# Debug and Fix

## Purpose

Encode the discipline of **root-cause debugging**. A bug is never fixed at the symptom; the symptom is a clue to the root cause. The reproducer is the most important artifact; without a reproducer, the fix is a guess. The regression test is the second most important artifact; without it, the bug returns. The debug-and-fix workflow is the one the `debug` sub-agent follows when the orchestrator dispatches a "required fix" or a reported bug.

## Prerequisites

- The bug report (issue, log line, screenshot, repro steps)
- The relevant code path (read the file, understand the data flow)
- The test framework (vitest in `apps/api`, `apps/hermes`; jest in `apps/mobile`, `apps/web`)
- The git log of the affected file (to spot the recent change that may have introduced the bug)
- Access to the dev environment (a local `pnpm -F <package> dev` or a dev container)

## Steps

### Step 1: Reproduce the bug (mandatory)

A bug that can't be reproduced can't be fixed confidently. Three sub-steps:

1. **Read the bug report** — what did the user see? what did they expect? what were the exact steps?
2. **Find the minimal reproducer** — strip away everything that's not needed. If the user reported "the workflow trigger fails on save," the minimal reproducer might be "POST to `/api/cms/workflows` with payload X" — not "click the button on the page."
3. **Run the reproducer** — confirm you see the bug. Capture the exact output (log line, HTTP response, stack trace).

A reproducer is one of:
- **A failing test** — best, because it's automated and persists
- **A script** — `apps/hermes/tests/repro/<bug-id>.ts`, runnable via `pnpm tsx`
- **A curl/HTTP request** — the response is the bug

Document the reproducer in the PR description. **No reproducer → no fix.**

### Step 2: Isolate the failing case

Once the reproducer is consistent, isolate the **minimal failing input** — the smallest change in input that flips the bug on/off. This is the "boundary" of the bug.

For a runtime bug:
- Bisect the log: at which line does the expected value diverge from the actual value?
- Add a `console.log` (or pino `.debug`) at the boundary, run the reproducer, observe.
- Repeat: each `console.log` halves the search space.

For a type-error or build-error:
- The error is the boundary. Read the TS error verbatim; the file + line + type mismatch is the boundary.
- The fix is usually a type narrowing (e.g. `if (x != null)` before `x.foo`) or a missing import.

For a UI bug:
- Inspect the DOM (React DevTools or Expo Inspector) to see the rendered state.
- The boundary is the component that renders the wrong thing.

Document the boundary in the PR description. **The fix is targeted at the boundary, not the symptom.**

### Step 3: Identify the root cause (not the symptom)

The root cause is **why** the boundary is wrong. A common pitfall is fixing at the symptom:

| Symptom | Bad fix | Root cause | Right fix |
|---|---|---|---|
| `null.foo` throws | Add `?.` everywhere `foo` is accessed | The `null` shouldn't have been `null` in the first place | Trace back: where is `null` introduced? Fix the source. |
| Workflow fails on save | Wrap the handler in try/catch and log the error | The handler is missing a validation step | Add the validation. The try/catch was a band-aid. |
| Page renders slowly | Add `useMemo` to the slow computation | The slow computation is reading the wrong index | Add the right index; the `useMemo` was a band-aid. |
| Type error on `process.env.X` | Cast to `string` | `X` is optional in the env schema | Make the schema explicit (`z.string()` vs `z.string().optional()`). |

The right fix is **smaller** than the bad fix. The bad fix papers over; the right fix corrects.

### Step 4: Write a regression test FIRST

Before editing the production code, write a test that **fails with the reproducer and will pass with the fix**. The test is the regression guard.

```ts
// apps/api/tests/regression/issue-123.test.ts
import { describe, it, expect } from "vitest";

describe("workflow create — handles missing 'name' field (issue #123)", () => {
  it("returns 422 VALIDATION when 'name' is missing", async () => {
    const response = await api.post("/api/cms/workflows", { trigger: "manual" });
    expect(response.status).toBe(422);
    expect(response.data.error.code).toBe("VALIDATION");
  });
});
```

Run the test; it should fail. The failure is the reproducer. Now apply the fix; the test should pass. **The test is the proof that the fix works.**

The regression test lives at:
- `apps/<package>/tests/regression/issue-<N>.test.ts` for API/Hermes
- `apps/<package>/tests/<feature>/issue-<N>.test.ts` for web/mobile
- Or co-located with the affected source file: `apps/<package>/src/lib/foo.test.ts`

### Step 5: Apply the fix

The fix targets the **root cause** identified in Step 3. The diff should be small and focused. If the fix is large (>200 lines), the root cause analysis is wrong — go back to Step 2.

Apply the fix; the regression test should now pass. Run the **adjacent tests** to confirm no regression:

```bash
# The package that owns the fix
pnpm -F <package> test

# The packages that depend on the affected code
pnpm -F <dependent-package> test

# The standing DNA gates
pnpm -r typecheck
pnpm any-gate
pnpm color-gate
pnpm factory-check
pnpm import-check
pnpm type-drift:check
```

A fix that breaks an adjacent test is a fix that papers over. Re-analyze the root cause.

### Step 6: Document the fix in the PR

The PR body is the audit trail:

```
**Fixes:** #<issue-id> · **Type:** bug

**Symptom:**
<one paragraph: what the user saw, what they expected>

**Root cause:**
<one paragraph: why the symptom happened; the line of code that was wrong>

**Fix:**
<one paragraph: what changed; the new behavior>

**Regression test:**
<file path + a sentence on what it asserts>

**Adjacent tests verified:**
<list of test files that pass>

**Audit IDs closed:** <C-/H-/P- if any>
```

A PR that doesn't pass this audit trail is a PR that the reviewer will reject.

## Output

A bug fix lands as 1 commit + 1 PR. The PR body is the audit trail. The commit message is `fix(<scope>): <short description of the root cause fix>`.

## Error Handling

- **The reproducer is intermittent** — add a `console.log` at the boundary, gather data, look for a pattern. If it's truly random, the bug is probably a race condition; add timing instrumentation (`Date.now()` before/after the suspect call) and look for the divergence.
- **The root cause is in a third-party library** — don't fix the library; work around it at the boundary. Document the workaround in the PR.
- **The fix requires a schema migration** — the fix is multi-WP: (1) add the migration, (2) update the generated types, (3) update the API + UI, (4) add the regression test. The first three are P1 (schema-first); the last is the regression guard.
- **The reviewer disagrees with the root cause** — the reviewer may have more context. Re-analyze together; if the disagreement persists, escalate to the orchestrator with both analyses side by side.
- **A "fix" turns into a refactor** — the WP is now too big. Split: (1) a "fix" PR with the minimal change to unblock the user, (2) a follow-up "refactor" PR with the deeper cleanup. The user gets unblocked; the codebase gets cleaner.

## Quality Checks

Before opening the PR, run:

```bash
# 1. The regression test fails without the fix, passes with the fix
pnpm -F <package> test -- --run regression

# 2. The adjacent tests pass
pnpm -F <package> test

# 3. The standing DNA gates
pnpm -r typecheck
pnpm any-gate
pnpm color-gate
pnpm factory-check
pnpm import-check
pnpm type-drift:check

# 4. The fix is targeted (diff stat is small)
git diff --stat <base>..HEAD
# Should be < 200 lines for a typical bug fix
```

A debug-and-fix PR that doesn't pass all four is a PR that papers over. The reviewer will catch it; the auditor will catch it; the bug will return.
