# DogWalk - Project Guide

## What is this?

Social app for dog owners to find compatible walking companions through behavioral matching, geolocation, and secure chat.

## Monorepo Structure

```
apps/
  api/        → Hono on Node.js (deploys to Fly.io, Frankfurt)
  web/        → Astro landing page (SSG, deploys to Cloudflare Pages)
  admin/      → Next.js 16 backoffice + shadcn/ui (deploys to Cloudflare Pages)
  mobile/     → Expo SDK 55 + Expo Router + NativeWind

packages/
  types/      → Shared TypeScript interfaces
  validation/ → Zod schemas (shared across all apps)
  utils/      → Matching algorithm, geo, formatters
  db/         → Drizzle ORM schema (Neon PostgreSQL + PostGIS)
  config/     → App constants and limits
  api-client/ → tRPC client
  ui/         → Shared React Native components

tooling/
  typescript/ → Base tsconfig files
```

## Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all apps (Biome)
pnpm lint:fix         # Lint + auto-fix (Biome)
pnpm typecheck        # Type-check all apps
pnpm format           # Format all files (Biome)
pnpm format:check     # Check formatting (Biome)
```

## Tech Stack

- **Runtime**: Node.js 22, pnpm 10, Turborepo
- **API**: Hono + tRPC, JWT auth (jose), WebSocket for chat
- **Database**: Neon PostgreSQL + PostGIS, Drizzle ORM
- **Cache/Queue**: Upstash Redis, BullMQ
- **Storage**: Cloudflare R2 (S3-compatible)
- **Email**: Resend
- **Push**: Expo Push Notifications
- **Monitoring**: Sentry
- **CI/CD**: GitHub Actions

## Conventions

- Language: TypeScript everywhere, strict mode
- Imports: use `type` imports for type-only (`import type { ... }`)
- Linting & Formatting: Biome (semi, singleQuote, trailingComma: all, lineWidth: 100)
- Module resolution: bundler
- App content/UI text: Italian (it-IT)
- Code/comments/docs: English

## Key Design Decisions (see docs/ for details)

- Fly.io for API (not serverless/Workers) — real Node.js server for WebSocket, BullMQ, long-running processes
- Astro for landing (SSG, SEO) — NOT Next.js, keeps it simple and fast
- Next.js + shadcn/ui for admin — NOT Refine/Ant Design, same React ecosystem
- Matching algorithm: weighted scoring (size 25%, energy 25%, behavior 20%, walk prefs 15%, distance 10%, leash 5%)

## Git

- No `Co-Authored-By` lines in commits
- Commit messages in English, conventional commits style

## Documentation

Full project docs in `docs/` (11 files, 15K+ lines):
- 01: Market & user analysis
- 02: MVP specification
- 03: Architecture
- 04: Budget breakdown
- 05: Roadmap & task plan
- 06: UX/UI design system
- 07: Web architecture
- 08: Backoffice architecture
- 09: Consolidated architecture (SINGLE SOURCE OF TRUTH)
- 10: Architecture debate (Workers vs Server)
- 11: Backoffice debate (Refine vs Next.js)
