# =============================================================================
# Hermes Agent — Multi-stage build (Phase E §5.5)
# Non-root (UID 1001), cap-drop ALL, no-new-privileges. Skill docs and the
# /app/data volume are mounted at runtime; the image is hermes-runtime only.
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
# builder — TypeScript build of @jarvis/hermes
# ----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/hermes/node_modules ./apps/hermes/node_modules
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

# Copy built artifact + node_modules + workspace package.json
COPY --from=builder --chown=hermes:hermes /app/apps/hermes/dist ./dist
COPY --from=builder --chown=hermes:hermes /app/apps/hermes/package.json ./
COPY --from=deps    --chown=hermes:hermes /app/apps/hermes/node_modules ./node_modules
COPY --from=builder --chown=hermes:hermes /app/packages ./packages

USER 1001

EXPOSE 8765

# Healthcheck: Hermes' /health returns 200 + model + uptime
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
    CMD wget -qO- http://localhost:8765/health || exit 1

CMD ["node", "dist/server.js"]
