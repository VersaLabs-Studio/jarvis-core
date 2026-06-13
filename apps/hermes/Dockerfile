# =============================================================================
# Hermes Agent — Multi-stage build (Phase E §5.5)
# Non-root (UID 1001), cap-drop ALL, no-new-privileges. Skill docs and the
# /app/data volume are mounted at runtime; the image is hermes-runtime only.
#
# F0 closure: real tsc→dist build for @jarvis/shared (with .js extensions +
# NodeNext + exports conditions). The shared-builder stage emits
# packages/shared/dist/; the runner stage COPYs the dist (not the source)
# so node dist/server.js can resolve `import @jarvis/shared` at runtime.
# =============================================================================

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ----------------------------------------------------------------------------
# deps — install only the workspace deps we need (faster cache hits)
# ----------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/hermes/package.json ./apps/hermes/
RUN pnpm install --frozen-lockfile

# ----------------------------------------------------------------------------
# shared-builder — emits packages/shared/dist/ (F0 closure)
# ----------------------------------------------------------------------------
FROM base AS shared-builder
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/shared/ ./packages/shared/
RUN pnpm --filter @jarvis/shared build

# ----------------------------------------------------------------------------
# builder — TypeScript build of @jarvis/hermes (NodeNext + .js extensions)
# ----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/hermes/node_modules ./apps/hermes/node_modules
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY tsconfig.json ./
COPY packages ./packages
COPY apps/hermes ./apps/hermes
RUN pnpm --filter @jarvis/hermes build

# ----------------------------------------------------------------------------
# runner — production image (H1 hardening: non-root, no caps)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate

# Non-root user (UID 1001) — required by H1 sandbox
RUN addgroup -g 1001 hermes && adduser -D -u 1001 -G hermes hermes

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8765
ENV HOST=0.0.0.0

# Copy built artifact + node_modules + workspace package.json.
# F0 closure: the shared dist goes into the WORKSPACE (not the symlink)
# so the api/hermes runtime sees packages/shared/dist/index.js (Node ESM
# compatible) — NOT packages/shared/src/index.ts (which Node can't load).
COPY --from=builder --chown=hermes:hermes /app/apps/hermes/dist ./dist
COPY --from=builder --chown=hermes:hermes /app/apps/hermes/package.json ./
COPY --from=deps    --chown=hermes:hermes /app/apps/hermes/node_modules ./node_modules
COPY --from=builder --chown=hermes:hermes /app/packages ./packages

# Bake the skill docs into the image so /v1/skills is populated on first boot.
# The hermes-data volume (mounted at /app/data) is preserved so ops can replace
# a doc at runtime without rebuilding the image — but the docs in the image
# are the floor, not the volume mount. (Phase E completion handoff §2.)
COPY --from=builder --chown=hermes:hermes /app/apps/hermes/skills /app/data/skills

USER 1001

EXPOSE 8765

# Healthcheck: Hermes' /health returns 200 + model + uptime
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
    CMD wget -qO- http://localhost:8765/health || exit 1

CMD ["node", "dist/server.js"]
