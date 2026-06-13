# Filesystem MCP

The `filesystem` MCP server provides local file operations scoped to the JARVIS repo root. Wired to `@modelcontextprotocol/server-filesystem`.

The compose stack mounts the repo at `/workspace:rw` in the container; the server is auto-scoped to that directory only (no escape above).

## Endpoints (called by `mcp-client.ts`)

- `GET /health` — liveness probe
- `GET /tools` — cached `tools/list`
- `POST /call {name, arguments}` — invoke a tool

## Setup

1. No env vars required.
2. The compose stack includes `mcp-filesystem` under the `mcp` profile:
   ```yaml
   mcp-filesystem:
     image: jarvis-mcp-base:latest
     command: ["filesystem"]
     volumes:
       - .:/workspace:rw
   ```
3. Bring it up:
   ```bash
   docker compose --profile mcp up mcp-filesystem
   ```

## Used by these workflow skills

- `deploy-to-vps.md` — runs SSH-equivalent commands (git pull, docker compose up) via the filesystem MCP
- `api-integration.md` — generates the typed client file
- `invoice-generation.md` — renders the PDF, saves it locally
- `data-analysis.md` — reads the source data, runs stats
