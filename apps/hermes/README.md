# `@jarvis/hermes` — Agent Runtime (Phase E)

The Hermes agent runtime. Talks to OpenRouter (model routing + fallback
chains), loads skill docs, and exposes a small HTTP+WS API to the Fastify
API tier on `jarvis-internal`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/health`           | Liveness + model catalog status |
| `POST` | `/v1/chat/stream`   | Stream chat completions (SSE) |
| `POST` | `/v1/skill/run`     | Run a skill asynchronously (`run_id` returned, progress over WS) |
| `GET`  | `/v1/skills`        | List loaded skills |
| `POST` | `/v1/mcp/test`      | Probe an MCP server |
| `GET`  | `/v1/cron`          | List cron jobs (E4) |
| `WS`   | `/ws`               | Skill progress + notifications (internal-only) |

See `docs/PHASE-E-PLAN.md` §5.2 for the full wire contract.

## Local development

```bash
# From the monorepo root, after `pnpm install`:
cp apps/hermes/.env.example apps/hermes/.env
pnpm --filter @jarvis/hermes dev
# Hermes listens on http://localhost:8765
```

## Inside Docker

```bash
# Build + start (after Phase A3's compose is up):
docker compose up -d hermes
docker compose logs -f hermes
curl http://localhost:8765/health
```

## Security model (Phase E §3)

- **No raw Docker socket.** Container control goes through
  `docker-socket-proxy` at `DOCKER_HOST=tcp://docker-socket-proxy:2375`.
- **In-process code-exec sandbox.** Sub-agents run with a sanitized env
  (no API keys, no service-role, no Docker socket). Depth limit 1.
- **Runs as non-root (UID 1001)** with `cap_drop: [ALL]` and
  `no-new-privileges`. Rootfs is read-only with a `/app/tmp` tmpfs.

## Model routing (Phase E §2)

Configured in `src/config/chains.ts`. At boot, the resolver pings
`https://openrouter.ai/api/v1/models` to verify every chain member;
wrong slugs (e.g. `zhipu/glm-5-turbo`) are auto-corrected to working
ones (e.g. `z-ai/glm-5`) and the substitution is logged.

## Skill docs

Mounted at `/app/data/skills/{foundational,workflow}/*.md`. Each doc is
YAML frontmatter + markdown body. The loader validates the frontmatter
against `@jarvis/shared/schemas/skill-doc.schema.ts`.

## Cron

Configured in `src/cron/registry.ts` (E4). Persisted in Redis via
BullMQ; survives restarts and will not double-fire.
