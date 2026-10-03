# syntax=docker/dockerfile:1
# API + worker + migrate image (PLAN §25.3). Build from the repo root:
#   docker build -f apps/api/Dockerfile -t auren-api .
# Commands: node dist/server.js (default) · node dist/worker.js · node dist/migrate.js
ARG NODE_IMAGE=node:24.21.0-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0 TURBO_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# Keep only what @auren/api needs (incl. workspace deps) so unrelated changes don't bust the cache.
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.7 prune @auren/api --docker

FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm --filter @auren/api build
# Production-only node_modules for the bundle (workspace packages are already inlined in dist/).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @auren/api deploy --prod --legacy /out/api

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /out/api/package.json ./package.json
COPY --from=builder --chown=node:node /out/api/node_modules ./node_modules
COPY --from=builder --chown=node:node /repo/apps/api/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "--enable-source-maps", "dist/server.js"]
