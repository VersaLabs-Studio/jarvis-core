---
name: project-onboard
description: Onboard a new project end-to-end — create the GitHub repo, set up CI, create the Notion workspace, link Vercel, write the README, notify the team. Used for "onboard new project X" or "set up a new project".
trigger:
  - "onboard new project"
  - "set up new project"
  - "create new project"
  - "scaffold project"
tools_required: ["github", "vercel", "notion"]
category: devops
estimated_time: "30-60 minutes"
always_loaded: false
preferred_model_role: coding
---

# Project Onboard

## Purpose

Onboard a new project end-to-end. The skill creates the GitHub repo, sets up CI (GitHub Actions), creates the Notion workspace, links Vercel (if applicable), writes the README, and notifies the team. Used for "onboard new project X" or "set up a new project". The skill is **autonomous for standard scaffolding** (web/mobile/API) and **HALTS for unusual stacks** (embedded, ML, infra) — those need a human-composed template.

The skill composes the foundational `plan-feature` (the project plan is the first doc) + `github-pr-workflow` (the initial commit) + `notion-update` (the project workspace) into a single flow.

## Prerequisites

- A project name (`args.name` is the project name; e.g. "jarvis-core" or "client-acme")
- A repo owner / org (`args.owner`; e.g. "VersaLabs-Studio" or "acme-co")
- A project description (`args.description`; 1 paragraph)
- A stack (`args.stack`; one of: "nextjs", "expo", "fastify", "node", "python")
- The team has access to the GitHub org, the Notion workspace, and the Vercel team

## Steps

### Step 1: Create the GitHub repo

The skill calls the GitHub MCP:

```
github.create_repository({
  name: "<args.name>",
  description: "<args.description>",
  private: true,  // default; public is opt-in
  has_issues: true,
  has_projects: true,
  has_wiki: false,  // we use Notion for docs
  auto_init: false,  // we'll push an initial commit
})
```

The response is the repo URL and the default branch (`main` or `master` — JARVIS uses `main`).

### Step 2: Clone + create the initial structure

The skill clones the repo locally and scaffolds the structure based on the stack:

**For `nextjs`:**
```
.
├── apps/
│   ├── web/                    # Next.js app
│   │   ├── src/
│   │   │   ├── app/            # App Router
│   │   │   ├── components/
│   │   │   └── lib/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── next.config.js
│   └── api/                    # Fastify API
│       ├── src/
│       │   ├── routes/
│       │   ├── lib/
│       │   └── server.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── shared/                 # Shared types + Zod schemas
│       ├── src/
│       │   ├── types/
│       │   └── schemas/
│       └── package.json
├── supabase/
│   └── migrations/
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   └── CHANGELOG.md
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + typecheck + test
│       ├── deploy-vercel.yml   # Vercel auto-deploy
│       └── codeql.yml          # Security scanning
├── package.json                # Workspace root
├── pnpm-workspace.yaml
├── tsconfig.json               # Base TS config
├── .gitignore
├── .env.example
└── README.md                   # Project root
```

**For `expo`:**
Similar structure but with `apps/mobile/` instead of `apps/web/`.

**For `fastify`:**
Single `apps/api/` with the full structure inline (no `apps/web/`).

The scaffold is **the JARVIS golden template** (the same one used for JARVIS itself). The skill copies the structure from `apps/`, `packages/`, `docs/`, `.github/` in the JARVIS repo.

### Step 3: Write the README

The skill composes a README at the repo root:

```markdown
# <Project Name>

<one-paragraph description>

## Stack
<bulleted list: framework, language, database, hosting, etc.>

## Local Development
<1-2 paragraphs: how to clone, install, run>

## Architecture
<1-2 paragraphs: the system design, the major components>

## Contributing
<1 paragraph: how to submit a PR, the review process>

## License
<one line: the project's license>
```

The README is committed in the initial commit.

### Step 4: Set up CI

The skill creates `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r typecheck
      - run: ppm -r test
      - run: pnpm any-gate
      - run: pnpm color-gate
      - run: pnpm factory-check
      - run: pnpm import-check
```

The CI runs the standing DNA gates on every push and PR. A red gate blocks the merge.

### Step 5: Create the Notion workspace

The skill creates the Notion project page in the team's "Projects" database:

```
notion.create_page({
  database_id: "<PROJECTS_DB_ID>",
  properties: {
    title: "<Project Name>",
    description: "<args.description>",
    status: "Setup",
    owner: "<args.owner>",
    stack: "<args.stack>",
    github_repo: "<repo URL>",
  },
  children: [
    // Top-level project structure: Goals, Tasks, Meetings, Decisions, etc.
    // Each is a sub-page or a sub-database
  ],
})
```

The skill then creates the sub-databases:

- **Goals** — what the project is trying to achieve
- **Tasks** — the work items
- **Meetings** — meeting notes
- **Decisions** — Architecture Decision Records (ADRs)
- **Shipped** — the things that have been delivered

The Notion workspace becomes the project's source of truth for non-code artifacts.

### Step 6: Link Vercel (for web projects)

If `args.stack === "nextjs"` or `args.stack === "expo"` with web, the skill links Vercel:

```
vercel.create_project({
  name: "<args.name>",
  git_repository: { type: "github", repo: "<owner>/<name>" },
  framework: "nextjs",
})
```

The Vercel project is created; the GitHub integration auto-deploys on push to `main` (production) and on PR (preview).

### Step 7: Initial commit + push

The skill commits the scaffold + README + CI:

```bash
cd <project-dir>
git add .
git commit -m "feat(<scope>): initial scaffold + README + CI

Generated by skill:project-onboard.

Stack: <args.stack>
Description: <args.description>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

The initial commit is on `main` directly (no PR; this is the bootstrap). Subsequent commits go through the PR flow.

### Step 8: Add team members

The skill adds the team as collaborators:

```
github.add_collaborators({
  repo: "<owner>/<name>",
  usernames: ["<user1>", "<user2>"],
  permission: "write",  // or "admin" for the lead
})
```

The team gets email notifications and access to the repo.

### Step 9: Notify the team

The skill sends a chat message to the team channel:

```
[NEW PROJECT] <Project Name>
- Repo: <github URL>
- Notion: <notion URL>
- Vercel: <vercel URL> (if applicable)
- Stack: <args.stack>
- Description: <args.description>
- Team: <list of collaborators>
```

The notification includes all the URLs; the team can click through to each.

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "repo_url": "...",
    "notion_url": "...",
    "vercel_url": "..." | null,
    "stack": "...",
    "collaborators": [...],
    "duration_ms": 12345
  }
}
```

The dashboard renders the new project card; the chat shows the summary.

## Error Handling

- **Repo name conflicts** — the skill suggests alternatives; the user picks
- **The Notion workspace doesn't exist** — the skill creates the parent page first
- **Vercel team is missing** — the user adds the team; the skill halts
- **CI fails on the initial commit** — the scaffold has a bug; the skill halts and the user reviews
- **The stack is unusual (e.g. embedded, ML)** — the skill halts; the user scaffolds manually
- **The user lacks admin permission on the GitHub org** — the user grants admin first; the skill halts

## Quality Checks

Before declaring the project onboarded:

- [ ] GitHub repo created with the right settings
- [ ] Initial structure scaffolds the JARVIS golden template
- [ ] README is informative (not "TODO: write README")
- [ ] CI runs the standing DNA gates (typecheck, any-gate, color-gate, factory-check, import-check)
- [ ] Notion workspace has all 5 sub-databases (Goals, Tasks, Meetings, Decisions, Shipped)
- [ ] Vercel is linked (for web projects)
- [ ] Initial commit is on `main`
- [ ] Team added as collaborators
- [ ] Team notified

A project onboard that doesn't pass all 9 is a degraded onboard. The skill returns `skill:result` with `degraded: true` and a `note` field.
