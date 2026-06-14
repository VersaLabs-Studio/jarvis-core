# GitHub MCP

The `github` MCP server provides repo management, PR creation, issue tracking, and code search. Wired to `@modelcontextprotocol/server-github` (the official GitHub MCP server).

## Endpoints (called by `mcp-client.ts`)

- `GET /health` — liveness probe (returns `{ok, server, uptime_s, tool_count, last_refresh}`)
- `GET /tools` — cached `tools/list` (refreshed every 5 min by the bridge)
- `POST /call {name, arguments}` — invoke a tool, returns `{ok: true, result} | {ok: false, error}`

## Setup

1. Copy `.env.example` to `.env` and set `GITHUB_TOKEN`
2. The compose stack includes `mcp-github` under the `mcp` profile; bring it up with:
   ```bash
   docker compose --profile mcp up mcp-github
   ```
3. Verify the bridge is alive:
   ```bash
   curl http://localhost:8765/health
   # → { "ok": true, "server": "github", "uptime_s": 5, "tool_count": 8, ... }
   ```
4. Probe via Hermes:
   ```bash
   curl -X POST http://localhost:8765/v1/mcp/test \
     -H "Content-Type: application/json" \
     -d '{"server": "github"}'
   # → { "server": "github", "ok": true, "tools": ["create_pull_request", ...] }
   ```

## Used by these workflow skills

- `ship-feature.md` — creates the PR
- `morning-audit.md` — pulls PRs/issues/commits for the daily briefing
- `debug-and-fix.md` — opens the bug-fix PR
- `github-pr-workflow.md` — the dedicated PR flow
- `code-review.md` — posts the review
- `client-report.md` — pulls the week's PRs for the client report
- `project-onboard.md` — creates the repo
