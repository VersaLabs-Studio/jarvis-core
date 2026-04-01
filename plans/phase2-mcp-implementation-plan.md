# Phase 2: MCP Server Implementation Plan

**Created:** 2026-04-01 | **Status:** Planning | **Priority:** High

---

## Executive Summary

Phase 2 focuses on integrating individual MCP (Model Context Protocol) servers to give JARVIS autonomous access to GitHub, Vercel, Notion, Gmail, and Browser tools. This phase transforms JARVIS from a chatbot into a fully autonomous software engineering workflow system.

---

## Current State Assessment

### What's Working (Phase 1 Complete)
- VPS: Hostinger KVM-4 (4 vCPU / 16GB RAM / 200GB NVMe)
- Docker + Docker Compose: Running
- OpenClaw Gateway: Deployed on ports 18789/18790/18791
- Telegram Bot: @Jarvis1015Bot connected
- OpenRouter: Connected with Nemotron-3-Super:free
- Model Routing: Configured in `config/models.yaml`

### What's Missing (Phase 2 Gap)
- MCP server configurations in OpenClaw
- `config/mcp-servers/` directory (doesn't exist)
- `config/openclaw.json` (main gateway config)
- Working MCP Docker services (defined but not configured)
- Integration testing between OpenClaw and MCP servers

---

## Implementation Steps

### Step 1: Create OpenClaw Gateway Configuration

**File:** `config/openclaw.json`

This is the main configuration file that OpenClaw reads from. It defines:
- Model connections (OpenRouter)
- MCP server endpoints
- Telegram integration
- Agent behavior settings

```json
{
  "version": "1.0",
  "gateway": {
    "port": 18789,
    "bind": "0.0.0.0",
    "token": "${GATEWAY_TOKEN}"
  },
  "models": {
    "default": "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
    "providers": {
      "openrouter": {
        "api_key": "${OPENROUTER_API_KEY}",
        "base_url": "https://openrouter.ai/api/v1"
      }
    }
  },
  "mcp": {
    "servers": {
      "github": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_TOKEN": "${GITHUB_TOKEN}"
        }
      },
      "vercel": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@vercel/mcp-server"],
        "env": {
          "VERCEL_TOKEN": "${VERCEL_TOKEN}"
        }
      },
      "notion": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@notionhq/notion-mcp-server"],
        "env": {
          "NOTION_API_KEY": "${NOTION_API_KEY}"
        }
      },
      "browser": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-browser"]
      }
    }
  },
  "telegram": {
    "enabled": true,
    "bot_token": "${TELEGRAM_BOT_TOKEN}",
    "allow_from": ["343865518"]
  }
}
```

### Step 2: Create MCP Server Configuration Files

**Directory:** `config/mcp-servers/`

Each MCP server gets its own configuration file for easy management:

| File | Purpose |
|------|---------|
| `github.yaml` | GitHub MCP settings |
| `vercel.yaml` | Vercel MCP settings |
| `notion.yaml` | Notion MCP settings |
| `gmail.yaml` | Gmail/Google MCP settings |
| `browser.yaml` | Browser automation settings |

### Step 3: Update Docker Compose for MCP Services

The current `docker-compose.yml` needs:
- Proper port mappings for MCP servers
- Health checks for each MCP
- Network configuration for OpenClaw discovery
- Volume mounts for persistent data

### Step 4: Create MCP Server Implementation Files

Each `mcp/*/` directory needs:
- `README.md` - Setup instructions
- `config.yaml` - Server-specific configuration
- `tools.md` - Available tools/capabilities

### Step 5: Integration Testing

Test each MCP server individually:
1. Start MCP service
2. Verify health endpoint
3. Test basic tool calls
4. Verify OpenClaw can discover and use the MCP

---

## File Creation Checklist

- [ ] `config/openclaw.json` - Main gateway configuration
- [ ] `config/mcp-servers/github.yaml` - GitHub MCP config
- [ ] `config/mcp-servers/vercel.yaml` - Vercel MCP config
- [ ] `config/mcp-servers/notion.yaml` - Notion MCP config
- [ ] `config/mcp-servers/gmail.yaml` - Gmail MCP config
- [ ] `config/mcp-servers/browser.yaml` - Browser MCP config
- [ ] `mcp/github/README.md` - GitHub MCP documentation
- [ ] `mcp/github/config.yaml` - GitHub MCP settings
- [ ] `mcp/vercel/README.md` - Vercel MCP documentation
- [ ] `mcp/vercel/config.yaml` - Vercel MCP settings
- [ ] `mcp/notion/README.md` - Notion MCP documentation
- [ ] `mcp/notion/config.yaml` - Notion MCP settings
- [ ] `mcp/gmail/README.md` - Gmail MCP documentation
- [ ] `mcp/gmail/config.yaml` - Gmail MCP settings
- [ ] `mcp/browser/README.md` - Browser MCP documentation
- [ ] `mcp/browser/config.yaml` - Browser MCP settings
- [ ] Updated `docker-compose.yml` with full MCP support
- [ ] Updated `.env.example` with all MCP variables

---

## Documentation Updates Required

### MASTER-PLAN.md Updates
- Add Phase 2 completion status
- Update version history
- Add MCP server status table
- Document daily workflow commands

### ARCHITECTURE.md Updates
- Add MCP server connection diagram
- Document data flow for each MCP
- Add port mapping table
- Document security considerations

### New Files to Create
- `docs/ONBOARDING.md` - Context for future agents
- `docs/WORKLOG.md` - Detailed process tracking
- `docs/MCP-SETUP.md` - MCP server setup guide

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenClaw config format mismatch | High | Test with minimal config first |
| MCP package compatibility | Medium | Use verified npm packages |
| Docker network isolation | Low | Use internal Docker network |
| API rate limits | Medium | Monitor OpenRouter usage |
| Token security | High | Keep all tokens in .env only |

---

## Next Actions

1. **Immediate:** Create `config/openclaw.json` with minimal working config
2. **Next:** Create `config/mcp-servers/` directory with all configs
3. **Then:** Update `docker-compose.yml` with proper MCP services
4. **Finally:** Test each MCP integration individually

---

*This plan will be executed step-by-step. Each step will be documented in the worklog.*
