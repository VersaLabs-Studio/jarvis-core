# JARVIS Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] - 2026-03-31

### Added
- Initial JARVIS Core monorepo structure
- Master Plan documentation (source of truth)
- Architecture documentation
- Docker automation scripts (start/stop/health)
- Model routing configuration
- README with full project overview

### Infrastructure
- Hostinger KVM-4 VPS (4 vCPU / 16GB RAM / 200GB NVMe)
- Docker + Docker Compose on VPS
- OpenClaw gateway deployed and healthy
- Telegram bot connected (@Jarvis1015Bot)
- OpenRouter API connected with Nemotron-3-Super:free

### Models
- **Orchestrator:** NVIDIA Nemotron-3-Super:free (planning/audit)
- **Heavy SWE:** MiniMax M2.5:free (coding/office)
- **Fast:** GLM-5-Turbo (fallback)

### Channels
- ✅ Telegram — Primary chat interface
- ✅ Web Dashboard — Control panel (port 18789)
- 🔄 WhatsApp — Pending setup
- 🔄 Gmail — Pending MCP integration
- 🔄 Notion — Pending MCP integration

---

## [Unreleased]

### Planned - Phase 2
- [ ] GitHub MCP integration
- [ ] Vercel MCP integration
- [ ] Notion MCP integration
- [ ] Gmail/Google MCP integration
- [ ] VS Code workspace MCP
- [ ] Browser MCP
- [ ] Shell/File MCP

### Planned - Phase 3
- [ ] Morning audit workflow automation
- [ ] Plan → Code → Git → Vercel → Notion pipeline
- [ ] Daily standup automation
- [ ] Cron-based task scheduling

### Planned - Phase 4
- [ ] Image generation MCPs
- [ ] Video generation capabilities
- [ ] Vision/image recognition
- [ ] Google One deep sync

### Planned - Phase 5
- [ ] Long-running persistent agents
- [ ] Advanced cron integration
- [ ] Master doc automation in Notion

### Planned - Phase 6
- [ ] Security audit and hardening
- [ ] Automated backup system
- [ ] Full SWE loop testing
- [ ] Performance optimization

### Planned - Phase 7
- [ ] Export as reusable template
- [ ] First client mock deployment
- [ ] SaaS preparation
- [ ] 🎉 JARVIS Live celebration

---

*This changelog tracks all significant changes to JARVIS Core. See MASTER-PLAN.md for detailed roadmap.*