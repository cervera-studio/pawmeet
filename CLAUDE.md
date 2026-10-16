# PawMeet - Project Guide

## What is this?

Social app for dog owners to find compatible walking companions through behavioral matching, geolocation, and secure chat.

## Monorepo Structure

```
apps/
  api/        → Hono on Node.js (deploys to Azure Container Apps, West Europe)
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

## Architecture Principles

- **Clean Architecture**: separate domain logic from infrastructure. Layers: domain (entities, value objects) → use cases (application logic) → adapters (API routes, DB repositories, external services). Dependencies point inward only.
- **Repository pattern on frontend**: hooks/view-models never call tRPC/REST directly. All data access goes through repository interfaces (`WalkRepository`, `DogRepository`, etc.) injected via React Context. Implementations live in `repositories/remote/` (tRPC), `repositories/local/` (SQLite), `repositories/composite/` (offline-first). This enables offline-first, testability, and transport independence.
- **Offline-first (mobile)**: SQLite (`expo-sqlite`) for structured data persistence, sync queue for pending mutations, MMKV only for config/preferences. See docs/03 section 5.5.
- **SOLID principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion. Every module, class, and function should have one reason to change.
- **Const objects over enums**: use `as const` objects + derived union types instead of TypeScript `enum` (see `apps/admin/src/lib/auth.ts` for reference pattern)

## Testing

- **Vitest** for all unit and integration tests (api, web, admin, shared packages)
- **Jest** only for mobile (Expo's default runner)
- Shared config in `tooling/vitest/` — extend with `node` (backend/packages) or `react` (web/admin)
- Test files: colocated as `*.test.ts` / `*.test.tsx` next to source
- **Builder pattern** for test data: use builder functions to construct test objects instead of raw literals. Keeps tests readable, avoids duplication, and makes defaults explicit.
- Run: `pnpm test` (all), `pnpm --filter @pawmeet/api test` (single package)

## Conventions

- Language: TypeScript everywhere, strict mode
- Imports: use `type` imports for type-only (`import type { ... }`)
- Linting & Formatting: Biome (semi, singleQuote, trailingComma: all, lineWidth: 100)
- Module resolution: bundler
- App content/UI text: Italian (it-IT)
- Code/comments/docs: English

## Error Handling

- **Backend (use cases)**: every use case returns `Result<T>` (either `succeed(data)` or `fail(new AppError(code, message, httpStatus))`). Never throw from use cases — exceptions are only for truly unexpected errors.
- **Backend (domain)**: domain services and aggregates are pure logic. State machine violations throw `TRPCError` with `PRECONDITION_FAILED`.
- **Backend (routers)**: tRPC routers call `unwrapResult()` to convert `Result<T>` into tRPC responses. Errors become `TRPCError` automatically.
- **Admin (frontend)**: centralized error handling via `lib/error-handler.ts` + `hooks/use-error-handler.ts`. Toast notifications for data-fetch errors, inline field errors for form validation. Never use `console.error` for user-facing failures.
- **Error codes**: use SCREAMING_SNAKE_CASE constants (e.g. `DOG_NOT_FOUND`, `ORG_NOT_AUTHORIZED`). Keep codes specific enough to differentiate error types in the same use case.

## Domain Layer

- **Value Objects** (`packages/validation/src/value-objects.ts`): Zod branded types — `Email`, `Coordinates`, `CompatibilityScore`, `MatchWeights`. Use `parseX()` / `safeParseX()` helpers at system boundaries.
- **Aggregates** (`apps/api/src/domain/`): `GroupEventAggregate`, `DogProfileAggregate` — encapsulate business rules as pure functions. Use cases orchestrate persistence and side effects.
- **Domain Services** (`apps/api/src/domain/`): `MatchingAlgorithm` (injectable compatibility scoring), `OrganizationAuthorizer` (role-based access).
- **State Machine**: `group-event-state-machine.ts` — explicit transition map for event lifecycle.

## Analytics

Every new feature/issue MUST consider analytics tracking:

1. **Identify events**: which user actions are worth tracking? Check `AnalyticsEventMap` in `packages/types/src/analytics.ts`
2. **Classify source**: is the event client-exclusive (view durations, UI interactions) or server-authoritative (confirmed actions like match_created, message_sent)?
3. **Server-authoritative**: track at tRPC router level AFTER `unwrapResult()` using `trackEvent()` helper from `apps/api/src/lib/track-event.ts`. Do NOT track inside use-cases (keeps domain layer pure).
4. **Client-exclusive**: track via `AnalyticsService.track()` resolved from DI (`ANALYTICS_SERVICE` token)
5. **Add to taxonomy**: if the event doesn't exist yet, add it to `AnalyticsEventMap` + update `docs/13-analytics-strategy.md` Section 2
6. **PII rules**: NEVER include email, display name, GPS coordinates, chat content, dog name, photos, push tokens in event properties

## Key Design Decisions (see docs/ for details)

- Azure Container Apps for API (not serverless/Workers) — real Node.js server for WebSocket, BullMQ, long-running processes. Infra managed via Terraform in `infra/`
- Astro for landing (SSG, SEO) — NOT Next.js, keeps it simple and fast
- Next.js + shadcn/ui for admin — NOT Refine/Ant Design, same React ecosystem
- Matching algorithm: weighted scoring (size 25%, energy 25%, behavior 20%, walk prefs 15%, distance 10%, leash 5%)

## Git

- No `Co-Authored-By` lines in commits
- Commit messages in English, conventional commits style
- **Lefthook** git hooks:
  - `pre-commit`: Biome lint+format (staged files) + typecheck
  - `pre-push`: test

## Documentation

Full project docs in `docs/`:
- 02: MVP specification
- 03: Architecture
- 06: UX/UI design system
- 07: Web architecture
- 08: Backoffice architecture
- 09: Consolidated architecture (SINGLE SOURCE OF TRUTH)
- 10: Architecture debate (Workers vs Server)
- 11: Backoffice debate (Refine vs Next.js)
