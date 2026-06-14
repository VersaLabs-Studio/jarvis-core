# Browser MCP

The `browser` MCP server provides web automation via a headless Chromium. Wired to `@playwright/mcp` (the official Playwright MCP).

## Endpoints (called by `mcp-client.ts`)

- `GET /health` — liveness probe
- `GET /tools` — cached `tools/list`
- `POST /call {name, arguments}` — invoke a tool

## Setup

1. No env vars required (Chromium installs at first run via the package's postinstall).
2. The compose stack includes `mcp-browser` under the `mcp` profile:
   ```yaml
   mcp-browser:
     image: jarvis-mcp-base:latest
     command: ["browser"]
     mem_limit: 512m  # Chromium is memory-hungry
   ```
3. Bring it up:
   ```bash
   docker compose --profile mcp up mcp-browser
   ```

## Used by these workflow skills

- `research-and-report.md` — reads sources, scrapes content
- `api-integration.md` — fetches API docs to read
- `content-creation.md` — researches topics for blog posts
- `create-proposal.md` — pulls client context
- `seo-audit.md` — crawls the site, runs the SEO checks
