---
name: deploy-to-vps
description: Deploy to the JARVIS VPS — SSH in, git pull, docker compose up, health check, rollback on failure. The self-hosted production deploy path. The filesystem MCP is the SSH-exec proxy.
trigger:
  - "deploy to vps"
  - "deploy to production"
  - "update production"
  - "vps deploy"
tools_required: ["filesystem"]
category: devops
estimated_time: "5-10 minutes"
always_loaded: false
preferred_model_role: fast
---

# Deploy to VPS

## Purpose

Deploy the JARVIS stack to the self-hosted VPS. The skill SSHes into the VPS via the `filesystem` MCP (which is scoped to `/workspace`), runs `git pull` + `docker compose up -d`, waits for the services to become healthy, and rolls back on failure. Used for production deploys (after a Vercel preview is approved + the user is ready to commit to self-hosted).

The filesystem MCP is the SSH-exec proxy because the JARVIS dev container does not have direct SSH access to the VPS. The MCP is **scoped** to `/workspace` on the VPS, so `git pull` + `docker compose` execute in the correct directory.

> **Security note (H1):** The filesystem MCP cannot mount `/var/run/docker.sock` or escape `/workspace`. The `docker compose` commands run as the `jarvis` user on the VPS, not root. The `docker.sock` is mounted **read-only** by the docker-socket-proxy (per Part 4 §4.5), and Hermes reaches Docker only via the proxy.

## Prerequisites

- A VPS with the JARVIS repo cloned at `/workspace/jarvis-core` (or wherever `args.vps_workspace_dir` points)
- SSH access via the filesystem MCP (configured at `apps/mcp/filesystem/.env`)
- The VPS has `docker` + `docker compose` (v2) installed
- The user has confirmed the deploy target: `args.target = "staging" | "production"`
- The `args.git_ref` is a valid git ref (branch, tag, or commit SHA)

## Steps

### Step 1: Validate the target

Production deploys require `args.target === "production"` AND `args.confirmed === true`. The user is asked to confirm in chat if the target is `production` and the flag is missing.

For staging deploys, the `args.confirmed` is optional but recommended.

### Step 2: Capture the rollback anchor

Before doing anything destructive, capture the current state on the VPS:

```
filesystem.exec({
  workspace: "/workspace/jarvis-core",
  command: "git rev-parse HEAD",
})
```

The `current_sha` is the rollback anchor: if the deploy fails, `git checkout <current_sha> && docker compose up -d` reverts the VPS to this state.

### Step 3: Pull the target ref

```
filesystem.exec({
  workspace: "/workspace/jarvis-core",
  command: "git fetch origin && git checkout <args.git_ref> && git pull origin <args.git_ref>",
})
```

The `args.git_ref` is a branch name (e.g. `main`), a tag (e.g. `v1.5.0`), or a commit SHA. The pull updates the workspace to the target ref.

### Step 4: Run the deploy

```
filesystem.exec({
  workspace: "/workspace/jarvis-core",
  command: "docker compose pull && docker compose up -d",
  timeout_ms: 300_000,  // 5 min cap; the deploy is bounded
})
```

`docker compose pull` fetches the latest images; `docker compose up -d` recreates only the changed services. The output is the list of containers + their new state.

If the command exits non-zero, the skill jumps to **Step 7 (Rollback)**.

### Step 5: Wait for health

Poll the health endpoint:

```
fetch("http://<vps-hostname>/api/health", { signal: AbortSignal.timeout(5_000) })
```

The expected response is `{ ok: true, ... }`. The skill polls every 5s; the timeout is 60s. If the health endpoint is not 200 within 60s, the skill jumps to Step 7.

Additionally, the skill runs 3-5 critical-path checks:

- `GET <vps>/api/health` → 200
- `GET <vps>/v1/skills` → 200 (Hermes' skill list)
- `GET <vps>/api/cms/workflows?page=1` → 200 (the factory CRUD endpoint)

### Step 6: Record the deployment

The skill records the deploy in a `deployments` row via the API factory:

```
{
  project: "jarvis-core",
  target: "staging" | "production",
  vps_hostname: "<vps>",
  git_sha: "<new-sha>",
  previous_sha: "<rollback anchor>",
  deployed_by: "skill:deploy-to-vps",
  deployed_at: "2026-06-12T10:30:00Z",
  status: "ready"
}
```

The dashboard renders a deployment history; the operator can roll back via a future `rollback-vps-deploy` skill or manually.

### Step 7: Rollback (on failure)

If the health checks fail, the skill rolls back:

```
filesystem.exec({
  workspace: "/workspace/jarvis-core",
  command: "git checkout <current_sha> && docker compose up -d",
  timeout_ms: 300_000,
})
```

Then re-check the health endpoint. If health is restored, the rollback is "successful but failed-deploy" — the skill returns `skill:result` with `rolled_back: true` and the `current_sha` (now back on the VPS).

If the rollback itself fails, the skill halts with a critical `skill:error` and notifies the operator via Telegram (per `args.notify.telegram` or the cron default).

### Step 8: Notify the user

Send the user a chat message:

```
[VPS DEPLOY] <target>
- VPS: <hostname>
- Git SHA: <new-sha>
- Previous SHA: <rollback anchor>
- Status: <ready | rolled_back | failed>
- Health: <ok | failed>
- Smoke tests: <passed/failed>
```

For production deploys, the notification is also sent to the team Telegram channel.

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "vps_hostname": "...",
    "target": "staging" | "production",
    "git_sha": "...",
    "previous_sha": "...",
    "status": "ready" | "rolled_back" | "failed",
    "health_check_ms": 1234,
    "smoke_tests": { "/api/health": 200, "/v1/skills": 200, "/api/cms/workflows": 200 },
    "duration_ms": ...
  }
}
```

The dashboard renders the result; the chat shows the summary inline.

## Error Handling

- **filesystem.exec times out** — the VPS is unreachable; halt; the user checks the VPS network
- **`docker compose pull` fails** — the registry is unreachable; halt; the user checks the registry
- **`docker compose up -d` exits non-zero** — a service failed to start; fetch the logs (`docker compose logs <service>`); halt with the logs
- **Health check fails after Step 5** — roll back to `current_sha`; re-check
- **Rollback itself fails** — **CRITICAL** — the VPS is in a broken state; notify the operator via Telegram; the user intervenes manually
- **The git ref doesn't exist** — the deploy ref is wrong; halt; the user picks a valid ref
- **The filesystem MCP is unreachable** — the SSH tunnel is down; halt; the user checks the MCP

## Quality Checks

Before declaring the deploy complete:

- [ ] `git pull` succeeded (the workspace is on `args.git_ref`)
- [ ] `docker compose up -d` exited 0
- [ ] `/api/health` returns 200
- [ ] `/v1/skills` returns 200
- [ ] `/api/cms/workflows?page=1` returns 200
- [ ] `deployments` row created in the API factory
- [ ] User notified
- [ ] On failure: rollback succeeded AND `/api/health` returns 200

A VPS deploy that doesn't pass all 8 is a degraded deploy. The skill returns `skill:result` with `degraded: true` and a `note` field; the dashboard renders the note. **A deploy that fails AND fails to roll back is a P0 incident** — the skill escalates immediately.
