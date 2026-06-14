---
name: execute-implementation
description: Code generation under DNA P1-P6 — the agentic workflow. Read the plan, follow the WP map, produce one WP at a time, run the standing DNA gates at the end of each WP, route to Code Review before merging.
trigger:
  - "implement this"
  - "build this"
  - "code this up"
  - "execute the plan"
tools_required: []
category: foundational
estimated_time: "30-180 minutes"
always_loaded: false
preferred_model_role: coding
---

# Execute Implementation

## Purpose

Encode the discipline of **executing a plan doc faithfully**. The planner resolved the architectural decisions; the executor's job is to translate them into working code. The executor never re-decides architecture; the executor never improvises. If a WP is unclear, the executor halts and re-routes to the planner, not improvises. The standing DNA gates (`pnpm any-gate`, `pnpm color-gate`, etc.) run at the end of every WP; a failed gate is a WP not done.

The executor operates **sequentially** on a single branch by default. The plan may specify parallel WPs (e.g. E1 ∥ E2 ∥ E3); the executor dispatches sub-agents via the Task tool, with file-set isolation to prevent conflicts. The merge is per-WP, the gate is per-phase.

## Prerequisites

- The approved plan doc (`docs/PHASE-<X>-PLAN.md` with the §11 approval block signed)
- The base branch checked out and up to date (`git fetch origin && git checkout <branch>`)
- The sub-agent role: `execute` (primary full-stack builder), `debug` (root-cause fixes), `ui-specialist` (premium UI components), `documentation-writer` (master docs)
- The relevant skills loaded: `schema-first`, `frontend-craft`, `premium-ui`, `architectural-dna`, `disciplined-engineering`
- A clean working tree (no uncommitted changes)

## Steps

### Step 1: Read the plan doc end-to-end (always)

The executor MUST read the entire plan doc before writing any code. The plan's structure:

- **§1–§3** — inconsistencies + Tech Lead consult resolutions (the "why" of every decision)
- **§4** — WP map (the order, the dependencies)
- **§5** — file tree + wire contract (the "what")
- **§6** — acceptance criteria (the "done" signal)
- **§8** — risks (the "what could go wrong")
- **§9** — open questions (the "still pending")
- **§10** — DoD (the "checklist per WP")
- **§11** — approval block (the "go signal")

Skipping any section is a recipe for drift. The plan is not a sketch; it is the contract.

### Step 2: Set up the WP branch and verify the base

```bash
git fetch origin
git checkout <base-branch>     # usually `phase/<x>` or `develop`
git pull --ff-only origin <base-branch>
git checkout -b feat/<wp-id>   # per-WP branch (unless plan says "one large unit")
```

Verify the standing DNA gates are green on the base:

```bash
pnpm -r typecheck
pnpm any-gate
pnpm color-gate
pnpm factory-check
pnpm import-check
pnpm type-drift:check
```

If any gate fails on the base, the executor halts and reports — the WP can't start on a broken base.

### Step 3: Implement the WP in the implementation order

The plan's §5.1 (file tree) defines the order. Generally:

1. **Schema first** (P1) — SQL migration, then `supabase gen types`, then Zod schema, then registry entry, then register-entities line
2. **API factory** (P2) — `registerCrud` line, factory keys in `@jarvis/shared`
3. **Sandbox / cross-cutting infrastructure** — the things that downstream WPs depend on
4. **Routes / endpoints** — using the factory
5. **Hooks** — web + mobile, using the factory
6. **UI components** — columns, form, dialog, card
7. **Pages** — list, detail

The order is non-negotiable. Reversing any step is a P1 or P2 violation.

For each file:

- **Types come from `@jarvis/shared`** — never hand-written.
- **No `any` in production paths** — use `unknown` + type guards at the boundary.
- **Zod at every runtime boundary** — every API request body, every MCP tool arg, every cron job spec.
- **No hardcoded colors** — OKLCH tokens only.
- **No cross-feature imports** — keep features isolated.

### Step 4: Test at the WP boundary

Before declaring a WP done:

1. **Run the WP's own tests** (if the plan specifies them). E.g. for the §3 prelude: `pnpm -F @jarvis/hermes test`.
2. **Run the lint gates**: `pnpm -r typecheck`, `pnpm any-gate`, `pnpm color-gate`, `pnpm factory-check`, `pnpm import-check`, `pnpm type-drift:check`.
3. **Manual smoke** — if the WP adds a route, hit it with `curl`; if it adds a UI surface, take a screenshot in light + dark mode.

A WP that doesn't pass all three is a WP not done. The executor commits only after the gates are green.

### Step 5: Commit with the right message + trailer

```bash
git add <files>
git commit -m "<type>(<scope>): <subject>

<body that cites the WP id, the Part/section, and any audit IDs closed>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

The `<type>` is `feat` / `fix` / `refactor` / `docs` / `test` / `chore` (Conventional Commits). The `<scope>` is the affected package (`hermes`, `shared`, `mobile`, `web`, `api`, `docs`). The body cites the WP id (e.g. "E0 — Hermes runtime") and the Part/section (e.g. "Part 4 §4.4").

The `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer is **mandatory** for all AI-authored commits (per the git-flow skill).

### Step 6: Route to Code Review

After the WP commits:

1. Push the branch: `git push origin feat/<wp-id>`
2. Open a PR (or the orchestrator does). The PR body cites the plan doc, the WP id, the Part/section, the audit IDs closed, and any deviations from the plan.
3. The orchestrator dispatches the `code-review` sub-agent. The reviewer's pass is a **merge gate**; 0 blockers = pass.
4. If the reviewer flags a blocker, the executor fixes in the same PR (no new branch); the reviewer re-reviews.

### Step 7: After the WP merges, prepare for the next

The executor does not start the next WP until the current one is merged (or until the orchestrator routes a phase-gate integration). For a phase completion, all WPs land on a single branch per the plan's large-unit directive; the gate runs once on the integrated branch.

## Output

A WP lands as N commits on a feature branch + 1 PR. The PR body is the audit trail:

```
**WP:** <id> · **Implements:** Part<N> §<x> · **Closes:** <audit IDs>

<1-paragraph summary>

<file list (the diff stat)>

<deviations from the plan, if any>

<test results>
```

The orchestrator reads the PR body to decide the merge.

## Error Handling

- **The plan is unclear on a specific file or wire shape** — halt and re-route to the planner. Do not improvise. The plan is the contract.
- **A DNA gate fails mid-WP** — fix in place; do not commit a broken state. If the fix is non-trivial (>30 minutes), re-route to the planner.
- **The WP requires a dependency that's not in the plan** — halt and report. Adding unstated dependencies is scope creep.
- **The PR is too large (>2000 lines changed)** — split into multiple WPs or sub-PRs. A 2000-line PR is unreviewable.
- **The reviewer flags a blocker** — fix in the same PR. Do not push back unless the reviewer is wrong; if the reviewer is wrong, escalate to the orchestrator.
- **A standing DNA gate is broken on the base** — halt the WP, route to the debugger sub-agent for a base-fix WP. Do not paper over a broken base.

## Quality Checks

Before opening the PR, run:

```bash
# 1. The WP's own tests
pnpm -F <package> test

# 2. The standing DNA gates
pnpm -r typecheck
pnpm any-gate
pnpm color-gate
pnpm factory-check
pnpm import-check
pnpm type-drift:check

# 3. The PR's diff stat is sane
git diff --stat <base>..HEAD | tail -1
# Should be < 2000 lines changed for a single WP
```

A WP that doesn't pass all three is not done. The PR is not opened; the orchestrator is not notified.
