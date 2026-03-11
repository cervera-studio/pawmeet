# DogWalk - Project Summary

## Vision

DogWalk è una social app per proprietari di cani che vogliono trovare compagni di passeggiata compatibili. A differenza dei gruppi Facebook o delle app generiche, DogWalk garantisce **compatibilità verificata** tra cani prima del primo incontro, grazie a un algoritmo di matching basato su taglia, energia, comportamento e prossimità geografica.

Il mercato italiano conta ~8,8 milioni di cani domestici. L'obiettivo è diventare la piattaforma di riferimento in Italia per la socializzazione tra proprietari, con espansione europea successiva.

**Target**: 50.000 utenti attivi mensili entro 12 mesi dal lancio, conversione freemium→premium del 5-8%.

## Core Features

- **Profilo cane** — taglia, energia, temperamento, socializzazione, preferenze di passeggiata
- **Matching algoritmico** — scoring pesato (taglia 25%, energia 25%, comportamento 20%, preferenze 15%, distanza 10%, guinzaglio 5%)
- **Geolocalizzazione** — scopri cani compatibili nella tua zona in tempo reale
- **Chat sicura** — WebSocket, attivabile solo per mutuo interesse (stile match)
- **GPS tracking** — tracciamento passeggiate, statistiche attività
- **Eventi di gruppo** — organizza passeggiate collettive
- **Gamification** — badge, achievement, livelli

## Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| **Mobile** | Expo SDK 55, React Native, Expo Router, NativeWind |
| **API** | Hono + tRPC su Node.js 22 (Fly.io, Frankfurt) |
| **Database** | Neon PostgreSQL + PostGIS, Drizzle ORM |
| **Cache/Queue** | Upstash Redis, BullMQ |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Landing** | Astro (SSG, Cloudflare Pages) |
| **Backoffice** | Next.js 16 + shadcn/ui (Cloudflare Pages) |
| **Auth** | JWT (jose) |
| **Monorepo** | pnpm 10, Turborepo |
| **CI/CD** | GitHub Actions, Lefthook |
| **Monitoring** | Sentry |
| **Linting** | Biome |
| **Testing** | Vitest (API/web/packages), Jest (mobile) |

Architettura: **Clean Architecture** (domain → use cases → adapters), repository pattern, offline-first su mobile (SQLite + sync queue), SOLID.

## Roadmap

| Fase | Durata | Contenuto | Stato |
|------|--------|-----------|-------|
| **Fase 1 — MVP** | Sprint 0-6 | Setup infra, auth, profilo cane, matching, chat, geolocalizzazione | ✅ Completata |
| **Fase 2 — Secondary** | Sprint 7-8 | Filtri avanzati, notifiche push, multi-cane, calendario condiviso | ✅ Completata |
| **Fase 3 — Nice-to-have** | Sprint 9-16 | Eventi di gruppo, gamification, GPS tracking, AI matching | 🔄 In corso |
| **Prossimo** | Sprint 17+ | Feed foto/video, integrazioni fitness | 📋 Pianificato |

Sprint attuali (Fase 3): matching AI-enhanced con A/B testing completato, GPS walk tracking completato. Prossimo obiettivo: feed media.

## Monorepo Structure

```
apps/
  api/        → Hono + tRPC (Fly.io)
  mobile/     → Expo + React Native
  web/        → Astro landing (Cloudflare Pages)
  admin/      → Next.js backoffice (Cloudflare Pages)

packages/
  types/      → Shared TypeScript interfaces
  validation/ → Zod schemas
  utils/      → Matching algorithm, geo, formatters
  db/         → Drizzle ORM schema
  config/     → App constants
  api-client/ → tRPC client
  ui/         → Shared React Native components
```

## Come contribuire

```bash
node -v           # >= 22
pnpm install      # Install all dependencies
pnpm dev          # Start all apps
pnpm test         # Run tests
pnpm typecheck    # Type-check
pnpm lint         # Lint (Biome)
```

Documentazione completa in `docs/` (11 documenti, 15K+ righe). Il file `CLAUDE.md` nella root contiene tutte le convenzioni di progetto.
