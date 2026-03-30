# ── Stage 1: Base ─────────────────────────────────────────────
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate
RUN apk add --no-cache libc6-compat

# ── Stage 2: Dependencies ────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./

# Copy all package.json files to resolve workspace dependencies
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/i18n/package.json ./packages/i18n/
COPY tooling/typescript/package.json ./tooling/typescript/
COPY tooling/vitest/package.json ./tooling/vitest/

# Use hoisted node_modules to avoid pnpm symlink issues in Docker multi-stage
# --ignore-scripts: skip lefthook prepare (no git in container)
RUN echo "node-linker=hoisted" >> .npmrc && \
    pnpm install --frozen-lockfile --ignore-scripts

# Rebuild esbuild so its platform-specific binary is available for tsup
RUN pnpm rebuild esbuild

# ── Stage 3: Build ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Release version injected at build time (git SHA or tag)
ARG APP_VERSION=unknown
ENV APP_VERSION=${APP_VERSION}

# Copy installed dependencies
COPY --from=deps /app/ ./

# Copy source code for API and all workspace packages it depends on
COPY apps/api/ ./apps/api/
COPY packages/types/ ./packages/types/
COPY packages/validation/ ./packages/validation/
COPY packages/utils/ ./packages/utils/
COPY packages/config/ ./packages/config/
COPY packages/db/ ./packages/db/
COPY packages/api-client/ ./packages/api-client/
COPY packages/i18n/ ./packages/i18n/
COPY tooling/typescript/ ./tooling/typescript/

# Build the API and its dependencies via Turborepo
RUN pnpm turbo build --filter=@pawmeet/api...

# ── Stage 4: Runner ──────────────────────────────────────────
# Use Debian-based image (not Alpine) — onnxruntime-node requires glibc
FROM node:24-slim AS runner
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ARG APP_VERSION=unknown
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}

# Copy only the bundled output (tsup bundles all deps except bullmq)
COPY --from=builder /app/apps/api/dist/ ./dist/

# Install external dependencies not bundled by tsup (native/binary packages)
# Must match tsup.config.ts noExternal exclusions: bullmq, @sentry/*, @statsig/*, @opentelemetry/*
RUN echo '{"type":"module","dependencies":{"bullmq":"^5.70.0","pg":"^8.16.0","@sentry/node":"^10.43.0","@statsig/statsig-node-core":"^0.16.3","onnxruntime-node":"^1.22.0"},"pnpm":{"onlyBuiltDependencies":["onnxruntime-node","msgpackr-extract"]}}' > package.json && \
    pnpm install --prod --no-lockfile

# Run as non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs hono
USER hono

EXPOSE 3000

CMD ["dumb-init", "node", "dist/index.js"]
