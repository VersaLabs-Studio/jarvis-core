---
name: deploy-to-vercel
description: Deploy a project to Vercel — pull the latest from a branch, build, deploy via the Vercel MCP, verify the URL returns 200, report the status. The standard previews + production deploys.
trigger:
  - "deploy to vercel"
  - "deploy this to vercel"
  - "vercel deploy"
  - "ship to vercel"
tools_required: ["vercel"]
category: devops
estimated_time: "5-10 minutes"
always_loaded: false
preferred_model_role: fast
---

# Deploy to Vercel

## Purpose

Deploy a Next.js (or any Vercel-supported framework) project to Vercel. Pulls the latest from a specified branch, triggers a build via the Vercel MCP, waits for the deployment to complete, verifies the URL returns 200, and reports the status. Used for both preview deploys (PRs) and production deploys (merges to `main`).

The Vercel MCP is **hosted** (`https://mcp.vercel.com` — OAuth). The `mcp-client.ts` (E3) makes a real HTTPS call to the Vercel API. The OAuth flow is set up at first use; the refresh token is stored in the Hermes env.

## Prerequisites

- A Vercel project linked to the repo (the Vercel MCP needs the project ID; `vercel_project_id` env var)
- A Vercel token with `deploy:write` scope (the Vercel MCP needs it; `vercel_token` env var)
- A branch with passing CI (the skill runs on the branch specified in `args.branch`)
- The user has confirmed the deploy target: `args.target = "preview" | "production"` (default: `preview`)

## Steps

### Step 1: Validate the target

The skill refuses to deploy to `production` unless `args.target === "production"` AND `args.confirmed === true`. The user is asked to confirm in chat if the target is `production` and the flag is missing.

### Step 2: Fetch the latest commit SHA

Call the GitHub MCP to get the head SHA of the branch:

```
github.get_branch({ branch: "feat/<feature-slug>" })
```

Capture the SHA; this is the immutable reference for the deploy.

### Step 3: Trigger the Vercel deploy

Call the Vercel MCP:

```
vercel.create_deployment({
  project_id: "<project_id>",
  target: "preview" | "production",
  git_source: {
    type: "github",
    repo: "<org>/<repo>",
    ref: "<branch>",
    sha: "<commit-sha>",
  },
})
```

The response includes a `deployment_id` and a `url` (the preview URL or the production alias).

### Step 4: Wait for the build

Poll the Vercel deployment status:

```
vercel.get_deployment({ deployment_id: "<id>" })
```

The status transitions: `BUILDING` → `READY` or `ERROR`. The skill polls every 5s; the timeout is 5 minutes (Vercel builds rarely exceed 3 minutes for Next.js).

If the build is in `ERROR` state, the skill fetches the build logs:

```
vercel.get_deployment_logs({ deployment_id: "<id>" })
```

The logs are returned to the user; the skill halts with `skill:error`.

### Step 5: Verify the URL

Once the build is `READY`, hit the URL:

```
fetch(<url>, { method: "GET" })
```

The status must be 200. A 404 or 500 means the build succeeded but the app is broken; the skill halts with `skill:error` and the user is asked to invoke `debug-and-fix`.

For preview deploys, the URL is `https://<project>-git-<branch>-<org>.vercel.app`. For production, it's the project's primary domain (e.g. `https://jarvis.versalabs.dev`).

### Step 6: Smoke test the deployed app

A real deploy needs more than a 200 on the root. The skill runs 3-5 critical-path checks:

- `GET <url>/api/health` → 200 (the API health endpoint)
- `GET <url>/v1/skills` → 200 (Hermes' skill list; the page that loads it renders)
- `GET <url>/api/cms/workflows?page=1` → 200 (the factory CRUD endpoint)

If any of these fails, the skill halts; the deploy is "live" but broken.

### Step 7: Record the deployment

The Vercel MCP returns a `deployment_id`. The skill records it in a `deployments` row via the API factory (per Phase E §5.4):

```
{
  project: "<project>",
  target: "preview" | "production",
  url: "<url>",
  vercel_deployment_id: "<id>",
  git_sha: "<commit-sha>",
  deployed_by: "skill:deploy-to-vercel",
  deployed_at: "2026-06-12T10:30:00Z",
  status: "ready"
}
```

The dashboard renders a deployment history; the operator can roll back via Vercel's UI (or a future `rollback-deploy` skill).

### Step 8: Notify the user

Send the user a chat message:

```
[DEPLOYED] <project> → <target>
- URL: <url>
- Vercel deployment: <vercel-deployment-url>
- Git SHA: <short-sha>
- Build time: <duration>
- Smoke tests: <passed/failed>
```

For production deploys, the notification is also sent to the team Telegram channel (per `args.notify.telegram`).

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "url": "...",
    "vercel_deployment_id": "...",
    "target": "preview" | "production",
    "git_sha": "...",
    "build_time_ms": 42000,
    "smoke_tests": { "/api/health": 200, "/v1/skills": 200, "/api/cms/workflows": 200 }
  }
}
```

The dashboard renders the URL as a clickable link; the chat shows the summary inline.

## Error Handling

- **Vercel API rate-limit (429)** — wait 60s; retry once; if still failing, halt
- **Build error** — fetch the build logs; append to the chat message; the user is asked to invoke `debug-and-fix` (the build error is usually a TypeScript or import error that the local `pnpm -r typecheck` should have caught)
- **Smoke test fails** — the deploy is live but broken; the user is asked to invoke `debug-and-fix` or roll back
- **Vercel OAuth token expired** — the user re-grants via the dashboard; the skill halts with a clear "Vercel auth expired" message
- **The branch has no passing CI** — halt; the user runs CI first
- **The deploy target is `production` and the branch is not `main`** — Vercel refuses; the skill explains: "production deploys require the `main` branch; use a preview for `feat/*` branches"

## Quality Checks

Before declaring the deploy complete:

- [ ] Build status is `READY` (not `BUILDING` or `ERROR`)
- [ ] URL returns 200 on the root
- [ ] `/api/health` returns 200
- [ ] `/v1/skills` returns 200
- [ ] `/api/cms/workflows?page=1` returns 200
- [ ] `deployments` row created in the API factory
- [ ] User notified

A deploy that doesn't pass all 7 is a degraded deploy. The skill returns `skill:result` with `degraded: true` and a `note` field; the dashboard renders the note.
