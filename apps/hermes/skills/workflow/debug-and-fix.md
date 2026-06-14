---
name: debug-and-fix
description: Workflow skill — read a GitHub issue or error, root-cause the bug, fix it, run tests, open a PR. Composes the foundational debug-and-fix methodology with the github-pr-workflow for autonomous bug resolution.
trigger:
  - "fix issue #"
  - "fix bug #"
  - "this is broken"
  - "debug this"
tools_required: ["github"]
category: swe
estimated_time: "15-45 minutes"
always_loaded: false
preferred_model_role: coding
---

# Debug and Fix (Workflow)

> **This is the workflow skill, distinct from the foundational `debug-and-fix.md`.** The foundational skill encodes the methodology (reproducer → root cause → regression test). This skill **applies** the methodology to a real GitHub issue, dispatching MCP tools and producing a PR.

## Purpose

The user says "fix issue #N" or "this is broken"; the skill reads the GitHub issue (or the error message), reproduces the bug, root-causes it, fixes it, adds a regression test, and opens a PR. The skill is **autonomous for small bugs** (clear repro, isolated fix) and **HALTS for large bugs** (unclear repro, multi-file change, no obvious fix) — those route to a human for triage.

The skill composes the foundational `debug-and-fix` (methodology) + `github-pr-workflow` (branch + PR) into a single flow. The skill uses the `code_exec` tool to run tests + verify the fix.

## Prerequisites

- A GitHub issue number (`args.issue_number`) OR a raw error message (`args.error_message`)
- The user is on a clean working tree of a feature branch (the skill creates the branch)
- The test framework is set up (`pnpm -F <package> test` works on the base)
- The repo has a CI workflow that runs on PRs

## Steps

### Step 1: Parse the bug

Two entry modes:

- **Issue number mode** — `args.issue_number = 89` → fetch the issue via GitHub MCP:
  ```
  github.get_issue({ issue_number: 89 })
  ```
  Capture: title, body, labels, comments, assignee, linked PRs.

- **Error message mode** — `args.error_message = "TypeError: cannot read property 'foo' of null at /api/cms/workflows (handler.ts:42)"` → parse the stack trace; the file + line are the boundary.

### Step 2: Triage (is this autonomous-fixable?)

A bug is autonomous-fixable iff:

- The repro is **clear** (the issue has a code snippet, a stack trace, or a screenshot of the failure)
- The fix is **isolated** (≤ 3 files; the issue doesn't say "the whole auth flow is broken")
- The fix doesn't require **schema changes** (no migration; no new column)
- The fix doesn't require **architecture changes** (no new service; no new entity)

If any of these is false, the skill **halts** with `skill:error` and a message:

> This bug requires human triage: <reason>. The issue is filed at <URL> with the triage note appended as a comment. Suggested next step: <suggestion>.

The triage note is appended to the issue as a comment via the GitHub MCP. The user is notified in chat.

### Step 3: Reproduce (if autonomous-fixable)

The skill follows the `debug-and-fix` methodology:

1. **Find the minimal reproducer** — read the affected code, identify the file + line, construct a failing test
2. **Write the regression test FIRST** — the test is the reproducer; it must fail without the fix
3. **Use `code_exec` to run the test** — confirm the failure
4. **Identify the root cause** — trace the data flow, find the boundary where the value diverges
5. **Apply the fix** — targeted change at the boundary

```typescript
// code_exec tool call example
const result = await executeToolCall({
  name: "code_exec",
  args: {
    code: `
      const { test } = require('vitest');
      const { workflowsHandler } = require('./handler');
      test('workflows handler returns 404 for missing workflow', async () => {
        const response = await workflowsHandler({ id: '00000000-0000-0000-0000-000000000000' });
        expect(response.status).toBe(404);
      });
    `,
    language: "node"
  }
});
```

The agentic loop iterates: test fails → fix → test passes.

### Step 4: Branch + commit

Create a feature branch (or fix branch) off `develop`:

```bash
git fetch origin
git checkout -b fix/issue-<N>-<short-slug> origin/develop
```

Commit the fix + the regression test in one commit:

```bash
git add <files>
git commit -m "fix(<scope>): <one-line root cause>

Closes #<N>

Symptom: <one sentence>
Root cause: <one sentence>
Fix: <one sentence>
Regression test: <file path>"
```

### Step 5: Open the PR

Invoke `github-pr-workflow` (or call the GitHub MCP directly):

```
github.create_pull_request({
  title: "Fix #<N>: <one-line summary>",
  body: `Closes #<N>

**Symptom:** <one sentence>
**Root cause:** <one sentence>
**Fix:** <one sentence>
**Regression test:** <file path>

🤖 Generated with [Claude Code](https://claude.com/claude-code)`,
  head: "fix/issue-<N>-<short-slug>",
  base: "develop",
})
```

The PR body follows the format from the foundational `debug-and-fix` skill §6.

### Step 6: Wait for CI

Poll the GitHub Actions run:

```
github.list_workflow_runs({ branch: "fix/issue-<N>-<short-slug>" })
```

CI must be green. If it fails, iterate (the fix may have introduced a regression; the test suite caught it).

### Step 7: Link the issue

Comment on the issue with a link to the PR:

```
github.create_issue_comment({
  issue_number: 89,
  body: "Fixed in #<PR_NUMBER>. The regression test is at <file path>. The fix targets <root cause>."
})
```

The issue auto-closes when the PR merges.

### Step 8: Notify the user

Send the user a chat message:

```
[FIX READY] Issue #89: <title>
- PR: <PR URL>
- Root cause: <one sentence>
- Regression test: <file path>
- Status: CI green, awaiting review
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "issue_number": 89,
    "pr_url": "...",
    "root_cause": "...",
    "regression_test": "...",
    "files_changed": [...],
    "duration_ms": ...
  }
}
```

The dashboard renders the result as a card; the chat shows the summary inline.

## Error Handling

- **Repro is unclear** — halt; post a triage comment; notify the user
- **The fix breaks an adjacent test** — the fix papers over; re-analyze the root cause; iterate
- **CI fails on the fix** — debug the CI failure; iterate
- **The issue is locked (e.g. archived repo)** — the user lacks permission; halt; notify the user
- **The fix is too large (>500 lines)** — halt; the fix is a refactor, not a bug fix; route to a human
- **The issue requires a schema change** — halt; route to the planner for a WP; the user approves a multi-WP fix

## Quality Checks

Before declaring the fix complete:

- [ ] Regression test fails without the fix
- [ ] Regression test passes with the fix
- [ ] Adjacent tests pass
- [ ] `pnpm -r typecheck` 0
- [ ] `pnpm any-gate` 0
- [ ] CI green on the fix branch
- [ ] PR opened with the right body
- [ ] Issue linked (PR mentioned in the issue body via `Closes #N`)
- [ ] User notified

A fix that doesn't pass all 9 is a degraded fix. The skill returns `skill:result` with `degraded: true` and a `note` field; the dashboard renders the note.
