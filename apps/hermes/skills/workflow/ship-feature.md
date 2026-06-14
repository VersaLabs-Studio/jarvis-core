---
name: ship-feature
description: Plan, implement, test, and ship a feature end-to-end. Creates a feature branch, writes the code with tests, opens a PR, deploys a Vercel preview, updates Notion, and notifies the user. The flagship user-facing skill.
trigger:
  - "ship feature"
  - "build and deploy"
  - "ship this"
  - "build and ship"
tools_required: ["github", "vercel", "notion"]
category: swe
estimated_time: "30-60 minutes"
always_loaded: false
preferred_model_role: coding
---

# Ship Feature

## Purpose

End-to-end feature shipping. The user says "ship feature X" (or "build and deploy X"); the skill plans, implements, tests, opens a PR, deploys a Vercel preview, updates Notion with the deliverable, and notifies the user. This is the flagship user-facing workflow skill — it composes the foundational skills (`plan-feature`, `execute-implementation`, `debug-and-fix`, `code-review`) and the workflow skills (`github-pr-workflow`, `deploy-to-vercel`, `notion-update`) into a single autonomous flow.

The skill is **NOT** a single function call to a sub-agent. The LLM drives the agentic loop, dispatching to MCP tools (`github`, `vercel`, `notion`) and the `code_exec` tool (for tests + verification) as needed.

## Prerequisites

- A clean working tree on a base branch (default: `develop`)
- A Vercel project linked to the repo (the Vercel MCP needs the project ID; `vercel_token` env var)
- A GitHub token with `repo` + `workflow` scopes (the GitHub MCP needs it)
- A Notion integration with access to the team's "Ships" database
- The user's intent is clear: a one-sentence description of the feature
- The user has reviewed the plan before the implementation starts (or the skill is invoked with `args.auto_approve: true`)

## Steps

### Step 1: Plan the feature

Invoke the `plan-feature` skill with the user's intent. The plan doc lands at `docs/<feature-slug>-PLAN.md` and includes:

- **§1** — the feature spec (1 paragraph)
- **§2** — the WP map (typically 1-3 WPs: implement → test → ship)
- **§3** — the files affected (SQL migration? new entity? new route? new page?)
- **§4** — the acceptance criteria (testable assertions)
- **§5** — the rollback path (revert the merge; the named Vercel alias is removed)

The user reviews the plan; the executor halts here if `args.auto_approve !== true`.

### Step 2: Branch + initial commit

Create a feature branch off `develop`:

```bash
gh repo sync # ensure develop is up to date
git fetch origin
git checkout -b feat/<feature-slug> origin/develop
```

Commit an empty placeholder so the branch exists:

```bash
git commit --allow-empty -m "feat(<scope>): start <feature-slug> (ship-feature)"
git push origin feat/<feature-slug>
```

### Step 3: Implement (DNA P1-P6)

Follow `execute-implementation` for the implementation. The skill sequence:

- **Schema first** (P1) — if the feature needs a new entity: SQL migration → `supabase gen types` → Zod → registry → factory hook
- **API** (P2) — `registerCrud` line; the factory handles GET/POST/PATCH/DELETE
- **Hooks** — web + mobile, via the factory
- **UI** (P4) — columns, form, dialog, card, page; OKLCH tokens, Framer Motion, four data-view states
- **Types** (P6) — no `any`; Zod at every boundary; types from `@jarvis/shared`

Use the `code_exec` tool to run tests and verify the build:

```
code_exec({ code: "pnpm -r typecheck && pnpm -F @jarvis/<package> test", language: "bash" })
```

If any test fails, invoke the `debug-and-fix` skill. Loop until green.

### Step 4: Open the PR

Invoke `github-pr-workflow` (or call the github MCP directly):

```
github.create_pull_request({
  title: "<conventional commit subject>",
  body: "<PR body citing the plan doc + WP id + audit IDs closed>",
  head: "feat/<feature-slug>",
  base: "develop",
  draft: false,
})
```

The PR body follows the format from `execute-implementation` §6. The diff must be < 2000 lines; if larger, split into multiple PRs.

### Step 5: Wait for CI + Vercel preview

Poll the GitHub Actions run + the Vercel deployment:

```
github.list_workflow_runs({ branch: "feat/<feature-slug>" })
```

The CI must be green; the Vercel preview URL must be live. If either fails, invoke `debug-and-fix` and iterate.

### Step 6: Request review

Add the team as reviewers:

```
github.request_reviews({ pull_number: N, reviewers: ["<user1>", "<user2>"] })
```

Wait for at least one approval. While waiting, move to Step 7 (Notion update).

### Step 7: Update Notion (concurrent with Step 6)

Invoke `notion-update` to create a "Ship" page in the team's Ships database:

```
notion.create_page({
  database_id: "<SHIPS_DB_ID>",
  properties: {
    title: "Shipped: <feature name>",
    status: "In Review",
    github_pr: "<PR URL>",
    vercel_preview: "<preview URL>",
    plan_doc: "<plan doc path>",
  },
})
```

The Notion page becomes the canonical record of the ship. The user gets a link to it.

### Step 8: Notify the user

Once the PR is approved AND the Vercel preview is live AND the Notion page is created, send the user a summary:

```
[SHIP COMPLETE] <feature name>
- PR: <PR URL>
- Vercel preview: <preview URL>
- Notion: <Notion page URL>
- Plan: <plan doc path>
- Audit IDs closed: <list>
```

The notification is sent via:
- The API WS (the dashboard renders a toast)
- The chat surface (the LLM's final response)
- An optional Telegram message (via the Telegram MCP, if `notify.telegram: true`)

## Output

The skill ends with a structured summary in the chat (and the WS broadcast):

```json
{
  "type": "skill:result",
  "output": {
    "feature": "...",
    "pr_url": "...",
    "vercel_preview": "...",
    "notion_page": "...",
    "audit_ids_closed": ["..."],
    "duration_ms": ...
  }
}
```

The dashboard renders the summary as a card; the chat shows it inline. The Notion page persists the record.

## Error Handling

- **CI fails** — invoke `debug-and-fix`; iterate until green; resume at Step 5.
- **Vercel preview fails** — check the Vercel logs via the `vercel` MCP; fix the build error; push a new commit; resume at Step 5.
- **Reviewer requests changes** — address the review; push a new commit; the review thread auto-updates; resume at Step 6.
- **Notion update fails** — log the error to `system_logs`; the user is still notified via chat (the Notion page is a "nice to have," not a blocker).
- **The plan is too big (>1 WP)** — invoke `plan-feature` again; the WP map is the new plan. The user reviews the WPs individually.
- **A step exceeds the per-iteration timeout (60s)** — split the step into smaller tool calls; the agentic loop retries.

## Quality Checks

Before declaring the ship complete:

- [ ] `pnpm -r typecheck` 0
- [ ] `pnpm -F <package> test` 0
- [ ] `pnpm any-gate` 0 (no `any` in the new code)
- [ ] `pnpm color-gate` 0 (no hardcoded colors)
- [ ] `pnpm factory-check` 0 (every CRUD through the factory)
- [ ] `pnpm import-check` 0 (no cross-feature imports)
- [ ] PR CI green
- [ ] Vercel preview URL returns 200
- [ ] At least 1 reviewer approval
- [ ] Notion page created
- [ ] User notified

A ship that doesn't pass all 11 is not shipped. The skill returns `skill:error` with the failed check; the chat shows the user what's left.
