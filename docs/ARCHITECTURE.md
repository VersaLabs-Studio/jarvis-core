# JARVIS Architecture Document

**Version:** 1.0 | **Last Updated:** 2026-03-31

---

## System Overview

JARVIS is a self-hosted autonomous SWE workflow system built on a microservices architecture using Docker containers.

```
┌─────────────────────────────────────────────────────────────────┐
│                        JARVIS Core                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Telegram   │  │  WhatsApp   │  │    Web      │            │
│  │  Bot API    │  │  Business   │  │  Dashboard  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          │                                     │
│                    ┌─────▼─────┐                               │
│                    │  OpenClaw  │                               │
│                    │  Gateway   │                               │
│                    └─────┬─────┘                               │
│                          │                                     │
│         ┌────────────────┼────────────────┐                    │
│         │                │                │                    │
│  ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐            │
│  │   Model     │  │  Agent    │  │    Tool     │            │
│  │   Router    │  │  Engine   │  │   Manager   │            │
│  └──────┬──────┘  └─────┬─────┘  └──────┬──────┘            │
│         │               │               │                     │
│         │        ┌──────▼──────┐        │                     │
│         │        │   MCP       │        │                     │
│         │        │   Router    │        │                     │
│         │        └──────┬──────┘        │                     │
│         │               │               │                     │
│  ┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐             │
│  │  OpenRouter │ │   GitHub    │ │   Vercel   │             │
│  │  API        │ │   MCP       │ │   MCP      │             │
│  └─────────────┘ └─────────────┘ └────────────┘             │
│                     ┌──────▼──────┐                          │
│                     │   Notion    │                          │
│                     │   MCP       │                          │
│                     └─────────────┘                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. OpenClaw Gateway

The central orchestrator that manages:
- **Message Routing** — Receives messages from Telegram/WhatsApp/Web
- **Model Selection** — Routes to appropriate model based on task type
- **Agent Orchestration** — Manages multi-step workflows
- **Tool Execution** — Calls MCP servers for integrations
- **State Management** — Maintains conversation context

**Port:** 18789 (HTTP) / 18790 (WebSocket)

### 2. Model Router

Routes tasks to the optimal model:

```yaml
routing:
  planning:
    primary: "openrouter/nvidia/nemotron-3-super-120b-a12b:free"
    fallback: ["glm-5-turbo", "minimax-m2.5:free"]
  
  coding:
    primary: "openrouter/nvidia/nemotron-3-super-120b-a12b:free"
    fallback: ["minimax-m2.5:free", "glm-5-turbo"]
  
  office:
    primary: "openrouter/minimax/minimax-m2.5:free"
    fallback: ["nemotron-3-super:free"]
  
  fast:
    primary: "glm-5-turbo"
    fallback: ["nemotron-3-super:free"]
```

### 3. MCP Servers

Individual Model Context Protocol servers for each integration:

| Server | Port | Protocol | Purpose |
|--------|------|----------|---------|
| GitHub MCP | 9234 | HTTP | Repository management |
| Vercel MCP | 9235 | HTTP | Deployment |
| Notion MCP | 9236 | HTTP | Documentation |
| Gmail MCP | 9237 | HTTP | Email |
| VS Code MCP | 9238 | HTTP | Workspace |

### 4. Docker Architecture

```yaml
services:
  openclaw-gateway:
    image: openclaw:local
    ports:
      - "18789:18789"
      - "18790:18790"
    volumes:
      - ./config:/home/node/.openclaw
      - openclaw-data:/data
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    restart: unless-stopped

  mcp-github:
    image: node:20
    command: npx @modelcontextprotocol/server-github
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    restart: unless-stopped

  mcp-notion:
    image: node:20
    command: npx @notionhq/notion-mcp-server
    environment:
      - NOTION_API_KEY=${NOTION_API_KEY}
    restart: unless-stopped
```

---

## Data Flow

### Message Processing Flow

```
User sends message via Telegram
    ↓
Telegram Bot API receives webhook
    ↓
OpenClaw Gateway processes message
    ↓
Model Router selects appropriate model
    ↓
Model generates response + tool calls
    ↓
Tool Manager executes MCP calls
    ↓
Response sent back to user
```

### Daily Workflow Flow

```
08:00 — Cron triggers "morning audit"
    ↓
Check GitHub for open PRs/issues
    ↓
Check Notion for pending tasks
    ↓
Check Gmail for urgent emails
    ↓
Generate daily plan with Nemotron
    ↓
Send summary to Telegram
    ↓
User approves/modifies plan
    ↓
Execute tasks (code → commit → deploy)
    ↓
Update Notion with progress
    ↓
Send completion notification
```

---

## Security Architecture

### Authentication
- **Telegram:** Bot token + allowlist (user ID: 343865518)
- **Web Dashboard:** Token-based authentication
- **API Keys:** Stored in `.env` file (never in code)

### Network Security
- Gateway binds to `0.0.0.0:18789` (configurable)
- MCP servers run on internal Docker network
- External access via reverse proxy (future)

### Data Security
- All configs version-controlled in Git
- Sensitive data in `.env` (gitignored)
- Docker volumes for persistent data
- VPS snapshots for backup

---

## Scaling Strategy

### Vertical Scaling (Current)
- KVM-4: 4 vCPU / 16GB RAM / 200GB NVMe
- Sufficient for single-user JARVIS

### Horizontal Scaling (Future)
- Multiple JARVIS instances per client
- Load balancer for web dashboard
- Shared MCP servers across instances

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Container Runtime** | Docker | 24.x |
| **Orchestration** | Docker Compose | 2.x |
| **Gateway** | OpenClaw | Latest |
| **LLM API** | OpenRouter | - |
| **MCP Protocol** | Model Context Protocol | 1.0 |
| **Version Control** | Git | 2.x |
| **CI/CD** | GitHub Actions | - |
| **Deployment** | Vercel (apps) | - |
| **Documentation** | Notion | - |

---

*This document describes the technical architecture of JARVIS v1.0. Refer to MASTER-PLAN.md for project roadmap and business decisions.*