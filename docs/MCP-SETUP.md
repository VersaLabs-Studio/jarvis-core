# JARVIS Core - MCP Server Setup Guide

**Purpose:** Complete guide for setting up, configuring, and troubleshooting all MCP servers.

---

## Overview

MCP (Model Context Protocol) servers are the bridge between OpenClaw and external services. Each MCP server provides specific tools that the AI can use to interact with external APIs.

### MCP Servers in JARVIS

| Server | Service | Purpose | npm Package |
|--------|---------|---------|-------------|
| GitHub | `mcp-github` | Repository management, PRs, issues | `@modelcontextprotocol/server-github` |
| Vercel | `mcp-vercel` | Deployment, project management | `@vercel/mcp-server` |
| Notion | `mcp-notion` | Documentation, knowledge base | `@notionhq/notion-mcp-server` |
| Gmail | `mcp-gmail` | Email, calendar, drive | TBD |
| Browser | `mcp-browser` | Web automation, research | `@anthropic/mcp-server-browser` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      OpenClaw Gateway                        │
│                    (jarvis-gateway)                          │
└────────────────────────┬────────────────────────────────────┘
                         │ Docker Network: jarvis-network
         ┌───────────────┼───────────────┬───────────────┐
         │               │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │ GitHub  │    │ Vercel  │    │ Notion  │    │ Browser │
    │  MCP    │    │  MCP    │    │  MCP    │    │  MCP    │
    │:9234    │    │:9235    │    │:9236    │    │:9237    │
    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

---

## Setup Instructions

### Prerequisites

1. Docker and Docker Compose installed
2. All API tokens in `.env` file
3. OpenClaw gateway running and healthy

### Step 1: Verify Environment Variables

Ensure these are set in `.env`:

```bash
# Required for MCP servers
GITHUB_TOKEN=ghp_your_token_here
VERCEL_TOKEN=your_vercel_token_here
NOTION_API_KEY=your_notion_key_here
```

### Step 2: Start MCP Services

```bash
# Start all MCP services
docker compose --profile mcp up -d

# Or start individual services
docker compose up -d mcp-github
docker compose up -d mcp-vercel
docker compose up -d mcp-notion
```

### Step 3: Verify MCP Services

```bash
# Check service status
docker compose ps

# Check logs for a specific MCP
docker compose logs mcp-github
```

### Step 4: Configure OpenClaw to Use MCPs

OpenClaw discovers MCP servers through its configuration file (`config/openclaw.json`).

Example MCP configuration in OpenClaw:

```json
{
  "mcp": {
    "servers": {
      "github": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_TOKEN": "${GITHUB_TOKEN}"
        }
      }
    }
  }
}
```

---

## Individual MCP Server Details

### GitHub MCP

**Tools Available:**
- `create_or_update_file` - Create/update files in repos
- `search_repositories` - Search GitHub
- `create_issue` - Create issues
- `create_pull_request` - Create PRs
- `list_issues` - List issues
- `list_pull_requests` - List PRs

**Required Token:** `GITHUB_TOKEN` with `repo` scope

**Test Command:**
```bash
curl http://localhost:9234/health
```

### Vercel MCP

**Tools Available:**
- `list_projects` - List Vercel projects
- `deploy` - Deploy to Vercel
- `get_deployment` - Get deployment status

**Required Token:** `VERCEL_TOKEN`

**Test Command:**
```bash
curl http://localhost:9235/health
```

### Notion MCP

**Tools Available:**
- `search` - Search Notion pages
- `get_page` - Get page content
- `create_page` - Create new pages
- `update_page` - Update pages

**Required Token:** `NOTION_API_KEY`

**Test Command:**
```bash
curl http://localhost:9236/health
```

### Browser MCP

**Tools Available:**
- `browser_navigate` - Navigate to URL
- `browser_screenshot` - Take screenshot
- `browser_click` - Click element
- `browser_type` - Type text
- `browser_read` - Read page content

**Required Token:** None

**Test Command:**
```bash
curl http://localhost:9237/health
```

---

## Troubleshooting

### MCP Not Starting

```bash
# Check logs
docker compose logs mcp-github

# Common issues:
# - Missing environment variables
# - Invalid API tokens
# - Network issues
```

### OpenClaw Can't Find MCP

1. Verify MCP service is running: `docker compose ps`
2. Verify both are on same network: `docker network inspect jarvis-network`
3. Check OpenClaw config for correct service name

### API Rate Limits

- Monitor OpenRouter usage in dashboard
- Use `:free` models when possible
- Set up alerts for credit usage

---

## Adding New MCP Servers

1. Add service to `docker-compose.yml`
2. Add environment variable to `.env.example`
3. Add config to `config/mcp-servers/<name>.yaml`
4. Update `config/openclaw.json` with MCP definition
5. Test the MCP independently
6. Test OpenClaw integration

---

*Last updated: 2026-04-01 | Refer to docker-compose.yml for current service definitions*
