# ── Stage 1: Base ─────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate
RUN apk add --no-cache libc6-compat

# ── Stage 2: Dependencies ────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all package.json files to resolve workspace dependencies
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/api-client/package.json ./packages/api-client/
COPY tooling/typescript/package.json ./tooling/typescript/
COPY tooling/vitest/package.json ./tooling/vitest/

# Install all dependencies (frozen lockfile for reproducibility)
# --ignore-scripts: skip lefthook prepare (no git in container)
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 3: Build ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app

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
COPY tooling/typescript/ ./tooling/typescript/

# Build the API and its dependencies via Turborepo
RUN pnpm turbo build --filter=@dogwalk/api...

# ── Stage 4: Runner ──────────────────────────────────────────
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app

ENV NODE_ENV=production

# Copy only the bundled output (tsup bundles all deps except bullmq)
COPY --from=builder /app/apps/api/dist/ ./dist/

# Install external dependencies not bundled by tsup (native/binary packages)
# Must match tsup.config.ts noExternal exclusions: bullmq, @sentry/*, @statsig/*, @opentelemetry/*
RUN echo '{"type":"module","dependencies":{"bullmq":"^5.70.0","@sentry/node":"^10.43.0","@statsig/statsig-node-core":"^0.16.3"}}' > package.json && \
    pnpm install --prod --no-lockfile

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono
USER hono

EXPOSE 3000

CMD ["dumb-init", "node", "dist/index.js"]
