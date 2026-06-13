---
name: code-review
description: PR review producing a DNA-compliant report — the 7-block format. Walk the diff, score the pillars, list the audit IDs, approve or request changes. The reviewer is the merge gate; 0 blockers = pass.
trigger:
  - "review this code"
  - "review PR #"
  - "check PR #"
  - "code review"
tools_required: ["github"]
category: foundational
estimated_time: "5-15 minutes"
always_loaded: false
preferred_model_role: audit
---

# Code Review

## Purpose

Encode the discipline of **PR review**. The reviewer (the `code-review` sub-agent) walks the diff, scores the Six Pillars, lists the audit IDs (C-/H-/P-) for every gap, and produces a **DNA-compliant report**. The reviewer's pass is the **merge gate**; 0 blockers = pass; any blocker = request changes. The reviewer is the verifier; the reviewer is **not** the engineer.

The review is fast (5-15 minutes for a typical WP), specific (every claim cites a file:line or lint-gate output), and reproducible (a second review yields the same verdict). The review is **not** a vibe check ("the code feels off") and **not** a style nit ("add a trailing newline"). The review is a pillar walk with concrete evidence.

## Prerequisites

- The PR opened with the WP body (citing the plan doc, the WP id, the audit IDs closed)
- The diff against the base branch (the `Files changed` tab in GitHub)
- The standing DNA gates runnable on the PR's branch
- The relevant skills loaded: `architectural-dna`, `schema-first`, `frontend-craft`, `premium-ui`, `audit-compliance`

## Steps

### Step 1: Run the standing DNA gates on the PR's branch

```bash
gh pr checkout <pr-number>
pnpm -r typecheck
pnpm any-gate
pnpm color-gate
pnpm factory-check
pnpm import-check
pnpm type-drift:check
```

A hit on any is an **automatic blocker**. The reviewer captures the output verbatim in the report.

### Step 2: Read the diff

The reviewer reads the diff top-to-bottom (or by file group, if the PR is large). For each file:

- **What does this file do?** — one-sentence summary
- **Does it follow the Pillar pattern?** — the 6 Pillar checks below
- **Are there any new P-violations?** — capture with file:line

The reviewer also reads the **test files** (if any). A PR without tests is a P2 violation unless the WP is docs-only or config-only.

### Step 3: Score the Six Pillars (P1-P6)

Same rubric as the `audit-compliance` skill. The reviewer:

- Walks P1 (schema-first): is the migration → types → Zod → registry → factory chain followed?
- Walks P2 (factory pattern): is the CRUD through the factory, or is there a bespoke wrapper?
- Walks P3 (modularization): are the new files in the right feature dir? Any cross-feature imports?
- Walks P4 (premium UI): if there's UI, are the OKLCH tokens used? Is the Framer Motion stagger in? Are the four data-view states reachable?
- Walks P5 (docs as architecture): is the plan doc cited? Are the docs updated to match the code? Is the CHANGELOG updated?
- Walks P6 (type safety): is there any `any`? Is Zod at the boundary? Are the types from `@jarvis/shared`?

For each Pillar, the reviewer scores 0-2 (with 0.5 increments). The max is 12; convert to /10 with `Score = (Total / 12) * 10`.

### Step 4: Check the PR's specific concerns

A good PR body lists the WP's specific concerns — the audit IDs closed, the deviations from the plan, the test results. The reviewer checks each:

- **Audit IDs closed** — is the fix actually in the diff? grep the audit ID in the diff.
- **Deviations from the plan** — are the deviations reasonable? documented? tested?
- **Test results** — are the tests in the diff? do they pass?

A PR body that lies (claims an audit ID is closed but the fix isn't in the diff) is a **P5 violation** (docs are the architecture; the PR body IS the architecture for this WP). The reviewer blocks.

### Step 5: Check the diff stat sanity

```bash
gh pr diff <pr-number> --stat
```

A WP's diff should be < 2000 lines changed. A PR with more is:

- **Probably too big** — split into multiple WPs
- **Probably undertested** — a 2000-line diff with < 5 test files is suspect
- **Probably unreviewable** — the reviewer can't read 2000 lines in 15 minutes

The reviewer requests the engineer split the PR. **No exception**: an unreviewable PR is a blocker.

### Step 6: List the audit IDs

For every violation (lint-gate hit or Pillar deduction), the reviewer opens an **audit ID**:

- **C-*** (Correctness) — the code does the wrong thing (e.g. wrong model ID, wrong route path)
- **H-*** (Hardening / Security) — the code is correct but unsafe (e.g. secrets in env, raw socket mount)
- **P-*** (Pillar) — the code violates a Pillar (e.g. `any` for P6, hardcoded color for P4)

Each audit ID is **specific** — a file:line, a lint-gate output, or a screenshot. The engineer fixes the audit ID; the reviewer re-reviews.

### Step 7: Approve or request changes

The reviewer writes the report in the **7-block format** (see Output), then:

- **0 blockers + score ≥ 8.5** → **Approve** the PR
- **0 blockers + score 7.0-8.4** → **Comment** (approve with notes; the carryover ledger tracks the deductions)
- **1+ blocker** → **Request changes** (the engineer fixes in the same PR; no new branch)

The reviewer's decision is **final** for the PR. The engineer can escalate to the orchestrator if the reviewer is wrong; the orchestrator routes the escalation to the architect.

## Output

A code review is a PR comment in the **7-block format**:

```
Code Review — <PR title>
========================

1. **Standing DNA gates** (0 hits = pass):
   - typecheck:       <PASS | <N errors>>
   - any-gate:        <PASS | <N hits>>
   - color-gate:      <PASS | <N hits>>
   - factory-check:   <PASS | <N hits>>
   - import-check:    <PASS | <N hits>>
   - type-drift:check <PASS | DRIFT>

2. **Pillar scores** (max 12; convert to /10):
   - P1 Schema-First:        /2  <1-line comment>
   - P2 Factory Pattern:     /2  <1-line comment>
   - P3 Modularization:      /2  <1-line comment>
   - P4 Premium UI:          /2  <1-line comment>
   - P5 Docs as Architecture: /2  <1-line comment>
   - P6 Type Safety:         /2  <1-line comment>
   Total: /12  ·  Score: /10

3. **PR-specific concerns** (audit IDs closed, deviations, test results):
   - <WP id closed>: <PASS | FAIL with file:line>
   - <deviation>: <reasonable | not reasonable, with rationale>
   - <test results>: <PASS | FAIL with file:line>

4. **Diff stat sanity**: <N files changed, M insertions, K deletions> — <OK | too big, split>

5. **Audit IDs** (blockers, if any):
   - <ID>: <file:line or lint-gate output> — <fix>

6. **P-violations** (deductions, tracked in carryover):
   - <ID>: <file:line or lint-gate output> — <fix>

7. **Verdict**: <APPROVE | COMMENT | REQUEST CHANGES>
   - If REQUEST CHANGES: <N> blocker(s) above; the engineer fixes in this PR.
   - If COMMENT: <N> note(s); the engineer may fix in this PR or follow up.
   - If APPROVE: 0 blockers; the PR is ready to merge.
```

The reviewer also leaves inline comments on the diff for the engineer to address (or to ignore if the reviewer approves with notes).

## Error Handling

- **The diff is too large to read in 15 minutes** — the reviewer requests a split. **No exception**: an unreviewable PR is a blocker.
- **A lint gate fails for an unrelated reason** (e.g. a broken base) — the reviewer comments "lint gates not runnable on the base" and requests the base be fixed. The review is paused; the engineer re-opens after the base fix.
- **The PR body lies** (claims an audit ID is closed but the fix isn't in the diff) — the reviewer blocks. The PR body is the architecture; lying about it is a P5 violation.
- **The reviewer disagrees with the plan** — the reviewer doesn't re-litigate the plan. The plan was approved by the architect. The reviewer's job is to verify the implementation matches the plan, not to second-guess the plan.
- **The engineer pushes back on a blocker** — the engineer re-argues with file:line evidence. If the disagreement persists, escalate to the orchestrator with both arguments side by side. The orchestrator routes to the architect.
- **The same review keeps going back and forth** (3+ cycles) — the reviewer and engineer are stuck. Escalate to the orchestrator; the orchestrator dispatches a fresh reviewer or routes to the architect for a tie-breaker.

## Quality Checks

The reviewer's own output is audited:

- **Every claim cites a file:line or a lint-gate output** — no "feels off" or "could be better"
- **The Pillar scores are reproducible** — a second reviewer yields the same scores
- **The 7-block format is followed** — no "see inline comments" without the summary
- **The verdict matches the math** — 0 blockers + score ≥ 8.5 = APPROVE; 1+ blocker = REQUEST CHANGES

A code review that doesn't pass these is itself a P5 violation (docs as architecture: the review is a doc).
