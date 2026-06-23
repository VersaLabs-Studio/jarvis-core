FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# shared-builder — emits packages/shared/dist/ (F0 closure).
# The api + hermes runner stages COPY this dist so node dist/... boots
# without the shared package's index.ts (which Node's ESM resolver
# cannot import as a runtime value).
# ---------------------------------------------------------------------------
FROM base AS shared-builder
# FIX A (Phase F Stage-2): shared/tsconfig.json extends ../../tsconfig.json
# (TS5083 without it), and pnpm hoists `typescript` to the workspace-root
# /app/node_modules/.pnpm store. Copying only packages/shared/node_modules
# leaves the tsc symlink dangling and the build dies with TS5083 + a missing
# `typescript` binary.
COPY tsconfig.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/shared/ ./packages/shared/
RUN pnpm --filter @jarvis/shared build

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY . .
RUN pnpm turbo build --filter=@jarvis/api

FROM base AS runner
ENV NODE_ENV=production

# FIX D (SIMPLE — Phase F Stage-2): preserve the full workspace layout so
# pnpm's relative symlinks resolve at runtime:
#   apps/<app>/node_modules/<pkg>            -> ../../node_modules/.pnpm/.../node_modules/<pkg>
#   apps/<app>/node_modules/@jarvis/shared   -> ../../packages/shared
# The previous "F0 closure" runner placed shared/dist at
# ./node_modules/@jarvis/shared/dist but shipped no other deps, so
# `node dist/server.js` crashed with ERR_MODULE_NOT_FOUND for fastify,
# zod, @sentry/node, etc. `pnpm deploy` (PREFERRED) was rejected for v1.5
# because dist is in .gitignore and the workspace exports resolution has
# too many edges to be a P0 boot gate.
WORKDIR /app
COPY --from=builder /app/node_modules          ./node_modules
COPY --from=builder /app/packages/shared      ./packages/shared
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist         ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]
