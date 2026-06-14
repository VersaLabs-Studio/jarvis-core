# JARVIS Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.5.0-dev] — v1.5 Build (Phases A–F)

Release-line progress against `docs/V1.5-BUILD-HANDOFF.md` (`A Foundation → B API+Bridge → C Web → D Mobile → E Skills → F Deploy`). Each gate = Part 5 checklist + Code Review 0 blockers + Auditor ≥ 8.5.

### Signed off (merged to `develop` + `main`)
- **Phase A — Foundation** ✅ — Turborepo/pnpm monorepo, `@jarvis/shared` generated types, Docker Compose (socket-proxy/redis/nginx), CI + type-drift guard.
- **Phase B — API + Hermes bridge** ✅ — Fastify 5 API, env/response envelope, Supabase-Auth verification + tenant context, CRUD route factory + entity registry, WS handler, services/secrets (AES-256-GCM), O(1) JWT-claim RLS. **WP-0 hardening (post-gate):** fp-wrapped shared plugins + uniform `tenantMiddleware` guard + `NO_TENANT` error (audited 9.0).
- **Phase C — Web Dashboard** ✅ — OKLCH design system, query-key factory + generic hooks, 10 real-data pages with skeleton/empty/error states, auth UI + WS client. Color-gate 0.
- **Phase D — Mobile App** ✅ — Expo SDK 56 app: D1 scaffold+design, D2 data layer, D3 dashboard+settings, D4 chat+WS streaming, D5 workflows+runs, D6 native platform (push stub, deep-link, haptics, SecureStore E2E). Final WP D6 audited **9.0/10**; merged-branch integrity re-verified (frozen install 0 · mobile/web/api tsc 0 · color/any 0 · expo-doctor 21/21 · expo export all platforms).
  - **Deferred (architect-approved):** the live `GET /api/cms/workflows → 200` smoke gate moves to a later phase as a manual dev-server checklist (requires Supabase provisioning per `docs/PHASE-D-LIVE-GATE-FINDINGS.md` §3).

### Next
- **Phase E — Skills & Workflows** 🔜 — the Hermes agent runtime + 29 skill docs (11 foundational + 18 workflow) + pinned MCP image + cron. Handoff: `docs/PHASE-E-HANDOFF.md`.
- **Phase F — Deploy & Polish** — TLS/Nginx, backups + restore drill, observability, VPS deploy. Folds the Phase D + live-gate carryover ledger.

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