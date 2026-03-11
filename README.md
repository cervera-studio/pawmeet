# DogWalk

Social app for dog owners to find compatible walking companions through behavioral matching, geolocation, and secure real-time chat.

## Monorepo Structure

```
apps/
  api/        → Hono + tRPC on Node.js (Fly.io)
  mobile/     → Expo SDK 55 + Expo Router + NativeWind
  web/        → Astro landing page (Cloudflare Pages)
  admin/      → Next.js 16 backoffice + shadcn/ui (Cloudflare Pages)

packages/
  types/      → Shared TypeScript interfaces
  validation/ → Zod schemas
  utils/      → Matching algorithm, geo, formatters
  db/         → Drizzle ORM schema (Neon PostgreSQL + PostGIS)
  config/     → App constants and limits
  api-client/ → tRPC client
  ui/         → Shared React Native components
```

## Tech Stack

**Runtime** — Node.js 22, pnpm 10, Turborepo

**Backend** — Hono, tRPC, JWT (jose), WebSocket, BullMQ, Upstash Redis

**Database** — Neon PostgreSQL + PostGIS, Drizzle ORM

**Storage** — Cloudflare R2 (S3-compatible)

**Mobile** — Expo, React Native, NativeWind, SQLite (offline-first)

**Monitoring** — Sentry · **Email** — Resend · **CI/CD** — GitHub Actions

## Getting Started

```bash
pnpm install        # Install dependencies
pnpm dev            # Start all apps in dev mode
pnpm build          # Build all apps
pnpm test           # Run all tests
pnpm typecheck      # Type-check all apps
pnpm lint           # Lint (Biome)
```

## Documentation

Full project docs live in [`docs/`](./docs/) — architecture, specs, roadmap, design system, and more.

## License

Private — All rights reserved.
