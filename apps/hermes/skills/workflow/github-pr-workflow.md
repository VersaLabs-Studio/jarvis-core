---
name: github-pr-workflow
description: Open a GitHub PR — branch, commit, push, PR with description, request reviews. The standard PR-creation flow; composed by ship-feature, debug-and-fix, and other workflow skills.
trigger:
  - "create PR for"
  - "open a PR for"
  - "PR this"
  - "ship this as a PR"
tools_required: ["github"]
category: swe
estimated_time: "2-5 minutes"
always_loaded: false
preferred_model_role: coding
---

# GitHub PR Workflow

## Purpose

The standard PR-creation flow: branch, commit, push, open a PR with a structured body, and request reviews. The skill is **composed** by `ship-feature` (for new features), `debug-and-fix` (for bug fixes), and other workflow skills that produce a code change. It can also be invoked directly when the user has already made the changes and just needs the PR opened.

The skill never **directly** pushes to `main` (per Part 5 §5.1 Phase E checklist: `"ship feature X" → branch + PR created — NEVER pushes to main directly`). The branch is always a `feat/*` or `fix/*`; the merge happens via the PR review flow.

## Prerequisites

- The user is on a feature branch with committed changes (the skill verifies the branch is not `main` or `develop`)
- The branch is up to date with `origin` (the skill pulls if needed)
- The diff is < 2000 lines (a 2000+ line PR is unreviewable; the skill refuses and asks the user to split)
- A GitHub token with `repo` + `workflow` scopes
- The PR title follows Conventional Commits (`<type>(<scope>): <subject>`)
- The user has provided the PR body (or the skill infers it from the commits)

## Steps

### Step 1: Verify the branch

The skill refuses if the current branch is `main` or `develop`. The error message is clear: "PRs are opened from feature branches; switch to a `feat/*` or `fix/*` branch first."

```bash
git rev-parse --abbrev-ref HEAD
```

If the branch is `feat/*` or `fix/*`, continue. Otherwise halt with a clear error.

### Step 2: Check the diff size

```bash
git diff --stat origin/main..HEAD | tail -1
```

The total lines changed must be < 2000. If the diff is too large, the skill halts with a clear error: "PRs > 2000 lines are unreviewable; split the work into multiple WPs."

### Step 3: Pull the latest from the base

```bash
git fetch origin
git rebase origin/<base-branch>
```

The base branch is the PR's target (default: `develop`). If the rebase has conflicts, the skill halts; the user resolves the conflicts.

### Step 4: Push the branch

```bash
git push origin <branch>
```

The push may trigger a pre-push hook (linters, formatters, secrets scanners). If the hook fails, the skill halts with the hook output.

### Step 5: Construct the PR body

The PR body follows a structured format (mirrors the code-review.md and execute-implementation.md templates):

```markdown
## What
<1-paragraph summary of the change>

## Why
<1-paragraph context: the user story, the bug, the architectural decision>

## How
<1-3 paragraphs of the technical approach; the files affected>

## Tests
<list of new/modified test files; what each covers>

## Audit IDs
<list of C-/H-/P- audit IDs closed by this PR (if any)>

## Risk
<1-paragraph: what could go wrong, what's the rollback path>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

The skill auto-fills the body from:
- The branch name (e.g. `feat/invoice-generation` → "Add invoice generation")
- The commits on the branch (`git log origin/main..HEAD`)
- The files changed (`git diff --stat origin/main..HEAD`)
- The diff itself (read each file; extract the change description)

For the audit IDs, the skill looks at the commit messages + the PR description in the body. If the user provided a custom body, the skill merges it with the auto-filled sections.

### Step 6: Open the PR

```
github.create_pull_request({
  title: "<type>(<scope>): <subject>",
  body: "<PR body from Step 5>",
  head: "<branch>",
  base: "<base-branch>",
  draft: false,
})
```

For WIPs or early reviews, the user can pass `args.draft = true`; the skill creates a **draft** PR that can't be merged until marked ready.

### Step 7: Request reviews

```
github.request_reviews({
  pull_number: <pr_number>,
  reviewers: ["<user1>", "<user2>"],
  team_reviewers: ["<team1>"],
})
```

The reviewers come from `args.reviewers` (explicit list) or from `CODEOWNERS` (the repo's auto-assign). If `args.reviewers` is empty and there's no `CODEOWNERS`, the skill posts a comment asking the user to assign reviewers manually.

### Step 8: Add labels

```
github.add_labels({
  issue_number: <pr_number>,
  labels: ["<label1>", "<label2>"],
})
```

Common labels: `enhancement`, `bug`, `documentation`, `breaking-change`, `phase-e`. The skill picks labels based on the branch prefix (`feat/` → `enhancement`; `fix/` → `bug`).

### Step 9: Link related issues

If the PR body contains `Closes #N` or `Fixes #N`, the GitHub API auto-links them. The skill verifies the link is in the body; if missing, the skill adds a comment:

```
github.create_issue_comment({
  issue_number: <N>,
  body: "Working on this in #<PR_NUMBER>.",
})
```

### Step 10: Notify the user

Send the user a chat message:

```
[PR OPENED] <PR title>
- PR: <PR URL>
- Branch: <branch>
- Base: <base-branch>
- Reviewers: <list>
- Labels: <list>
- Diff: <N files changed, M insertions, K deletions>
```

The notification includes the PR URL; the user clicks to review.

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "pr_url": "...",
    "pr_number": 142,
    "branch": "feat/invoice-generation",
    "base": "develop",
    "reviewers": [...],
    "labels": [...],
    "diff": { "files": 5, "insertions": 234, "deletions": 12 }
  }
}
```

The dashboard renders the PR card; the chat shows the summary.

## Error Handling

- **Branch is `main` or `develop`** — halt with a clear error
- **Diff > 2000 lines** — halt; ask the user to split
- **Rebase conflicts** — halt; the user resolves the conflicts
- **Pre-push hook fails** — halt with the hook output
- **PR title doesn't follow Conventional Commits** — the skill auto-prefixes the title (`feat:`, `fix:`, etc.) based on the branch name; if it can't infer, halt and ask
- **GitHub API rate-limit (403)** — wait 60s; retry once; if still failing, halt
- **`CODEOWNERS` requires a review the user can't provide** — the skill halts; the user picks a different reviewer
- **The PR body is empty** — the skill uses a generic body ("Auto-generated; reviewer please fill in"); the user edits before requesting reviews

## Quality Checks

Before declaring the PR opened:

- [ ] Branch is `feat/*` or `fix/*` (not `main` / `develop`)
- [ ] Diff < 2000 lines
- [ ] Rebase is clean
- [ ] Push succeeded
- [ ] PR title follows Conventional Commits
- [ ] PR body has all 5 sections (What, Why, How, Tests, Audit IDs)
- [ ] Reviewers assigned
- [ ] Labels applied
- [ ] Related issues linked (auto via `Closes #N` or manual comment)
- [ ] User notified

A PR that doesn't pass all 10 is a degraded PR. The skill returns `skill:result` with `degraded: true` and a `note` field.
