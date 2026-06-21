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
# F0 closure: the shared package's BUILT dist (not the source) must be
# present in the runner image so `import @jarvis/shared` resolves to
# the .js entry at runtime.
COPY --from=builder /app/packages/shared/dist ./node_modules/@jarvis/shared/dist
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
EXPOSE 3000
CMD ["node", "dist/server.js"]
