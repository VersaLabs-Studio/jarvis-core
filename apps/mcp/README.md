# JARVIS MCP (Model Context Protocol) — Pinned Image Catalog

> **Phase E §5.3 E3.** Replaces the v1.0 `mcp/` OpenClaw YAML stub (now deleted). Single base image + per-server `command:` override. All packages exact-pinned at build time. Closes **C4** (corrected MCP package names) + **H2** (pinned versions, no `npx -y latest`).

## Architecture

```
┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
│   Hermes             │  HTTP   │   mcp-<server>        │  stdio  │   stdio MCP server   │
│   (mcp-client.ts)    │ ──────▶ │   (jarvis-mcp-base    │ ──────▶ │   (npm package)      │
│                      │  :8765  │    + bridge.js)       │         │                      │
└──────────────────────┘         └──────────────────────┘         └──────────────────────┘
                                     spawns child
                                     @modelcontextprotocol/sdk
                                     StdioClientTransport
```

The bridge is a single Node script (`src/bridge.js`) that:

1. Spawns a stdio MCP server as a child process (the npm package for the server name)
2. Connects to it via `@modelcontextprotocol/sdk`'s `StdioClientTransport`
3. Exposes three HTTP endpoints on port 8765:
   - `GET /health` — liveness probe (uptime, tool count, last refresh)
   - `GET /tools` — cached `tools/list` result (refreshed every 5 min)
   - `POST /call` — `tools/call` invocation with `{ name, arguments }` → `{ ok, result } | { ok: false, error }`

Hermes is the only consumer (via `apps/hermes/src/lib/mcp-client.ts`). The bridge is internal-only — the container listens on `0.0.0.0:8765` but the compose stack puts it on the `jarvis-internal` network (no external exposure).

## File tree

```
apps/mcp/
├── Dockerfile                              # NEW; node:20-slim; USER 1001; ARG-pinned packages
├── .dockerignore                           # NEW
├── README.md                               # this file
└── (per-server subdirs)
    ├── github/
    │   ├── config.yaml                     # per-server runtime config
    │   ├── .env.example                    # env vars (gitignored .env provides secrets)
    │   └── README.md                       # how to use the github MCP
    ├── notion/{config.yaml, .env.example, README.md}
    ├── supabase/{config.yaml, .env.example, README.md}
    ├── filesystem/{config.yaml, .env.example, README.md}   # mounts /workspace
    ├── browser/{config.yaml, .env.example, README.md}      # @playwright/mcp
    ├── gmail/{config.yaml, .env.example, README.md}        # pending Part 4 §4.6
    └── vercel/{config.yaml}                                # hosted; doc-only
```

## Launch set (9 servers)

| Identifier | Transport | Wired in v1.5? | Package |
|---|---|---|---|
| `github` | Local container | ✅ | `@modelcontextprotocol/server-github` |
| `notion` | Local container | ✅ | `@notionhq/notion-mcp-server` |
| `supabase` | Local container | ✅ | `@supabase/mcp-server-supabase` (C4) |
| `browser` | Local container | ✅ | `@playwright/mcp` (C4) |
| `filesystem` | Local container | ✅ | `@modelcontextprotocol/server-filesystem` |
| `gmail` | Local container | ✅ (pending) | `@gongrzhe/server-gmail-autoauth-mcp` (Part 4 §4.6) |
| `vercel` | Hosted | ✅ | OAuth (F-scope for real invocation) |
| `slack` | **PENDING** | ❌ | No first-party package; Part 4 §4.6 |
| `linear` | Hosted | ✅ | OAuth (F-scope for real invocation) |

## Version resolution

Each `ARG MCP_*_VERSION` in the Dockerfile is resolved at build time:

```bash
# Run these once before `docker compose build`:
npm view @modelcontextprotocol/sdk version
npm view @modelcontextprotocol/server-github version
npm view @notionhq/notion-mcp-server version
npm view @supabase/mcp-server-supabase version
npm view @playwright/mcp version
npm view @modelcontextprotocol/server-filesystem version
npm view @gongrzhe/server-gmail-autoauth-mcp version
```

Pass the resolved versions as `args:` in the compose `jarvis-mcp-base` service. Renovate/Dependabot proposes upgrades; nothing auto-pulls `latest` at runtime.

## Probe (mcp-test)

`POST /v1/mcp/test {server}` calls the per-server bridge's `/health` + `/tools` endpoints and returns:

```json
{ "server": "github", "ok": true, "tools": ["create_pull_request", "create_issue", ...] }
```

For hosted servers (vercel, linear), the probe returns a static `tools: [...]` list per Part 4 §4.6. For `slack` (pending), the probe returns `{ok: false, error: "pending"}`.

## Real tool invocation

`POST /v1/skill/run` → agentic loop → `mcp-client.ts` → `POST http://mcp-<server>:8765/call {name, arguments}` → bridge → stdio MCP server → result.

Example (chat-time "deploy to vercel"):

1. `chat-stream.ts` matches "deploy to vercel" → injects `deploy-to-vercel.md` body
2. LLM emits `tool_call: {name: "vercel", args: {tool: "deploy", args: {project: "jarvis"}}}`
3. `tool-executor.ts` → `mcp-client.ts` → `POST http://mcp-vercel:8765/call {name: "deploy", arguments: {project: "jarvis"}}`
4. Bridge forwards to `vercel` MCP stdio server
5. Response: `{ok: true, result: {deployment_id: "...", url: "https://jarvis-abc123.vercel.app"}}`
6. Tool result is fed back to the LLM as a `tool` message
7. LLM emits final text (e.g. "Deployed to https://jarvis-abc123.vercel.app")
8. `broadcast({type: "skill:result", ...})` to the chat + dashboard
