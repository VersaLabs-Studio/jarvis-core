---
name: code-review
description: Workflow skill — review a GitHub PR end-to-end. Fetches the diff, runs the standing DNA gates, scores the Six Pillars, lists audit IDs, approves or requests changes. The "review PR #N" trigger.
trigger:
  - "review this code"
  - "review PR #"
  - "check PR #"
  - "code review PR"
tools_required: ["github"]
category: swe
estimated_time: "5-15 minutes"
always_loaded: false
preferred_model_role: audit
---

# Code Review (Workflow)

> **This is the workflow skill, distinct from the foundational `code-review.md`.** The foundational skill encodes the 7-block review format. This skill **applies** it to a real GitHub PR, dispatching the github MCP and the standing DNA gates to produce a structured review comment.

## Purpose

The user says "review PR #N" or "check this code"; the skill fetches the PR, reads the diff, runs the lint gates, scores the Six Pillars, and posts a structured review comment. The skill is **autonomous for routine reviews** (small PR, clear scope, no P0/P1 violations) and **HALTS for complex reviews** (large diff, architectural decisions, schema changes) — those route to a human reviewer.

The skill composes the foundational `code-review` (7-block format) + `audit-compliance` (Pillar scoring) + the standing DNA gates into a single flow.

## Prerequisites

- A GitHub PR number (`args.pr_number`)
- The user is a reviewer on the PR (the skill can post comments; the user has the GitHub permission)
- The PR's branch is checkable out (or the diff is fetched via the GitHub MCP)
- The standing DNA gates are runnable on the PR's branch (the skill checks out the branch in a worktree)

## Steps

### Step 1: Fetch the PR

```
github.get_pull_request({ pull_number: <args.pr_number> })
```

Capture: title, body, base, head, author, labels, review comments count, mergeable state, draft flag.

### Step 2: Validate the PR

The skill refuses if:
- The PR is a draft (drafts aren't ready for review)
- The PR is already merged (post-merge review is too late)
- The PR is closed without merge (no point reviewing)
- The PR base is `main` and the user is not an admin (production review needs a human)

The error message is clear; the user is asked to pick a different PR.

### Step 3: Fetch the diff

```
github.get_pull_request_diff({ pull_number: <args.pr_number> })
```

The response is a unified diff. The skill parses the diff into per-file changes.

### Step 4: Read each changed file

For each file in the diff:
- Read the full file (the diff is a hint; the full file is the context)
- Categorize: new file, modified file, deleted file, renamed file
- Note: lines added, lines removed, complexity (e.g. number of conditionals, number of async calls)

The skill builds a per-file summary in memory.

### Step 5: Run the standing DNA gates

The skill checks out the PR's branch in a worktree (or uses `gh pr checkout` if available), then runs:

```bash
pnpm -r typecheck
pnpm any-gate
pnpm color-gate
pnpm factory-check
pnpm import-check
pnpm type-drift:check
```

A hit on any is an **automatic blocker**. The skill captures the output verbatim for the review comment.

### Step 6: Score the Six Pillars

The skill follows the `audit-compliance` skill rubric:

- **P1 Schema-First** — every entity has a migration → types → Zod → registry → factory chain
- **P2 Factory Pattern** — every CRUD through the factory
- **P3 Modularization** — no cross-feature imports
- **P4 Premium UI** (if UI changes) — OKLCH, Framer Motion, four data-view states
- **P5 Docs as Architecture** — plan doc cited; docs updated; CHANGELOG entry
- **P6 Type Safety** — no `any`; Zod at boundaries

Each Pillar is scored 0-2. The total is /12; convert to /10.

### Step 7: List the audit IDs

For every violation (lint-gate hit or Pillar deduction), the skill opens an **audit ID**:

- **C-*** (Correctness) — the code does the wrong thing
- **H-*** (Hardening / Security) — the code is correct but unsafe
- **P-*** (Pillar) — the code violates a Pillar

Each audit ID is **specific** — a file:line, a lint-gate output, or a screenshot. The engineer fixes the audit ID; the skill re-reviews on request.

### Step 8: Check the PR's specific concerns

A good PR body lists:
- The audit IDs the PR closes
- Deviations from the plan
- Test results

The skill verifies each claim against the diff. A claim that's not in the diff is a P5 violation (the PR body is the architecture; lying about it is a P5 violation).

### Step 9: Check the diff size

The diff should be < 2000 lines. A PR with more is **unreviewable**; the skill halts with a clear message: "PR > 2000 lines; split the work into multiple WPs."

### Step 10: Post the review comment

The skill posts a structured comment on the PR (using the foundational `code-review` 7-block format):

```
1. Standing DNA gates:
   - typecheck: 0 errors
   - any-gate: 0 hits
   - color-gate: 0 hits
   - factory-check: 0 hits
   - import-check: 0 hits
   - type-drift:check OK

2. Pillar scores (max 12):
   - P1 Schema-First: 2
   - P2 Factory Pattern: 2
   - P3 Modularization: 2
   - P4 Premium UI: 2
   - P5 Docs as Architecture: 1.5 (CHANGELOG not updated)
   - P6 Type Safety: 2
   Total: 11.5/12 · Score: 9.6/10

3. PR-specific concerns:
   - Closes C5 (model ID boot-ping): VERIFIED (chain fallback implemented)
   - Test results: VERIFIED (8 tests pass)

4. Diff stat: 5 files, +234, -12 — OK

5. Audit IDs (blockers):
   - none

6. P-violations (deductions):
   - P5-DOCS-1: CHANGELOG.md not updated; add a line under "Unreleased" for this PR

7. Verdict: APPROVE (0 blockers; score 9.6/10)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

The skill uses the GitHub MCP's `create_issue_comment` (PRs are issues in the GitHub data model).

### Step 11: Submit the review decision

The skill submits a review with the appropriate state:

- **0 blockers + score ≥ 8.5** → `APPROVE`
- **0 blockers + score 7.0-8.4** → `COMMENT` (approve with notes)
- **1+ blocker** → `REQUEST_CHANGES`

```
github.create_pull_request_review({
  pull_number: <args.pr_number>,
  event: "APPROVE" | "COMMENT" | "REQUEST_CHANGES",
  body: "<the review comment from Step 10>",
})
```

The PR is now formally reviewed.

### Step 12: Notify the user

Send the user a chat message:

```
[REVIEW COMPLETE] PR #<N>: <title>
- Verdict: <APPROVE | COMMENT | REQUEST_CHANGES>
- Score: <X>/10
- Blockers: <count>
- Audit IDs: <list>
- PR URL: <url>
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "pr_number": 142,
    "verdict": "APPROVE" | "COMMENT" | "REQUEST_CHANGES",
    "score": 9.6,
    "pillar_scores": { "P1": 2, "P2": 2, ... },
    "blockers": [],
    "audit_ids": ["P5-DOCS-1"],
    "review_url": "..."
  }
}
```

The dashboard renders the result; the chat shows the summary.

## Error Handling

- **The PR is a draft** — halt; the user marks it ready first
- **The diff is too large** — halt; the user splits the PR
- **The lint gates fail on the base** — halt; the base is broken; the PR can't be reviewed
- **The user is not a reviewer** — halt; the user can't post a review
- **The PR's branch is force-pushed after checkout** — the diff is stale; the skill re-fetches
- **The GitHub API rate-limits** — wait 60s; retry once; if still failing, halt

## Quality Checks

Before declaring the review complete:

- [ ] The PR is checkable (not draft, not merged, not closed)
- [ ] The diff is fetched and parsed
- [ ] All 6 lint gates ran
- [ ] All 6 Pillars scored
- [ ] Audit IDs listed
- [ ] PR-specific concerns verified
- [ ] Review comment posted in 7-block format
- [ ] Review decision submitted (APPROVE / COMMENT / REQUEST_CHANGES)
- [ ] User notified

A review that doesn't pass all 9 is itself a P5 violation (the review is a doc).
