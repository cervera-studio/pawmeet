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
COPY apps/admin/package.json ./apps/admin/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/i18n/package.json ./packages/i18n/
COPY tooling/typescript/package.json ./tooling/typescript/

# Use hoisted node_modules to avoid pnpm symlink issues in Docker multi-stage
# --ignore-scripts: skip lefthook prepare (no git in container)
RUN echo "node-linker=hoisted" >> .npmrc && \
    pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 3: Build ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app

ARG APP_VERSION=unknown
ENV APP_VERSION=${APP_VERSION}

# Copy installed dependencies
COPY --from=deps /app/ ./

# Copy source code for admin and all workspace packages it depends on
COPY apps/admin/ ./apps/admin/
COPY packages/types/ ./packages/types/
COPY packages/validation/ ./packages/validation/
COPY packages/utils/ ./packages/utils/
COPY packages/config/ ./packages/config/
COPY packages/api-client/ ./packages/api-client/
COPY packages/i18n/ ./packages/i18n/
COPY tooling/typescript/ ./tooling/typescript/

# Build the admin app and its dependencies via Turborepo
# Next.js standalone output produces a self-contained server
# DOCKER_BUILD=1 skips TypeScript checking (handled in CI via pnpm typecheck)
ENV DOCKER_BUILD=1
RUN pnpm turbo build --filter=@pawmeet/admin...

# ── Stage 4: Runner ──────────────────────────────────────────
FROM node:24-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ARG APP_VERSION=unknown
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy Next.js standalone output
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

CMD ["node", "apps/admin/server.js"]
