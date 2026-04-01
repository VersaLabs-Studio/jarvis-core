# JARVIS Core - Agent Onboarding Guide

**Purpose:** This document provides context for any agent (human or AI) joining this project. It captures the current state, decisions made, and what needs to happen next.

---

## Project Overview

**JARVIS Core** is an autonomous Software Engineering Workflow System built on:
- **OpenClaw** — Self-hosted AI gateway (the brain)
- **OpenRouter** — Unified LLM API access (free SOTA models)
- **Individual MCPs** — Modular integrations (GitHub, Vercel, Notion, Gmail, etc.)
- **Docker** — Containerized, portable, scalable infrastructure

**Vision:** One entity that replaces every hosted tool, runs your entire day, ships code, and scales into sellable client instances.

---

## Current Status (as of 2026-04-01)

### Phase 1: COMPLETE ✅
- [x] VPS setup (Hostinger KVM-4: 4 vCPU / 16GB RAM / 200GB NVMe)
- [x] Docker + Docker Compose installed
- [x] OpenClaw gateway deployed (ports 18789/18790/18791)
- [x] Telegram bot connected (@Jarvis1015Bot)
- [x] OpenRouter API connected
- [x] Model routing configured (Nemotron-3-Super:free primary)
- [x] Documentation created (MASTER-PLAN.md, ARCHITECTURE.md, CHANGELOG.md)

### Phase 2: IN PROGRESS 🔄
- [ ] OpenClaw MCP configuration (`config/openclaw.json`)
- [ ] GitHub MCP integration
- [ ] Vercel MCP integration
- [ ] Notion MCP integration
- [ ] Gmail MCP integration
- [ ] Browser MCP integration
- [ ] Integration testing

### Phase 3-7: PENDING ❌
- Daily workflow automation
- Vision & media capabilities
- Persistent agents
- Security hardening
- Export & monetization

---

## Key Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| OpenClaw over Composio | Full control, self-hosted, no vendor lock | 2026-03-23 |
| Individual MCPs over bundled | Pure flexibility, modular | 2026-03-23 |
| Free models via OpenRouter | Zero recurring cost, SOTA quality | 2026-03-23 |
| Docker over native install | Portable, reproducible, easy rollback | 2026-03-23 |
| Monorepo (jarvis-core) | Single source of truth, version-controlled | 2026-03-23 |
| Telegram as primary interface | Mobile-first, bot-friendly, free | 2026-03-23 |

---

## Critical Rules (NEVER BREAK)

1. **Never use paid hosted providers** — OpenRouter free models only
2. **All changes go through Git** — Nothing is modified directly on VPS without commit
3. **Test before commit** — Always verify changes work before pushing
4. **Security first** — Keep tokens in .env, never in code
5. **Document everything** — MASTER-PLAN.md is the source of truth

---

## File Structure

```
jarvis-core/
├── docs/                    # Master documentation
│   ├── MASTER-PLAN.md       # Project roadmap (SOURCE OF TRUTH)
│   ├── ARCHITECTURE.md      # System design
│   ├── CHANGELOG.md         # Version history
│   ├── ONBOARDING.md        # This file - context for new agents
│   ├── WORKLOG.md           # Detailed process tracking
│   └── MCP-SETUP.md         # MCP server setup guide
├── config/                  # Configuration files
│   ├── models.yaml          # Model routing
│   ├── openclaw.json        # OpenClaw gateway config
│   └── mcp-servers/         # Individual MCP configs
├── mcp/                     # MCP server implementations
│   ├── github/
│   ├── vercel/
│   ├── notion/
│   ├── gmail/
│   └── browser/
├── scripts/                 # Automation scripts
├── chatbot/                 # Chatbot central (future)
├── docker-compose.yml       # Main Docker Compose
├── .env.example             # Environment template
└── .env                     # ACTUAL ENV (NEVER COMMIT)
```

---

## Environment Variables Required

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `OPENROUTER_API_KEY` | LLM API access | openrouter.ai |
| `GITHUB_TOKEN` | GitHub MCP | GitHub Settings > Developer Settings |
| `VERCEL_TOKEN` | Vercel MCP | Vercel Dashboard > Tokens |
| `NOTION_API_KEY` | Notion MCP | Notion Integrations |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | @BotFather |
| `GATEWAY_TOKEN` | OpenClaw auth | Auto-generated |
| `DASHBOARD_TOKEN` | Web dashboard auth | Auto-generated |

---

## How to Continue

1. **Read MASTER-PLAN.md** — Understand the full roadmap
2. **Check WORKLOG.md** — See what was done last
3. **Review current todo list** — Find the next pending task
4. **Execute one step at a time** — Don't skip ahead
5. **Update documentation** — Log every change in WORKLOG.md

---

## Common Commands

```bash
# Start all services
./scripts/docker-start.sh

# Stop all services
./scripts/docker-stop.sh

# Check health
./scripts/docker-health.sh

# View logs
docker compose logs -f openclaw-gateway

# Restart a specific MCP
docker compose restart mcp-github
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Gateway not starting | Check `docker compose logs -f openclaw-gateway` |
| MCP not discovered | Verify service is on `jarvis-network` |
| Telegram not responding | Check bot token and allowlist |
| Model errors | Verify OpenRouter API key and free tier quota |

---

*Last updated: 2026-04-01 | Next agent should start with Phase 2 MCP configuration*
