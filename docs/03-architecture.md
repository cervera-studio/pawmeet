# DogWalk - Documento Architetturale

> **Versione:** 1.0
> **Data:** 9 marzo 2026
> **Autore:** Software Architecture Team
> **Stato:** Draft
> **Classificazione:** Documento interno - Confidenziale

---

## Indice

1. [Principi Architetturali](#1-principi-architetturali)
2. [Struttura del Monorepo](#2-struttura-del-monorepo)
3. [Tech Stack Dettagliato](#3-tech-stack-dettagliato)
4. [Architettura Backend](#4-architettura-backend)
5. [Architettura Frontend](#5-architettura-frontend)
6. [Shared Packages](#6-shared-packages)
7. [Database Schema](#7-database-schema)
8. [API Design](#8-api-design)
9. [Real-time Architecture](#9-real-time-architecture)
10. [Security Architecture](#10-security-architecture)
11. [Infrastructure e Deployment](#11-infrastructure-e-deployment)
12. [Diagrammi C4](#12-diagrammi-c4)
13. [Architecture Decision Records (ADR)](#13-architecture-decision-records-adr)
14. [Appendice - Configurazioni](#14-appendice---configurazioni)

---

## 1. Principi Architetturali

Ogni decisione di design in questo progetto deve rispettare i seguenti principi, in ordine di priorita:

| # | Principio | Descrizione |
|---|-----------|-------------|
| 1 | **Ship fast, refactor later** | L'MVP deve essere in produzione entro 12 settimane. Scegliere soluzioni semplici e collaudate. |
| 2 | **Monorepo, not microservices** | Un singolo deploy backend monolitico modulare. I microservizi arrivano solo quando servono (>50K MAU). |
| 3 | **Type safety end-to-end** | TypeScript ovunque. Tipi condivisi tra frontend e backend. Validazione runtime con Zod. |
| 4 | **Privacy by design** | GDPR compliance non e' un afterthought. Ogni feature che tocca dati personali deve avere privacy built-in. |
| 5 | **Offline-first mindset** | L'app deve funzionare in condizioni di rete degradate. Swipe, profili e messaggi in coda locale. |
| 6 | **Convention over configuration** | Naming coerente, struttura cartelle prevedibile, pattern ripetibili. |

---

## 2. Struttura del Monorepo

### 2.1 Directory Tree

```
dogwalk/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Lint, type-check, test su ogni PR
│   │   ├── preview.yml               # Deploy preview per PR (EAS Update)
│   │   ├── deploy-staging.yml        # Deploy staging su merge in develop
│   │   └── deploy-production.yml     # Deploy production su merge in main
│   ├── CODEOWNERS
│   └── pull_request_template.md
│
├── apps/
│   ├── mobile/                       # Expo (React Native) app
│   │   ├── app/                      # Expo Router - file-based routing
│   │   │   ├── (auth)/               # Route group: schermate auth
│   │   │   │   ├── login.tsx
│   │   │   │   ├── register.tsx
│   │   │   │   └── forgot-password.tsx
│   │   │   ├── (onboarding)/         # Route group: onboarding flow
│   │   │   │   ├── welcome.tsx
│   │   │   │   ├── owner-profile.tsx
│   │   │   │   ├── dog-basics.tsx
│   │   │   │   ├── dog-physical.tsx
│   │   │   │   ├── dog-behavior.tsx
│   │   │   │   ├── dog-photos.tsx
│   │   │   │   └── permissions.tsx
│   │   │   ├── (tabs)/              # Route group: tab navigation principale
│   │   │   │   ├── _layout.tsx       # Tab layout con bottom nav
│   │   │   │   ├── discover/         # Tab: Swipe/Discovery feed
│   │   │   │   │   ├── index.tsx     # Feed swipe cards
│   │   │   │   │   └── [dogId].tsx   # Profilo cane espanso
│   │   │   │   ├── matches/          # Tab: Lista match
│   │   │   │   │   ├── index.tsx     # Lista match attivi
│   │   │   │   │   └── [matchId].tsx # Chat con match
│   │   │   │   ├── map/              # Tab: Mappa (COULD HAVE)
│   │   │   │   │   └── index.tsx
│   │   │   │   └── profile/          # Tab: Profilo utente
│   │   │   │       ├── index.tsx     # Il mio profilo
│   │   │   │       ├── dogs/
│   │   │   │       │   ├── [dogId]/
│   │   │   │       │   │   └── edit.tsx
│   │   │   │       │   └── new.tsx
│   │   │   │       ├── settings.tsx
│   │   │   │       └── privacy.tsx
│   │   │   ├── _layout.tsx           # Root layout (providers, auth guard)
│   │   │   └── +not-found.tsx
│   │   ├── assets/                   # Immagini, font, animazioni Lottie
│   │   │   ├── images/
│   │   │   ├── fonts/
│   │   │   └── animations/
│   │   ├── components/               # Componenti specifici dell'app
│   │   │   ├── cards/
│   │   │   │   ├── SwipeCard.tsx
│   │   │   │   └── MatchCard.tsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatBubble.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── TypingIndicator.tsx
│   │   │   ├── dog/
│   │   │   │   ├── DogProfileForm.tsx
│   │   │   │   ├── BehaviorSelector.tsx
│   │   │   │   └── CompatibilityBadge.tsx
│   │   │   ├── map/
│   │   │   │   ├── DogMapMarker.tsx
│   │   │   │   └── RadiusOverlay.tsx
│   │   │   └── onboarding/
│   │   │       ├── StepIndicator.tsx
│   │   │       └── WelcomeSlide.tsx
│   │   ├── hooks/                    # Custom hooks specifici dell'app
│   │   │   ├── useLocation.ts
│   │   │   ├── useSwipe.ts
│   │   │   ├── useChat.ts
│   │   │   └── useNotifications.ts
│   │   ├── services/                 # Servizi API e integrazioni
│   │   │   ├── api.ts                # Client tRPC configurato
│   │   │   ├── storage.ts            # AsyncStorage / SecureStore wrapper
│   │   │   ├── location.ts           # Expo Location wrapper
│   │   │   └── notifications.ts      # Expo Notifications wrapper
│   │   ├── stores/                   # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── dogStore.ts
│   │   │   ├── matchStore.ts
│   │   │   ├── chatStore.ts
│   │   │   └── locationStore.ts
│   │   ├── styles/                   # Theme e stili globali
│   │   │   ├── theme.ts
│   │   │   ├── colors.ts
│   │   │   └── typography.ts
│   │   ├── app.json                  # Expo config
│   │   ├── eas.json                  # EAS Build config
│   │   ├── babel.config.js
│   │   ├── metro.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── web/                              # Astro (marketing) + React SPA (web app fase 2)
│   │   ├── astro.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── wrangler.toml
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── astro/                # Componenti Astro (zero JS)
│   │   │   │   └── react/                # React islands interattivi
│   │   │   ├── content/
│   │   │   │   ├── config.ts
│   │   │   │   ├── blog/
│   │   │   │   └── legal/
│   │   │   ├── i18n/
│   │   │   ├── layouts/
│   │   │   ├── pages/
│   │   │   │   ├── index.astro           # Landing page
│   │   │   │   ├── blog/
│   │   │   │   ├── legal/
│   │   │   │   ├── waitlist.astro
│   │   │   │   ├── dog/[id].astro        # Profilo condivisibile (SSR)
│   │   │   │   └── app/[...path].astro   # SPA catch-all (fase 2)
│   │   │   ├── spa/                      # React SPA (fase 2)
│   │   │   │   ├── App.tsx
│   │   │   │   ├── router.tsx
│   │   │   │   ├── routes/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── stores/
│   │   │   └── styles/
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── admin/                            # Next.js + shadcn/ui su Cloudflare Pages
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   ├── config/
│   │   │   ├── providers/
│   │   │   │   ├── auth-provider.ts
│   │   │   │   ├── data-provider.ts       # Data provider custom per API Hono/tRPC
│   │   │   │   ├── access-control-provider.ts
│   │   │   │   └── live-provider.ts       # WebSocket nativo su Fly.io
│   │   │   ├── modules/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── moderation/
│   │   │   │   ├── users/
│   │   │   │   ├── dogs/
│   │   │   │   ├── analytics/
│   │   │   │   ├── content/
│   │   │   │   ├── system/
│   │   │   │   └── admin-management/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   └── styles/
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                              # Hono su Node.js (Fly.io)
│       ├── src/
│       │   ├── index.ts                  # Entry point: Hono app + tRPC adapter
│       │   ├── config/
│       │   │   └── env.ts                # Validazione env con Zod
│       │   ├── trpc/
│       │   │   ├── index.ts          # tRPC init, context, middleware
│       │   │   ├── router.ts         # Root router (merge di tutti i router)
│       │   │   └── middleware/
│       │   │       ├── auth.ts           # JWT verification middleware
│       │   │       ├── rateLimit.ts      # Rate limiting (Upstash Redis-based)
│       │   │       └── logging.ts        # Request logging
│       │   ├── modules/              # Moduli di dominio
│       │   │   ├── auth/
│       │   │   │   ├── auth.router.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.schema.ts    # Zod schemas per input/output
│       │   │   │   └── providers/
│       │   │   │       ├── email.ts
│       │   │   │       ├── google.ts
│       │   │   │       └── apple.ts
│       │   │   ├── user/
│       │   │   │   ├── user.router.ts
│       │   │   │   ├── user.service.ts
│       │   │   │   └── user.schema.ts
│       │   │   ├── dog/
│       │   │   │   ├── dog.router.ts
│       │   │   │   ├── dog.service.ts
│       │   │   │   └── dog.schema.ts
│       │   │   ├── matching/
│       │   │   │   ├── matching.router.ts
│       │   │   │   ├── matching.service.ts
│       │   │   │   ├── matching.schema.ts
│       │   │   │   └── algorithm/
│       │   │   │       ├── compatibility.ts  # Matrici di compatibilita
│       │   │   │       ├── scoring.ts        # Calcolo punteggio
│       │   │   │       └── filters.ts        # Filtri pre-matching
│       │   │   ├── chat/
│       │   │   │   ├── chat.router.ts
│       │   │   │   ├── chat.service.ts
│       │   │   │   ├── chat.schema.ts
│       │   │   │   └── chat.ws.ts            # WebSocket nativo per chat room
│       │   │   ├── notification/
│       │   │   │   ├── notification.router.ts
│       │   │   │   ├── notification.service.ts
│       │   │   │   └── notification.schema.ts
│       │   │   ├── upload/
│       │   │   │   ├── upload.router.ts
│       │   │   │   ├── upload.service.ts
│       │   │   │   └── upload.schema.ts
│       │   │   ├── admin/                # Endpoint admin (protetti RBAC)
│       │   │   └── moderation/
│       │   │       ├── moderation.service.ts
│       │   │       └── content-filter.ts
│       │   ├── jobs/                     # Worker BullMQ su Upstash Redis
│       │   │   ├── photo-moderation.ts
│       │   │   ├── push-notification.ts
│       │   │   ├── email.ts
│       │   │   └── cleanup.ts
│       │   └── utils/
│       │       ├── geo.ts                # PostGIS helpers
│       │       ├── jwt.ts                # JWT sign/verify
│       │       ├── redis.ts              # Upstash Redis client
│       │       └── errors.ts             # Error classes personalizzate
│       ├── Dockerfile                    # Docker build per Fly.io
│       ├── fly.toml                      # Configurazione Fly.io (multi-region)
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── types/                            # @dogwalk/types
│   │   ├── src/
│   │   │   ├── user.ts
│   │   │   ├── dog.ts
│   │   │   ├── match.ts
│   │   │   ├── chat.ts
│   │   │   ├── notification.ts
│   │   │   ├── geo.ts
│   │   │   ├── admin.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── validation/                       # @dogwalk/validation (Zod schemas)
│   │   ├── src/
│   │   │   ├── user.ts
│   │   │   ├── dog.ts
│   │   │   ├── auth.ts
│   │   │   ├── chat.ts
│   │   │   ├── matching.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── utils/                            # @dogwalk/utils
│   │   ├── src/
│   │   │   ├── formatting.ts
│   │   │   ├── geo.ts                    # Haversine, formattazione distanze
│   │   │   ├── compatibility.ts          # Calcolo punteggio lato client (preview)
│   │   │   ├── date.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                               # @dogwalk/ui (componenti condivisi mobile)
│   │   ├── src/
│   │   │   ├── primitives/               # Button, Text, Input, Avatar, Badge, Card...
│   │   │   ├── composites/               # DogCard, MatchListItem, PhotoGallery...
│   │   │   ├── icons/
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── api-client/                       # @dogwalk/api-client (tRPC client)
│   │   ├── src/
│   │   │   ├── index.ts                  # createApiClient() con tRPC
│   │   │   ├── react.ts                  # React hooks (useQuery wrappers)
│   │   │   └── types.ts                  # Re-export tipi inferiti dalle route
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── db/                               # @dogwalk/db (Drizzle schema + migrations)
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── users.ts
│   │   │   │   ├── dogs.ts
│   │   │   │   ├── dogPhotos.ts
│   │   │   │   ├── matches.ts
│   │   │   │   ├── swipes.ts
│   │   │   │   ├── messages.ts
│   │   │   │   ├── reports.ts
│   │   │   │   ├── blocks.ts
│   │   │   │   ├── pushTokens.ts
│   │   │   │   ├── adminUsers.ts
│   │   │   │   └── index.ts
│   │   │   ├── client.ts                 # Drizzle client factory (Neon serverless driver)
│   │   │   └── index.ts
│   │   ├── drizzle/
│   │   │   └── migrations/
│   │   ├── seed/
│   │   │   ├── dev.ts
│   │   │   └── breeds.ts
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── config/                           # @dogwalk/config
│       ├── src/
│       │   ├── constants.ts              # Costanti condivise (limiti, rate limits)
│       │   ├── enums.ts                  # Enum condivisi (size, energy, behavior)
│       │   ├── matching.ts               # Matrici di compatibilita e pesi
│       │   ├── breeds.ts                 # Lista razze FCI
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── tooling/
│   ├── eslint/
│   │   ├── base.js
│   │   ├── react.js
│   │   ├── react-native.js
│   │   └── package.json
│   ├── typescript/                   # tsconfig base condiviso
│   │   ├── base.json
│   │   ├── react-native.json
│   │   ├── node.json
│   │   └── react.json
│   └── prettier/
│       ├── index.js
│       └── package.json
│
├── docker/
│   └── docker-compose.yml               # Solo PostgreSQL + PostGIS (dev locale)
│
├── turbo.json                        # Turborepo pipeline config
├── pnpm-workspace.yaml               # pnpm workspace config
├── package.json                      # Root package.json
├── .env.example                      # Template variabili d'ambiente
├── .gitignore
├── .nvmrc                            # Node.js version pinning
└── README.md
```

### 2.2 Workspace Configuration

**`pnpm-workspace.yaml`:**

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tooling/*"
```

**`turbo.json`:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".expo/**", ".astro/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "db:push": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

---

## 3. Tech Stack Dettagliato

### 3.1 Runtime e Tooling

| Tecnologia | Versione | Ruolo | Giustificazione |
|-----------|----------|-------|-----------------|
| **Node.js** | 20 LTS | Runtime per build e tooling | LTS stabile, richiesto da Expo e Turborepo |
| **TypeScript** | ~5.4 | Linguaggio su tutto lo stack | Type safety end-to-end |
| **pnpm** | >=9.0 | Package manager | Workspace-native, efficiente su disco |
| **Turborepo** | >=2.0 | Build system e task orchestration | Caching remoto, task parallelizzati |

### 3.2 Frontend Mobile

| Tecnologia | Versione | Ruolo |
|------------|----------|-------|
| **Expo** | SDK 52 | Framework React Native gestito |
| **Expo Router** | v4 | File-based routing |
| **React Native** | 0.76.x (via Expo) | UI framework mobile |
| **Zustand** | ~5.0 | State management (leggero, TS-first) |
| **TanStack Query** | ~5.x | Server state, caching, sync |
| **React Native Reanimated** | ~3.x | Animazioni fluide (swipe gestures) |
| **React Native Gesture Handler** | ~2.x | Gesture recognition (swipe cards) |
| **React Native Maps** | ~1.x | Mappa nativa (Google/Apple Maps) |
| **Expo Location** | ~17.x | Geolocalizzazione |
| **Expo Notifications** | ~0.29.x | Push notifications |
| **Expo Image** | ~2.x | Image loading ottimizzato |
| **Expo SecureStore** | ~14.x | Storage sicuro per token |
| **React Native MMKV** | ~3.x | Storage locale ad alte prestazioni |
| **date-fns** | ~4.x | Manipolazione date |
| **Lucide React Native** | ~0.4x | Icon set |
| **Nativewind** | ~4.x | Tailwind CSS per React Native |

### 3.3 Backend (Hono su Node.js / Fly.io)

| Tecnologia | Versione | Ruolo | Giustificazione |
|-----------|----------|-------|-----------------|
| **Hono** | ~4.x | HTTP framework | Leggero (14KB), middleware ricco, multi-runtime (Node.js, edge) |
| **tRPC** | ~11.x | Type-safe API layer | End-to-end type safety, subscriptions |
| **Drizzle ORM** | ~0.35.x | ORM type-safe | SQL-first, leggero, edge-compatible |
| **@neondatabase/serverless** | latest | PostgreSQL driver | HTTP/WebSocket, edge-compatible |
| **Zod** | ~3.23 | Validazione runtime | Condiviso con frontend |
| **bcrypt** | latest | Password hashing | Nativo su Node.js, ottimale per Fly.io |
| **jose** | ~5.x | JWT sign/verify | Standard Web Crypto API |
| **drizzle-zod** | ~0.5.x | Generazione Zod schema da Drizzle | Riduce duplicazione tipi |
| **@aws-sdk/client-s3** | ~3.x | Upload R2 (S3-compatible) | R2 espone interfaccia S3-compatible |
| **@upstash/redis** | latest | Client Redis serverless | Cache, sessioni, rate limiting |
| **bullmq** | ~5.x | Job queue asincroni | Moderazione foto, email, push, cleanup |
| **ws** | ~8.x | WebSocket server nativo | Chat real-time su Fly.io |
| **resend** | latest | Email transazionali | API HTTP |
| **expo-server-sdk** | ~3.x | Invio push notification | API Expo Push ufficiale |

### 3.4 Database e Storage

| Tecnologia | Ruolo | Giustificazione |
|-----------|-------|-----------------|
| **PostgreSQL 16 (Neon)** | Database relazionale primario | Serverless, auto-scaling, branching per PR, edge-compatible |
| **PostGIS 3.4** | Estensione geospaziale | Query ST_DWithin per matching geografico |
| **Cloudflare R2** | Object storage (foto cani) | S3-compatible, zero egress fee |
| **Upstash Redis** | Cache, sessioni, rate limiting | Serverless, edge-compatible, free tier poi $10/mese pro |
| **BullMQ** | Job asincroni | Moderazione foto, email, push, cleanup (su Upstash Redis) |

### 3.5 Testing

| Tecnologia | Ruolo |
|-----------|-------|
| **Vitest** | Unit + integration backend e web |
| **Jest** | Test runner mobile (via Expo) |
| **React Native Testing Library** | Component testing mobile |
| **Playwright** | E2E testing web |
| **MSW** | API mocking |

### 3.6 Servizi Esterni

| Servizio | Ruolo | Giustificazione |
|---------|-------|-----------------|
| **Resend** | Email transazionali | API HTTP, edge-compatible, free tier 100/day |
| **Mapbox** | Mappe (mobile + web) | Pricing competitivo, SDK performante |
| **Cloudflare Turnstile** | Anti-bot per form web | Gratuito, privacy-first, nativo CF |

### 3.7 DevOps e Quality

| Tecnologia | Ruolo |
|-----------|-------|
| **GitHub Actions** | CI/CD |
| **EAS Build** | Build cloud per Expo (iOS + Android) |
| **EAS Update** | OTA updates |
| **Sentry** | Error tracking e performance |
| **Cloudflare Analytics** | Web analytics |
| **ESLint** (flat config) | Linting |
| **Prettier** | Code formatting |
| **Husky + lint-staged** | Pre-commit hooks |
| **Commitlint** | Conventional commits |

---

## 4. Architettura Backend

### 4.1 Modello Architetturale: Modular Monolith

Il backend segue un pattern **monolite modulare** -- un singolo deployment su Fly.io (Node.js) con separazione logica netta tra moduli di dominio. Questa scelta bilancia semplicita operativa e separazione delle responsabilita.

```
┌─────────────────────────────────────────────────────────────┐
│                  Hono HTTP Framework                          │
│              (Node.js su Fly.io, multi-region)               │
├─────────────────────────────────────────────────────────────┤
│                     tRPC Router Layer                         │
│  ┌──────────┬──────────┬──────────┬──────────┬────────────┐ │
│  │   Auth   │   User   │   Dog    │ Matching │    Chat    │ │
│  │  Router  │  Router  │  Router  │  Router  │   Router   │ │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴─────┬──────┘ │
│       │          │          │          │            │         │
│  ┌────▼─────┬────▼─────┬────▼─────┬────▼──────┬────▼──────┐ │
│  │   Auth   │   User   │   Dog    │ Matching  │   Chat    │ │
│  │ Service  │ Service  │ Service  │ Service   │  Service  │ │
│  └────┬─────┴────┬─────┴────┬─────┴────┬──────┴────┬──────┘ │
│       │          │          │          │            │         │
│  ┌────▼──────────▼──────────▼──────────▼────────────▼──────┐ │
│  │                   Drizzle ORM Layer                      │ │
│  │              (Neon PostgreSQL + PostGIS)                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────┐  ┌────────────┐  ┌───────────────────┐    │
│  │Upstash Redis │  │  BullMQ    │  │  Cloudflare R2    │    │
│  │ (cache/sess.) │  │ (async jobs│  │  (foto storage)   │    │
│  └──────────────┘  └────────────┘  └───────────────────┘    │
│                                                              │
│  ┌──────────────┐                                            │
│  │ WebSocket    │                                            │
│  │ nativo (ws)  │                                            │
│  │ (chat WS)    │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Moduli di Dominio

#### Auth Module

| Responsabilita | Dettaglio |
|----------------|----------|
| Registrazione | Email+password, Google OAuth, Apple Sign-In |
| Login | Emissione JWT (access + refresh token) |
| Token refresh | Rotazione refresh token |
| Password reset | Flow con OTP via email |
| Email verification | Codice OTP a 6 cifre, scadenza 15 minuti |

#### User Module

| Responsabilita | Dettaglio |
|----------------|----------|
| Profilo utente | CRUD profilo proprietario |
| Impostazioni | Privacy, notifiche, raggio di ricerca |
| Posizione | Aggiornamento coordinate (con offset privacy +/- 200m) |
| Account deletion | Soft delete + job di pulizia dati a 30 giorni |
| Blocco utenti | Blocco/sblocco bilaterale |

#### Dog Module

| Responsabilita | Dettaglio |
|----------------|----------|
| Profilo cane | CRUD profilo con validazione completa |
| Foto | Upload (presigned URL R2), ordinamento, moderazione asincrona |
| Razze | Lista razze FCI con ricerca fuzzy |
| Validazione | Coerenza peso/taglia, limiti eta/energia |

#### Matching Module

| Responsabilita | Dettaglio |
|----------------|----------|
| Feed di scoperta | Generazione coda suggerimenti ordinata per score |
| Swipe | Registrazione like/pass con deduplicazione |
| Match | Creazione match reciproco, notifica |
| Algoritmo | Calcolo punteggio di compatibilita (0-100) |
| Unmatch | Rimozione match, archiviazione chat |

#### Chat Module

| Responsabilita | Dettaglio |
|----------------|----------|
| Messaggi | Invio/ricezione testo e immagini |
| WebSocket | Connessione real-time per messaggi e typing |
| Stato | Gestione sent/delivered/read |
| Moderazione | Filtro contenuti nelle prime interazioni |
| Rate limiting | Max 30 msg/min per utente |

#### Notification Module

| Responsabilita | Dettaglio |
|----------------|----------|
| Push tokens | Registrazione/aggiornamento Expo push tokens |
| Invio | Dispatch push via Expo Push API (con fallback FCM/APNs) |
| Quiet hours | Rispetto finestra 22:00-08:00 |
| Deduplicazione | Bundling notifiche dello stesso tipo entro 5 min |

#### Upload Module

| Responsabilita | Dettaglio |
|----------------|----------|
| Presigned URL | Generazione URL per upload diretto a R2 |
| Validazione | Tipo file, dimensione, dimensioni immagine |
| Processing | Resize on-the-fly via Cloudflare Images (transform via URL) |

#### Moderation Module

| Responsabilita | Dettaglio |
|----------------|----------|
| Foto | Scansione contenuti NSFW (servizio esterno o Hive Moderation API, job asincrono via BullMQ) |
| Testo | Filtro parole chiave, link, numeri telefono |
| Segnalazioni | Gestione report utente, escalation |

### 4.3 Dependency Injection e Context

Il context tRPC viene creato per ogni request e contiene:

```typescript
// apps/api/src/trpc/index.ts

type Context = {
  db: DrizzleDatabase;         // Connessione database (Neon serverless)
  redis: Redis;                // Upstash Redis client (cache, sessioni, rate limiting)
  user: JwtPayload | null;     // Utente autenticato (o null)
  requestId: string;           // ID univoco per tracing
};
```

### 4.4 Middleware Stack

```
Request
  │
  ├─▶ Rate Limiter (Upstash Redis-based, per IP e per user)
  │
  ├─▶ Request Logging (structured logs)
  │
  ├─▶ Auth Middleware (JWT verification, opzionale per endpoint pubblici)
  │
  ├─▶ Input Validation (Zod schema, gestito da tRPC)
  │
  ├─▶ Handler (business logic nel service)
  │
  ├─▶ Error Handler (mapping a TRPCError con codici HTTP standard)
  │
  └─▶ Response
```

### 4.5 Background Jobs (BullMQ su Upstash Redis)

| Job | Trigger | Queue | Retry |
|-----|---------|-------|-------|
| `photo:moderate` | Upload foto completato | `photo-moderation` | 2 tentativi |
| `push:send` | Evento (match, messaggio, etc.) | `push-notification` | 3 tentativi |
| `email:send` | Registrazione, reset password | `email` | 3 tentativi |
| `cleanup:stale` | BullMQ repeatable job (03:00 CET) | `cleanup` | 1 tentativo |

> **Nota:** Il resize delle foto non richiede un job asincrono: viene gestito on-the-fly da Cloudflare Images (transform via URL). BullMQ gira sullo stesso processo Node.js dell'API su Fly.io, con Upstash Redis come backend. I repeatable jobs di BullMQ sostituiscono i cron per le operazioni di pulizia.

---

## 5. Architettura Frontend

### 5.1 Navigation Architecture (Expo Router)

```
Root Layout (_layout.tsx)
├── Auth Guard (redirect se non autenticato)
├── Provider Stack:
│   ├── TRPCProvider (client tRPC + TanStack Query)
│   ├── ThemeProvider (Nativewind)
│   ├── NotificationProvider
│   └── LocationProvider
│
├── (auth)/ ──── Layout senza tab
│   ├── login
│   ├── register
│   └── forgot-password
│
├── (onboarding)/ ──── Layout step-by-step
│   ├── welcome
│   ├── owner-profile
│   ├── dog-basics
│   ├── dog-physical
│   ├── dog-behavior
│   ├── dog-photos
│   └── permissions
│
└── (tabs)/ ──── Layout con bottom tab bar
    ├── discover/
    │   ├── index (feed swipe)
    │   └── [dogId] (profilo espanso → modal)
    ├── matches/
    │   ├── index (lista match)
    │   └── [matchId] (chat screen)
    ├── map/
    │   └── index (mappa cani nelle vicinanze)
    └── profile/
        ├── index (il mio profilo)
        ├── dogs/[dogId]/edit
        ├── dogs/new
        ├── settings
        └── privacy
```

### 5.2 State Management Strategy

L'app usa una strategia ibrida di state management:

| Tipo di stato | Soluzione | Esempio |
|---------------|-----------|---------|
| **Server state** | TanStack Query (via tRPC) | Profili cani, lista match, messaggi |
| **Client state** | Zustand | Auth token, UI state, onboarding progress |
| **Form state** | React Hook Form + Zod | Form di registrazione, profilo cane |
| **Navigation state** | Expo Router | Gestito dal framework |
| **Persistent state** | MMKV (locale) + SecureStore (sensibile) | Preferenze, token JWT |

#### Zustand Stores

```
authStore
├── user: User | null
├── isAuthenticated: boolean
├── accessToken: string | null
├── login(credentials) → void
├── logout() → void
└── refreshToken() → void

dogStore
├── activeDogId: string | null      # Cane selezionato per matching
├── setActiveDog(id) → void
└── onboardingProgress: OnboardingStep

matchStore
├── unreadCount: number
└── markAsRead(matchId) → void

chatStore
├── activeConversation: string | null
├── typingUsers: Map<string, boolean>
├── pendingMessages: Message[]       # Queue offline
└── sendMessage(msg) → void

locationStore
├── currentLocation: Coords | null
├── searchRadius: number
├── updateLocation(coords) → void
└── setSearchRadius(km) → void
```

### 5.3 Component Architecture

```
Design System Layer (packages/ui)
  │
  ├── Primitives: Button, Text, Input, Avatar, Badge, Card, Modal, Skeleton
  │     (Nativewind styling, accessibilita built-in, varianti via cva)
  │
  └── Composites: DogCard, MatchListItem, PhotoGallery, StarRating
        (Composti da primitives, logica di presentazione)

App Components Layer (apps/mobile/components)
  │
  ├── Feature-specific: SwipeCard, ChatBubble, BehaviorSelector, DogProfileForm
  │     (Contengono logica di business specifica)
  │
  └── Layout: TabBar, Header, EmptyState, ErrorBoundary

Screen Layer (apps/mobile/app)
  │
  └── File-based routes che compongono componenti e hooks
```

### 5.4 Data Fetching Pattern

Tutte le chiamate API passano attraverso il client tRPC tipizzato end-to-end:

```typescript
// apps/mobile/services/api.ts

// Il client tRPC viene creato con TanStack Query integration
// Esempio di utilizzo in un componente:

// Query (lettura)
const { data: dogs } = trpc.dog.getMyDogs.useQuery();

// Mutation (scrittura)
const swipeMutation = trpc.matching.swipe.useMutation({
  onSuccess: (result) => {
    if (result.isMatch) {
      // Mostra animazione match
    }
  }
});

// Infinite Query (paginazione)
const { data, fetchNextPage } = trpc.matching.getFeed.useInfiniteQuery(
  { dogId: activeDogId },
  { getNextPageParam: (lastPage) => lastPage.nextCursor }
);
```

### 5.5 Offline Strategy

| Feature | Strategia Offline |
|---------|-------------------|
| Feed swipe | Pre-fetch 20 card. Swipe salvati in MMKV, sync al ritorno online. |
| Chat | Messaggi in coda locale (chatStore.pendingMessages). Invio automatico al ripristino connessione. |
| Profilo | Dati in cache TanStack Query. Modifiche in coda. |
| Posizione | Ultima posizione nota da MMKV. |

---

## 6. Shared Packages

### 6.1 `@dogwalk/types`

Tipi TypeScript condivisi tra frontend e backend. Nessuna dipendenza runtime.

```typescript
// packages/types/src/dog.ts

export type DogSize = "toy" | "piccola" | "media" | "grande" | "gigante";
export type EnergyLevel = "bassa" | "media" | "alta" | "molto_alta";
export type DogBehavior = "molto_socievole" | "socievole" | "selettivo" | "reattivo";
export type PeopleBehavior = "molto_socievole" | "socievole" | "timido" | "diffidente";
export type LeashBehavior = "eccellente" | "buono" | "in_addestramento" | "difficile";
export type WalkTime = "mattina_presto" | "mattina" | "pomeriggio" | "sera" | "sera_tardi";
export type WalkTerrain = "urbano" | "parco" | "campagna" | "spiaggia" | "montagna";
export type PhotoModerationStatus = "pending" | "approved" | "rejected";

export interface DogProfile {
  id: string;
  ownerId: string;
  name: string;
  birthDate: string;        // ISO 8601
  breed: string;
  breedSecondary?: string;
  size: DogSize;
  weightKg: number;
  gender: "maschio" | "femmina";
  isNeutered: boolean;
  energyLevel: EnergyLevel;
  behaviorWithDogs: DogBehavior;
  behaviorWithPeople: PeopleBehavior;
  leashBehavior: LeashBehavior;
  recallReliability?: "affidabile" | "parziale" | "non_affidabile";
  bio?: string;
  walkPrefTime: WalkTime[];
  walkPrefDurationMin: number;
  walkPrefDurationMax: number;
  walkPrefTerrain: WalkTerrain[];
  isActive: boolean;
  photos: DogPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface DogPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  position: number;
  isPrimary: boolean;
  moderationStatus: PhotoModerationStatus;
}

export interface MatchResult {
  id: string;
  myDog: DogProfileSummary;
  theirDog: DogProfileSummary;
  theirOwner: UserSummary;
  compatibilityScore: number;
  matchedAt: string;
  lastMessage?: MessagePreview;
  unreadCount: number;
}
```

### 6.2 `@dogwalk/validation`

Schemi Zod usati sia dal backend (validazione input API) sia dal frontend (validazione form).

```typescript
// packages/validation/src/dog.ts

import { z } from "zod";

export const dogSizeSchema = z.enum([
  "toy", "piccola", "media", "grande", "gigante"
]);

export const createDogProfileSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-zA-ZÀ-ÿ\s]+$/),
  birthDate: z.string().date(),
  breed: z.string().min(2).max(100),
  breedSecondary: z.string().min(2).max(100).optional(),
  size: dogSizeSchema,
  weightKg: z.number().min(0.5).max(100),
  gender: z.enum(["maschio", "femmina"]),
  isNeutered: z.boolean(),
  energyLevel: z.enum(["bassa", "media", "alta", "molto_alta"]),
  behaviorWithDogs: z.enum([
    "molto_socievole", "socievole", "selettivo", "reattivo"
  ]),
  behaviorWithPeople: z.enum([
    "molto_socievole", "socievole", "timido", "diffidente"
  ]),
  leashBehavior: z.enum([
    "eccellente", "buono", "in_addestramento", "difficile"
  ]),
  recallReliability: z.enum([
    "affidabile", "parziale", "non_affidabile"
  ]).optional(),
  bio: z.string().max(500).optional(),
  walkPrefTime: z.array(z.enum([
    "mattina_presto", "mattina", "pomeriggio", "sera", "sera_tardi"
  ])).min(1),
  walkPrefDurationMin: z.number().int().min(15).max(180),
  walkPrefDurationMax: z.number().int().min(15).max(180),
  walkPrefTerrain: z.array(z.enum([
    "urbano", "parco", "campagna", "spiaggia", "montagna"
  ])).min(1),
}).refine(
  (data) => data.walkPrefDurationMax >= data.walkPrefDurationMin,
  { message: "La durata massima deve essere >= della minima", path: ["walkPrefDurationMax"] }
).refine(
  (data) => isWeightConsistentWithSize(data.weightKg, data.size),
  { message: "Il peso non e coerente con la taglia selezionata", path: ["weightKg"] }
);

function isWeightConsistentWithSize(weight: number, size: string): boolean {
  const ranges: Record<string, [number, number]> = {
    toy: [0.5, 5],
    piccola: [3, 14],       // Range leggermente allargato per tolleranza
    media: [10, 28],
    grande: [22, 50],
    gigante: [40, 100],
  };
  const [min, max] = ranges[size] ?? [0.5, 100];
  return weight >= min && weight <= max;
}
```

### 6.3 `@dogwalk/config`

```typescript
// packages/config/src/matching.ts

/** Matrici di compatibilita -- usate sia dal backend per il calcolo
 *  sia dal frontend per mostrare l'indicatore di compatibilita */

export const SIZE_COMPATIBILITY: Record<string, Record<string, number>> = {
  toy:     { toy: 1.0, piccola: 0.7, media: 0.3, grande: 0.1, gigante: 0.0 },
  piccola: { toy: 0.7, piccola: 1.0, media: 0.7, grande: 0.3, gigante: 0.1 },
  media:   { toy: 0.3, piccola: 0.7, media: 1.0, grande: 0.7, gigante: 0.3 },
  grande:  { toy: 0.1, piccola: 0.3, media: 0.7, grande: 1.0, gigante: 0.7 },
  gigante: { toy: 0.0, piccola: 0.1, media: 0.3, grande: 0.7, gigante: 1.0 },
};

export const ENERGY_COMPATIBILITY: Record<string, Record<string, number>> = {
  bassa:      { bassa: 1.0, media: 0.6, alta: 0.2, molto_alta: 0.0 },
  media:      { bassa: 0.6, media: 1.0, alta: 0.7, molto_alta: 0.3 },
  alta:       { bassa: 0.2, media: 0.7, alta: 1.0, molto_alta: 0.8 },
  molto_alta: { bassa: 0.0, media: 0.3, alta: 0.8, molto_alta: 1.0 },
};

export const BEHAVIOR_COMPATIBILITY: Record<string, Record<string, number>> = {
  molto_socievole: { molto_socievole: 1.0, socievole: 0.9, selettivo: 0.5, reattivo: 0.2 },
  socievole:       { molto_socievole: 0.9, socievole: 1.0, selettivo: 0.6, reattivo: 0.3 },
  selettivo:       { molto_socievole: 0.5, socievole: 0.6, selettivo: 0.7, reattivo: 0.2 },
  reattivo:        { molto_socievole: 0.2, socievole: 0.3, selettivo: 0.2, reattivo: 0.0 },
};

export const MATCHING_WEIGHTS = {
  size: 0.25,
  energy: 0.25,
  behavior: 0.20,
  walkPreferences: 0.15,
  distance: 0.10,
  leash: 0.05,
} as const;

export const DISTANCE_DECAY_FACTOR = 0.15;
```

### 6.4 `@dogwalk/utils`

```typescript
// packages/utils/src/geo.ts

/** Calcolo distanza Haversine in km */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Raggio Terra in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/** Formatta distanza per visualizzazione UI */
export function formatDistance(km: number): string {
  if (km < 1) return "< 1 km";
  if (km < 10) return `~${Math.round(km)} km`;
  return `> 10 km`;
}
```

### 6.5 Package Dependency Graph

```
@dogwalk/config ────────────────────────┐
                                        │
@dogwalk/types ─────────┬──────────────┤
                        │              │
@dogwalk/validation ────┤  (dipende da ├──▶ apps/api
  (dipende da zod,      │   entrambi)  │
   types)               │              ├──▶ apps/mobile
                        │              │
@dogwalk/utils ─────────┘              ├──▶ apps/web
                                       │
@dogwalk/db ───────────────────────────┤
  (dipende da types, drizzle)          │
                                       ├──▶ apps/admin
@dogwalk/api-client ───────────────────┤
  (dipende da types, tRPC client)      │
                                       │
@dogwalk/ui ───────────────────────────┘
  (dipende da types, react-native)
```

---

## 7. Database Schema

### 7.1 Entity Relationship Diagram (Testuale)

```
┌──────────────┐     1:N     ┌──────────────┐     1:N     ┌──────────────┐
│    users     │────────────▶│  dog_profiles │────────────▶│  dog_photos  │
│              │             │              │             │              │
│ id (PK)      │             │ id (PK)       │             │ id (PK)      │
│ email        │             │ owner_id (FK) │             │ dog_id (FK)  │
│ display_name │             │ name          │             │ url          │
│ password_hash│             │ breed         │             │ thumbnail_url│
│ auth_provider│             │ size          │             │ position     │
│ avatar_url   │             │ energy_level  │             │ is_primary   │
│ location     │◀──PostGIS── │ behavior_*    │             │ moderation_  │
│ search_radius│  GEOGRAPHY  │ walk_pref_*   │             │   status     │
│ is_active    │  POINT      │ is_active     │             └──────────────┘
│ created_at   │             │ created_at    │
│ last_login_at│             │ updated_at    │
└──────┬───────┘             └──────┬───────┘
       │                            │
       │ 1:N                        │
       ▼                            │
┌──────────────┐                    │
│ push_tokens  │                    │
│              │                    │
│ id (PK)      │                    │
│ user_id (FK) │                    │
│ token        │                    │
│ platform     │                    │
│ created_at   │                    │
└──────────────┘                    │
                                    │
       ┌────────────────────────────┘
       │
       ▼
┌──────────────┐             ┌──────────────┐
│   swipes     │             │   matches    │
│              │             │              │
│ id (PK)      │             │ id (PK)      │
│ swiper_dog_id│             │ dog_a_id (FK)│
│ swiped_dog_id│             │ dog_b_id (FK)│
│ direction    │ ──creates──▶│ status       │  (active, unmatched, blocked)
│ created_at   │  (on mutual │ created_at   │
└──────────────┘   like)     │ unmatched_at │
                             └──────┬───────┘
                                    │
                                    │ 1:N
                                    ▼
                             ┌──────────────┐
                             │  messages    │
                             │              │
                             │ id (PK)      │
                             │ match_id (FK)│
                             │ sender_id(FK)│
                             │ content      │
                             │ media_url    │
                             │ status       │  (sent, delivered, read)
                             │ is_deleted   │
                             │ created_at   │
                             └──────────────┘

┌──────────────┐             ┌──────────────┐
│   blocks     │             │   reports    │
│              │             │              │
│ id (PK)      │             │ id (PK)      │
│ blocker_id   │             │ reporter_id  │
│ blocked_id   │             │ reported_id  │
│ created_at   │             │ category     │
└──────────────┘             │ description  │
                             │ status       │  (pending, reviewed, resolved)
                             │ created_at   │
                             └──────────────┘
```

### 7.2 Drizzle Schema Example (Users)

```typescript
// packages/db/src/schema/users.ts

import { pgTable, uuid, varchar, boolean, integer,
         timestamp, pgEnum } from "drizzle-orm/pg-core";

// PostGIS geography point type via raw SQL in migration
// Drizzle non ha supporto nativo per geography, si usa customType

export const authProviderEnum = pgEnum("auth_provider", [
  "email", "google", "apple"
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 50 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  authProvider: authProviderEnum("auth_provider").notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  // location viene gestito come GEOGRAPHY(POINT, 4326) via migration SQL
  // e query raw per le operazioni geo
  latitude: numeric("latitude", { precision: 10, scale: 8 }),
  longitude: numeric("longitude", { precision: 11, scale: 8 }),
  locationUpdatedAt: timestamp("location_updated_at"),
  searchRadiusKm: integer("search_radius_km").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});
```

### 7.3 PostGIS Spatial Indexes

```sql
-- docker/postgres/init.sql

CREATE EXTENSION IF NOT EXISTS postgis;

-- Dopo la creazione della tabella users via Drizzle migration,
-- aggiungere colonna geography e indice spaziale:

ALTER TABLE users ADD COLUMN location GEOGRAPHY(POINT, 4326);

CREATE INDEX idx_users_location ON users USING GIST (location);

-- Trigger per sincronizzare latitude/longitude con la colonna geography
CREATE OR REPLACE FUNCTION sync_user_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_user_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_location();
```

### 7.4 Query Geospaziale per Feed Discovery

```sql
-- Query per trovare cani compatibili entro il raggio di ricerca
-- Eseguita tramite Drizzle raw SQL

SELECT
  dp.id,
  dp.name,
  dp.breed,
  dp.size,
  dp.energy_level,
  dp.behavior_with_dogs,
  (SELECT url FROM dog_photos
   WHERE dog_id = dp.id AND is_primary = true AND moderation_status = 'approved'
   LIMIT 1) as primary_photo_url,
  ST_Distance(u.location, current_user_location) / 1000.0 AS distance_km
FROM dog_profiles dp
JOIN users u ON dp.owner_id = u.id
WHERE
  dp.is_active = true
  AND u.is_active = true
  AND dp.owner_id != :currentUserId
  AND u.location IS NOT NULL
  AND ST_DWithin(u.location, :currentUserLocation, :searchRadiusMeters)
  -- Escludi cani gia swipati
  AND dp.id NOT IN (
    SELECT swiped_dog_id FROM swipes
    WHERE swiper_dog_id = :currentDogId
    AND (direction = 'like' OR created_at > NOW() - INTERVAL '30 days')
  )
  -- Escludi utenti bloccati
  AND dp.owner_id NOT IN (
    SELECT blocked_id FROM blocks WHERE blocker_id = :currentUserId
    UNION
    SELECT blocker_id FROM blocks WHERE blocked_id = :currentUserId
  )
  -- Almeno una foto approvata
  AND EXISTS (
    SELECT 1 FROM dog_photos
    WHERE dog_id = dp.id AND moderation_status = 'approved'
  )
ORDER BY ST_Distance(u.location, :currentUserLocation) ASC
LIMIT 50;
```

---

## 8. API Design

### 8.1 Scelta: tRPC (non REST puro)

Si adotta **tRPC** come layer API primario. La scelta e motivata nell'ADR-002. In breve: type safety end-to-end senza code generation, perfetta integrazione con TanStack Query, e supporto nativo per subscriptions (WebSocket).

Non viene esposto un REST API pubblico nell'MVP. Se necessario in futuro (per integrazioni B2B), si aggiungera un layer REST davanti al service layer esistente.

### 8.2 Router Map Completo

```typescript
// apps/api/src/trpc/router.ts

appRouter = router({

  // ──── AUTH ────
  auth: router({
    register:           publicProcedure  .input(registerSchema)       .mutation(),
    login:              publicProcedure  .input(loginSchema)          .mutation(),
    loginWithGoogle:     publicProcedure  .input(googleTokenSchema)    .mutation(),
    loginWithApple:      publicProcedure  .input(appleTokenSchema)     .mutation(),
    refreshToken:       publicProcedure  .input(refreshTokenSchema)   .mutation(),
    verifyEmail:        publicProcedure  .input(verifyEmailSchema)    .mutation(),
    requestPasswordReset: publicProcedure.input(emailSchema)          .mutation(),
    resetPassword:      publicProcedure  .input(resetPasswordSchema)  .mutation(),
    logout:             protectedProcedure                            .mutation(),
  }),

  // ──── USER ────
  user: router({
    getMe:              protectedProcedure                            .query(),
    updateProfile:      protectedProcedure.input(updateUserSchema)    .mutation(),
    updateLocation:     protectedProcedure.input(locationSchema)      .mutation(),
    updateSettings:     protectedProcedure.input(settingsSchema)      .mutation(),
    deleteAccount:      protectedProcedure                            .mutation(),
    blockUser:          protectedProcedure.input(userIdSchema)        .mutation(),
    unblockUser:        protectedProcedure.input(userIdSchema)        .mutation(),
    getBlockedUsers:    protectedProcedure                            .query(),
    reportUser:         protectedProcedure.input(reportSchema)        .mutation(),
  }),

  // ──── DOG ────
  dog: router({
    getMyDogs:          protectedProcedure                            .query(),
    getDogById:         protectedProcedure.input(dogIdSchema)         .query(),
    createDog:          protectedProcedure.input(createDogSchema)     .mutation(),
    updateDog:          protectedProcedure.input(updateDogSchema)     .mutation(),
    deleteDog:          protectedProcedure.input(dogIdSchema)         .mutation(),
    toggleActive:       protectedProcedure.input(dogIdSchema)         .mutation(),
    getBreeds:          publicProcedure   .input(breedSearchSchema)   .query(),
    // Foto
    getUploadUrl:       protectedProcedure.input(uploadRequestSchema) .mutation(),
    confirmUpload:      protectedProcedure.input(confirmUploadSchema) .mutation(),
    deletePhoto:        protectedProcedure.input(photoIdSchema)       .mutation(),
    reorderPhotos:      protectedProcedure.input(reorderSchema)       .mutation(),
  }),

  // ──── MATCHING ────
  matching: router({
    getFeed:            protectedProcedure.input(feedRequestSchema)   .query(),
    // ^ paginato con cursor, restituisce card con compatibility score
    swipe:              protectedProcedure.input(swipeSchema)         .mutation(),
    // ^ { targetDogId, direction: "like" | "pass" }
    // Restituisce { isMatch: boolean, match?: Match }
    getMatches:         protectedProcedure                            .query(),
    unmatch:            protectedProcedure.input(matchIdSchema)       .mutation(),
  }),

  // ──── CHAT ────
  chat: router({
    getMessages:        protectedProcedure.input(getMessagesSchema)   .query(),
    // ^ paginato con cursor, ordine decrescente
    sendMessage:        protectedProcedure.input(sendMessageSchema)   .mutation(),
    markAsRead:         protectedProcedure.input(matchIdSchema)       .mutation(),
    deleteMessage:      protectedProcedure.input(messageIdSchema)     .mutation(),
    // Subscriptions (WebSocket)
    onNewMessage:       protectedProcedure                            .subscription(),
    onTyping:           protectedProcedure.input(matchIdSchema)       .subscription(),
    onMessageStatus:    protectedProcedure                            .subscription(),
  }),

  // ──── NOTIFICATION ────
  notification: router({
    registerPushToken:  protectedProcedure.input(pushTokenSchema)     .mutation(),
    updatePreferences:  protectedProcedure.input(notifPrefsSchema)    .mutation(),
    getPreferences:     protectedProcedure                            .query(),
  }),
});
```

### 8.3 Input/Output Schema Examples

```typescript
// Feed Request
const feedRequestSchema = z.object({
  dogId: z.string().uuid(),
  cursor: z.string().uuid().optional(),  // last dog ID for pagination
  limit: z.number().int().min(5).max(50).default(20),
});

// Feed Response (inferito dal router)
type FeedResponse = {
  items: Array<{
    dog: DogProfileSummary;
    owner: UserSummary;
    compatibilityScore: number;  // 0-100
    distanceKm: number;
    compatibilityBreakdown: {
      size: number;
      energy: number;
      behavior: number;
      walkPreferences: number;
      distance: number;
      leash: number;
    };
  }>;
  nextCursor: string | null;
};

// Swipe
const swipeSchema = z.object({
  myDogId: z.string().uuid(),
  targetDogId: z.string().uuid(),
  direction: z.enum(["like", "pass"]),
});

type SwipeResponse = {
  success: true;
  isMatch: boolean;
  match?: {
    id: string;
    theirDog: DogProfileSummary;
    theirOwner: UserSummary;
    compatibilityScore: number;
  };
};
```

### 8.4 Error Handling

Tutti gli errori API sono strutturati come `TRPCError`:

| Codice | HTTP | Uso |
|--------|------|-----|
| `BAD_REQUEST` | 400 | Input non valido (Zod failure) |
| `UNAUTHORIZED` | 401 | Token mancante o scaduto |
| `FORBIDDEN` | 403 | Azione non permessa (es. modificare cane altrui) |
| `NOT_FOUND` | 404 | Risorsa non trovata |
| `CONFLICT` | 409 | Duplicato (es. email gia registrata) |
| `TOO_MANY_REQUESTS` | 429 | Rate limit superato |
| `INTERNAL_SERVER_ERROR` | 500 | Errore non gestito |

---

## 9. Real-time Architecture

### 9.1 Overview

Il sistema real-time serve due funzionalita:

1. **Chat** -- messaggi, typing indicators, read receipts
2. **Match notifications** -- notifica istantanea di match reciproco

### 9.2 WebSocket Architecture (Nativo su Fly.io)

```
┌──────────────┐     WebSocket (wss://)     ┌──────────────────────┐
│  Mobile App  │◀───────────────────────────▶│  Fly.io Node.js      │
│              │                             │  (api.dogwalk.app)    │
└──────────────┘                             │                      │
                                             │  Hono + ws library   │
                                             │  WebSocket nativo    │
                                             │                      │
                                             │  - In-memory rooms   │
                                             │  - Typing indicators │
                                             │  - Message broadcast │
                                             │  - Persist to Neon   │
                                             └──────────────────────┘
```

Il server WebSocket nativo (libreria `ws` o `@hono/node-ws`) gira sullo stesso processo Node.js dell'API su Fly.io. Le connessioni WebSocket sono gestite in-memory con una mappa di room per match. Fly.io supporta WebSocket nativamente e permette connessioni persistenti. Per la scala MVP (fino a 50K MAU), un singolo processo Node.js gestisce tutte le connessioni. Per scalare oltre, si puo usare Upstash Redis Pub/Sub per coordinare i messaggi tra piu istanze Fly.io.

### 9.3 Message Flow (WebSocket nativo)

```
Utente A invia messaggio
        │
        ▼
  ┌─────────────────────┐
  │ WebSocket → Room     │
  │ handler (in-memory)  │
  └──────┬──────────────┘
         │
         ▼
  ┌─────────────────────┐
  │ Chat Service         │
  │                      │
  │ 1. Valida input
  │ 2. Filtra contenuto (moderazione)
  │ 3. Persiste messaggio in Neon
  │ 4. Broadcast a utenti connessi (WebSocket)
  │ 5. Se destinatario offline → BullMQ job push:send
  │ 6. Worker BullMQ: invio push via Expo Push API
  └──────┬──────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────────────┐ ┌───────────────┐
│ Utente B       │ │ BullMQ        │
│ (se connesso)  │ │ push:send     │
│                │ │               │
│ Riceve in      │ │ Se Utente B   │
│ real-time via  │ │ offline       │
│ WebSocket      │ │ → Push notif. │
└────────────────┘ └───────────────┘
```

### 9.4 Typing Indicator Flow

```
Utente A digita
    │
    ├──▶ Throttle (max 1 evento ogni 2 secondi)
    │
    ├──▶ WebSocket → Room handler (in-memory)
    │
    └──▶ Broadcast { userId, isTyping: true } all'altro utente
         │
         └──▶ Utente B riceve via WebSocket
              │
              └──▶ UI mostra "sta scrivendo..."
                   │
                   └──▶ Auto-dismiss dopo 5 secondi senza nuovi eventi
```

### 9.5 Connection Management

| Aspetto | Strategia |
|---------|-----------|
| Reconnection | Backoff esponenziale: 1s, 2s, 4s, 8s, max 30s |
| Heartbeat | Ping/pong ogni 30 secondi |
| Auth | Token JWT inviato nel primo messaggio dopo connessione |
| Token refresh | Se il token scade durante la connessione, il server chiude con codice 4001, il client fa refresh e riconnette |
| Stale connections | Server chiude connessioni inattive (no ping) dopo 90 secondi |

### 9.6 Geolocation Updates

La geolocalizzazione NON usa WebSocket in tempo reale (sarebbe un drain della batteria). Invece:

| Scenario | Strategia |
|----------|-----------|
| App in foreground | L'app aggiorna la posizione ogni 15 minuti via tRPC mutation `user.updateLocation` |
| App torna in foreground | Aggiornamento immediato della posizione |
| App in background | Nessun aggiornamento (risparmio batteria). La posizione viene usata come "ultima nota". |
| Posizioni stale (>7 giorni) | Il profilo non appare nel feed di discovery attivo, ma resta visibile nella lista match |

---

## 10. Security Architecture

### 10.1 Authentication Flow

#### 10.1.1 Email + Password Registration

```
Client                          Server                         Database
  │                               │                               │
  │  POST auth.register           │                               │
  │  { email, password, name }    │                               │
  │──────────────────────────────▶│                               │
  │                               │  Valida input (Zod)           │
  │                               │  Hash password (bcrypt)         │
  │                               │  Genera OTP 6 cifre            │
  │                               │──────────────────────────────▶│
  │                               │  INSERT user (email_verified   │
  │                               │  = false)                     │
  │                               │  INSERT otp_codes              │
  │                               │◀──────────────────────────────│
  │                               │                               │
  │                               │  Accoda job email:send         │
  │                               │  (OTP via Resend)              │
  │                               │                               │
  │  { success: true,             │                               │
  │    requiresVerification: true }│                               │
  │◀──────────────────────────────│                               │
  │                               │                               │
  │  POST auth.verifyEmail        │                               │
  │  { email, otp }               │                               │
  │──────────────────────────────▶│                               │
  │                               │  Verifica OTP (scadenza 15min)│
  │                               │  SET email_verified = true     │
  │                               │  Genera JWT access + refresh   │
  │                               │                               │
  │  { accessToken, refreshToken, │                               │
  │    user }                      │                               │
  │◀──────────────────────────────│                               │
```

#### 10.1.2 OAuth Flow (Google/Apple)

```
Client                      OAuth Provider           Server
  │                               │                     │
  │  Apri browser/sheet           │                     │
  │──────────────────────────────▶│                     │
  │                               │                     │
  │  ◀── OAuth consent screen ───│                     │
  │  ──── User approva ────────▶ │                     │
  │                               │                     │
  │  ◀── id_token (JWT) ─────── │                     │
  │                               │                     │
  │  POST auth.loginWithGoogle    │                     │
  │  { idToken }                  │                     │
  │──────────────────────────────────────────────────▶ │
  │                               │                     │
  │                               │  Verifica id_token  │
  │                               │  con Google/Apple   │
  │                               │  public keys        │
  │                               │                     │
  │                               │  Upsert user        │
  │                               │  (crea se nuovo,    │
  │                               │   aggiorna se       │
  │                               │   esistente)        │
  │                               │                     │
  │  { accessToken, refreshToken, │                     │
  │    user, isNewUser }           │                     │
  │◀──────────────────────────────────────────────────│
```

### 10.2 JWT Strategy

| Parametro | Valore |
|-----------|--------|
| **Algoritmo** | RS256 (RSA asymmetric) |
| **Access token lifetime** | 15 minuti |
| **Refresh token lifetime** | 30 giorni |
| **Refresh token rotation** | Si -- ogni refresh emette un nuovo refresh token e invalida il precedente |
| **Token storage (client)** | Access token in memory (Zustand). Refresh token in Expo SecureStore. |
| **Revocation** | Refresh token revocato su logout. Blacklist in Upstash Redis per access token (solo per force-logout). |

**Access Token Payload:**

```json
{
  "sub": "uuid-utente",
  "email": "utente@example.com",
  "iat": 1709971200,
  "exp": 1709972100,
  "iss": "dogwalk-api",
  "aud": "dogwalk-mobile"
}
```

### 10.3 Data Encryption

| Layer | Metodo | Dettaglio |
|-------|--------|----------|
| **In transito** | TLS 1.3 | Tutto il traffico HTTP e WebSocket e cifrato |
| **Certificate pinning** | SHA-256 pin | Verificato nel client mobile (Expo config) |
| **At rest (database)** | AES-256 | Encryption a livello di volume (Neon managed PostgreSQL) |
| **At rest (R2)** | Encryption at rest | Cloudflare R2 encryption built-in per tutti gli oggetti |
| **Password** | bcrypt | Password hashing nativo su Node.js |
| **Token sensibili** | Expo SecureStore | Keychain (iOS) / Keystore (Android) |

### 10.4 GDPR Compliance Architecture

#### Data Flow e Basi Legali

| Dato | Base Legale | Retention | Anonimizzazione |
|------|-------------|-----------|-----------------|
| Email, nome | Contratto (esecuzione servizio) | Fino a cancellazione account + 30gg | Cancellazione |
| Password hash | Contratto | Fino a cancellazione account | Cancellazione |
| Posizione GPS | Consenso esplicito | Solo ultima nota. Aggiornata continuamente. | Offset +/- 200m prima dello storage |
| Foto cane | Contratto | Fino a cancellazione profilo + 30gg | Cancellazione da R2 |
| Messaggi chat | Contratto | 6 mesi dopo eliminazione match | Hard delete |
| Dati di swipe | Legittimo interesse | 12 mesi | Anonimizzazione |
| Analytics/eventi | Legittimo interesse | 24 mesi | Anonimizzazione automatica |
| Push tokens | Contratto | Fino a logout/disinstallazione | Cancellazione |

#### Diritti dell'Interessato - Implementazione Tecnica

| Diritto | Endpoint | Implementazione |
|---------|----------|-----------------|
| **Accesso** | `user.exportMyData` | Job asincrono che raccoglie tutti i dati dell'utente (profilo, cani, match, messaggi) e genera un file JSON. Link di download inviato via email. Completamento entro 72h. |
| **Rettifica** | `user.updateProfile`, `dog.updateDog` | Modifica diretta via API. |
| **Cancellazione** | `user.deleteAccount` | Soft delete immediato (is_active = false). Hard delete di tutti i dati a 30 giorni via job schedulato. Conferma via email. |
| **Portabilita** | `user.exportMyData` | Stesso endpoint dell'accesso, formato JSON strutturato. |
| **Opposizione** | Impostazioni privacy in-app | Toggle per disattivare analytics, marketing, suggerimenti personalizzati. |

#### Privacy by Design

```
Posizione utente:
  Input: lat=45.464211, lon=9.191383  (coordinate esatte)
    │
    ▼
  Offset casuale: +/- 200m in entrambe le direzioni
    │
    ▼
  Stored: lat=45.465023, lon=9.189891  (posizione offuscata)
    │
    ▼
  Mostrata ad altri: "~2 km"  (distanza arrotondata, mai coordinate)
```

### 10.5 Rate Limiting

| Endpoint/Risorsa | Limite | Finestra | Chiave |
|------------------|--------|----------|--------|
| `auth.login` | 5 tentativi | 15 minuti | Per IP |
| `auth.register` | 3 registrazioni | 1 ora | Per IP |
| `auth.verifyEmail` | 5 tentativi | 15 minuti | Per email |
| `matching.swipe` | 100 swipe | 1 ora | Per user |
| `chat.sendMessage` | 30 messaggi | 1 minuto | Per user |
| `dog.getUploadUrl` | 20 upload | 1 ora | Per user |
| `user.updateLocation` | 10 aggiornamenti | 5 minuti | Per user |
| Globale (tutte le API) | 300 richieste | 1 minuto | Per user |
| Globale (non autenticato) | 60 richieste | 1 minuto | Per IP |

Implementazione: middleware Hono/tRPC che usa Upstash Redis con algoritmo sliding window.

### 10.6 Input Sanitization

Ogni input utente passa attraverso:

1. **Zod validation** -- type checking e constraints
2. **String sanitization** -- escape HTML, rimozione caratteri di controllo
3. **SQL injection prevention** -- Drizzle ORM usa prepared statements
4. **File validation** -- MIME type checking, dimensioni, magic bytes verification

---

## 11. Infrastructure e Deployment

### 11.1 Development Environment

```yaml
# docker/docker-compose.yml
# PostgreSQL + PostGIS e Redis per dev locale.
# R2: accesso diretto all'account Cloudflare dev (no MinIO).

version: "3.8"
services:
  postgres:
    image: postgis/postgis:16-3.4
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: dogwalk_dev
      POSTGRES_USER: dogwalk
      POSTGRES_PASSWORD: dogwalk_dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

> **Nota:** In alternativa al container PostgreSQL locale, si puo usare Neon branching per creare un database per ogni branch di sviluppo. In alternativa al Redis locale, si puo usare Upstash Redis (free tier) per lo sviluppo.

### 11.2 Environments

| Ambiente | Scopo | Database | Infrastruttura | Deploy Trigger |
|----------|-------|----------|----------------|----------------|
| **Local** | Sviluppo | Docker Compose (PostgreSQL + Redis) | Macchina sviluppatore | Manuale |
| **Preview** | Review PR | Neon branch per PR | Fly.io preview app + CF Pages preview + EAS Update (OTA) | PR su GitHub |
| **Staging** | QA e test pre-release | Neon branch staging (dati seed) | Fly.io (staging) + CF Pages (staging) | Merge su `develop` |
| **Production** | Utenti reali | Neon PostgreSQL (primary) | Fly.io (production, multi-region) + CF Pages + EAS Build | Merge su `main` (con approval) |

### 11.3 CI/CD Pipeline (GitHub Actions)

```
PR aperta / aggiornata
    │
    ├──▶ ci.yml
    │     ├── Install dependencies (pnpm)
    │     ├── Lint (ESLint flat config)
    │     ├── Type check (tsc --noEmit) per tutti i packages
    │     ├── Unit tests (Vitest backend, Jest frontend)
    │     ├── Integration tests (Testcontainers per DB)
    │     └── Build check (turbo build)
    │
    └──▶ preview.yml
          └── EAS Update (OTA preview build)

Merge su develop
    │
    └──▶ deploy-staging.yml
          ├── Build Docker image e push a registry
          ├── Deploy API su Fly.io (staging)
          ├── Deploy web su Cloudflare Pages (staging)
          ├── Deploy admin su Cloudflare Pages (staging)
          ├── Run database migrations (Neon staging branch)
          ├── Smoke tests
          └── EAS Update (staging channel)

Merge su main (con approval)
    │
    └──▶ deploy-production.yml
          ├── Build Docker image e push a registry
          ├── Deploy API su Fly.io (production, multi-region)
          ├── Deploy web su Cloudflare Pages (production)
          ├── Deploy admin su Cloudflare Pages (production)
          ├── Run database migrations (Neon production, con backup pre-migration)
          ├── Health check (30s timeout)
          ├── EAS Update (production channel)
          │
          └── Rollback automatico via `fly releases rollback`
```

### 11.4 Configurazione Fly.io (fly.toml) e Dockerfile

**`apps/api/fly.toml`:**

```toml
# apps/api/fly.toml

app = "dogwalk-api"
primary_region = "fra"           # Francoforte (vicino all'Italia)

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]

[checks]
  [checks.health]
    port = 3000
    type = "http"
    interval = "15s"
    timeout = "2s"
    path = "/health"
```

**`apps/api/Dockerfile`:**

```dockerfile
# apps/api/Dockerfile

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=@dogwalk/api

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

> **Nota:** L'API gira come container Docker su Fly.io (Node.js). Fly.io gestisce auto-scaling, health checks, e deploy blue-green. Cloudflare CDN fa da proxy davanti a Fly.io per caching e DDoS protection. R2 resta accessibile via `@aws-sdk/client-s3` con endpoint S3-compatible.

### 11.5 Environment Variables

```bash
# .env.example

# ──── Environment ────
NODE_ENV=development
API_URL=http://localhost:8787

# ──── Database (Neon) ────
DATABASE_URL=postgresql://dogwalk:dogwalk_dev_password@localhost:5432/dogwalk_dev
# In produzione: postgres://user:pass@ep-xxx.region.aws.neon.tech/dogwalk

# ──── JWT ────
JWT_PRIVATE_KEY=<RS256 private key, PEM format>
JWT_PUBLIC_KEY=<RS256 public key, PEM format>
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=30d

# ──── OAuth ────
GOOGLE_CLIENT_ID=<google-client-id>
APPLE_CLIENT_ID=<apple-service-id>
APPLE_TEAM_ID=<apple-team-id>
APPLE_KEY_ID=<apple-key-id>
APPLE_PRIVATE_KEY=<apple-private-key>

# ──── Email (Resend) ────
RESEND_API_KEY=<resend-api-key>
EMAIL_FROM=noreply@dogwalk.app

# ──── Push Notifications ────
EXPO_ACCESS_TOKEN=<expo-push-token>

# ──── Sentry ────
SENTRY_DSN=<sentry-dsn>

# ──── Upstash Redis ────
UPSTASH_REDIS_REST_URL=<upstash-redis-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-redis-token>

# ──── Cloudflare R2 ────
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
R2_BUCKET_NAME=dogwalk-photos
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

### 11.6 Production Infrastructure Target

```
                          ┌──────────────────────────────────────────┐
                          │           Cloudflare Network              │
                          │       (CDN + Proxy + DDoS protection)     │
                          └──────────┬──────────┬────────────────────┘
                                     │          │
                    ┌────────────────┘          └────────────────┐
                    │                                            │
         ┌──────────▼──────────┐                    ┌───────────▼──────────┐
         │  Cloudflare Pages    │                    │  Fly.io (Node.js)    │
         │                      │                    │  (api.dogwalk.app)    │
         │  dogwalk.app (web)   │                    │                      │
         │  admin.dogwalk.app   │                    │  Hono + tRPC         │
         └──────────────────────┘                    │  WebSocket nativo    │
                                                     │  BullMQ workers      │
                                                     └──────────┬───────────┘
                                                                │
                    ┌───────────────────────────────────────────┘
                    │
    ┌───────────────┼────────────────┬──────────────────┐
    │               │                │                  │
    ▼               ▼                ▼                  ▼
┌────────┐   ┌──────────┐    ┌────────────┐    ┌──────────────┐
│  Neon   │   │    R2    │    │  Upstash   │    │  Cloudflare  │
│ (PgSQL) │   │ (storage)│    │   Redis    │    │  R2 / CDN    │
│ PostGIS │   │ Foto cani│    │  (cache)   │    │  (foto CDN)  │
│ Drizzle │   │ Media    │    │ Sessions   │    │              │
└────────┘   └──────────┘    │ Rate limit │    └──────────────┘
                              │ BullMQ     │
                              └────────────┘

Servizi Esterni:
┌────────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐
│   Resend   │  │  Mapbox  │  │  Sentry  │  │ Expo Push  │  │  Apple/  │
│  (email)   │  │  (mappe) │  │ (errors) │  │   API      │  │  Google  │
└────────────┘  └──────────┘  └──────────┘  └────────────┘  │  OAuth   │
                                                             └──────────┘
```

**Scaling Strategy (MVP -> 50K MAU):**

Fly.io scala orizzontalmente aggiungendo machine. Il processo puo essere auto-scaled basandosi su CPU/memory.

| Componente | MVP (0-10K MAU) | Growth (10-50K MAU) |
|------------|-----------------|---------------------|
| Fly.io (API) | 1 shared-cpu-1x ($3-5/mese) | 2-3 machines performance-1x ($30-50/mese) |
| Neon (PostgreSQL) | Free tier (0.5GB) | Pro plan (pay-per-use, auto-scaling) |
| Upstash Redis | Free tier (10K cmd/giorno) | Pro ($10/mese, 10K cmd/sec) |
| Cloudflare R2 | Free tier (10GB) | Pay-per-use ($0.015/GB/mese) |
| Cloudflare Pages | Free | Free |

---

## 12. Diagrammi C4

### 12.1 Level 1 - System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        SYSTEM CONTEXT                               │
│                                                                     │
│  ┌──────────────┐                                                   │
│  │  Proprietario │         Usa l'app per trovare                    │
│  │  di Cane      │         compagni di passeggiata                  │
│  │  [Persona]    │──────────────────────┐                           │
│  └──────────────┘                       │                           │
│                                         ▼                           │
│                              ┌─────────────────────┐                │
│                              │                     │                │
│                              │    DogWalk System   │                │
│                              │                     │                │
│                              │  App mobile social  │                │
│                              │  per matching cani   │                │
│                              │  e proprietari       │                │
│                              │                     │                │
│                              └──┬──┬──┬──┬──┬─────┘                │
│                                 │  │  │  │  │                       │
│         ┌───────────────────────┘  │  │  │  └────────────────┐     │
│         │           ┌──────────────┘  │  └───────────┐       │     │
│         │           │        ┌────────┘              │       │     │
│         ▼           ▼        ▼                       ▼       ▼     │
│  ┌────────────┐ ┌────────┐ ┌──────────┐  ┌──────────┐ ┌────────┐  │
│  │ Google     │ │ Apple  │ │ Expo Push│  │  Fly.io  │ │ Resend │  │
│  │ OAuth      │ │ Sign-In│ │ Service  │  │ (API)    │ │ Email  │  │
│  │ [External] │ │[Extern]│ │[External]│  │[Cloud]   │ │[Extern]│  │
│  └────────────┘ └────────┘ └──────────┘  └──────────┘ └────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.2 Level 2 - Container Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                       CONTAINER DIAGRAM                             │
│                                                                     │
│                      ┌──────────────────┐                           │
│                      │   Mobile App     │                           │
│                      │   [Container]    │                           │
│                      │                  │                           │
│                      │ Expo / React     │                           │
│                      │ Native           │                           │
│                      │ TypeScript       │                           │
│                      └────────┬─────────┘                           │
│                               │                                     │
│                    tRPC (HTTPS + WSS)                               │
│                               │                                     │
│                      ┌────────▼─────────┐                           │
│                      │   API Server     │                           │
│                      │ [Fly.io Node.js] │                           │
│                      │                  │                           │
│                      │ Hono + tRPC      │                           │
│                      │ TypeScript       │                           │
│                      └──┬────┬────┬─────┘                           │
│                         │    │    │                                  │
│              ┌──────────┘    │    └──────────┐                      │
│              │               │               │                      │
│     ┌────────▼────────┐ ┌───▼─────────┐ ┌───▼──────────┐          │
│     │  Neon PostgreSQL │ │Upstash Redis│ │ Cloudflare R2│          │
│     │   + PostGIS     │ │  [Cache +   │ │  [Object     │          │
│     │   [Database]    │ │   Sessions  │ │   Storage]   │          │
│     │                 │ │   + Rate    │ │              │          │
│     │ Profili, match, │ │   Limiting  │ │  Foto cani   │          │
│     │ messaggi, geo   │ │  + BullMQ]  │ │              │          │
│     └─────────────────┘ └─────────────┘ └──────────────┘          │
│                                                                     │
│     ┌─────────────────┐  ┌─────────────────┐                       │
│     │ WebSocket (ws)  │  │  BullMQ         │                       │
│     │ [Fly.io nativo] │  │  [Async Jobs]   │                       │
│     │                 │  │                 │                       │
│     │ Chat room WS    │  │  Photo moder.   │                       │
│     │ in-memory rooms │  │  Push notif.    │                       │
│     │                 │  │  Email           │                       │
│     └─────────────────┘  └─────────────────┘                       │
│                                                                     │
│     ┌─────────────────┐                                             │
│     │  CF Pages       │                                             │
│     │  [Static Host]  │                                             │
│     │                 │                                             │
│     │ Web marketing   │                                             │
│     │ Admin backoffice│                                             │
│     └─────────────────┘                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.3 Level 3 - Component Diagram (API Worker)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    API Server - Components                          │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     tRPC Router Layer                          │ │
│  │  ┌────────┐ ┌──────┐ ┌─────┐ ┌─────────┐ ┌──────┐ ┌───────┐│ │
│  │  │  Auth  │ │ User │ │ Dog │ │Matching │ │ Chat │ │Notif. ││ │
│  │  │ Router │ │Router│ │Rout.│ │ Router  │ │Router│ │Router ││ │
│  │  └───┬────┘ └──┬───┘ └──┬──┘ └───┬─────┘ └──┬───┘ └───┬───┘│ │
│  └──────┼─────────┼────────┼────────┼──────────┼─────────┼─────┘ │
│         │         │        │        │          │         │        │
│  ┌──────▼─────────▼────────▼────────▼──────────▼─────────▼─────┐ │
│  │                    Service Layer                             │ │
│  │                                                             │ │
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐   │ │
│  │  │ AuthService  │ │ UserService  │ │ DogService         │   │ │
│  │  │             │ │              │ │                    │   │ │
│  │  │ - register  │ │ - getProfile │ │ - createProfile    │   │ │
│  │  │ - login     │ │ - update     │ │ - updateProfile    │   │ │
│  │  │ - verify    │ │ - delete     │ │ - uploadPhoto      │   │ │
│  │  │ - refresh   │ │ - block      │ │ - getBreeds        │   │ │
│  │  └─────────────┘ └──────────────┘ └────────────────────┘   │ │
│  │                                                             │ │
│  │  ┌─────────────────┐ ┌──────────────┐ ┌────────────────┐  │ │
│  │  │ MatchingService  │ │ ChatService  │ │ NotifService   │  │ │
│  │  │                 │ │              │ │                │  │ │
│  │  │ - generateFeed  │ │ - send       │ │ - registerToken│  │ │
│  │  │ - processSwipe  │ │ - getHistory │ │ - sendPush     │  │ │
│  │  │ - calculateScore│ │ - markRead   │ │ - sendEmail    │  │ │
│  │  │ - createMatch   │ │ - wsHandler  │ │ - preferences  │  │ │
│  │  └─────────────────┘ └──────────────┘ └────────────────┘  │ │
│  │                                                             │ │
│  │  ┌────────────────────┐ ┌────────────────┐                 │ │
│  │  │ UploadService      │ │ ModerationSvc  │                 │ │
│  │  │                    │ │                │                 │ │
│  │  │ - presignedUrl     │ │ - scanPhoto    │                 │ │
│  │  │ - confirmUpload    │ │ - filterText   │                 │ │
│  │  │ - resizeImage      │ │ - handleReport │                 │ │
│  │  └────────────────────┘ └────────────────┘                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Infrastructure Layer                       │ │
│  │                  (Node.js + External Services)              │ │
│  │                                                             │ │
│  │  ┌──────────┐ ┌───────┐ ┌──────────┐ ┌──────────────────┐ │ │
│  │  │ Drizzle  │ │Upstash│ │ R2       │ │ BullMQ + WS      │ │ │
│  │  │ (Neon)   │ │(Redis)│ │ (storage)│ │ (jobs + chat)    │ │ │
│  │  └──────────┘ └───────┘ └──────────┘ └──────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 13. Architecture Decision Records (ADR)

### ADR-001: Monorepo con pnpm + Turborepo

**Status:** Accepted

**Contesto:**
Il progetto richiede condivisione di codice (tipi, validazione, utility) tra frontend mobile e backend. Le opzioni valutate sono: (a) monorepo con pnpm workspaces + Turborepo, (b) monorepo con Nx, (c) repository separati con pacchetti npm privati.

**Decisione:**
Adottare pnpm workspaces con Turborepo.

**Motivazioni:**
- pnpm e il package manager piu efficiente in termini di spazio disco e velocita di installazione (content-addressable storage)
- Turborepo fornisce caching intelligente, task parallelization e pipeline dependency graph con zero configurazione complessa
- Nx e piu potente ma introduce complessita non necessaria per un team piccolo (3-5 sviluppatori)
- Repository separati creerebbero friction nella condivisione dei tipi e rallenterebbero lo sviluppo

**Conseguenze:**
- Tutti i pacchetti condividono una singola `pnpm-lock.yaml`
- I CI build sono piu veloci grazie al remote caching di Turborepo
- Necessita di disciplina nel gestire le dipendenze tra packages

---

### ADR-002: tRPC invece di REST API

**Status:** Accepted

**Contesto:**
Serve un layer API tra il mobile app e il backend. Le opzioni valutate sono: (a) REST con OpenAPI/Swagger, (b) GraphQL con codegen, (c) tRPC.

**Decisione:**
Adottare tRPC come layer API primario.

**Motivazioni:**
- Type safety end-to-end senza code generation. Il client inferisce i tipi direttamente dal server. Qualsiasi modifica al contratto API genera errori TypeScript immediati sia lato server che client.
- Integrazione nativa con TanStack Query: caching, invalidation, optimistic updates, infinite queries sono built-in.
- Zero overhead di serializzazione per tipi complessi. I Zod schema del backend diventano automaticamente validatori dell'input.
- Il team e full-stack TypeScript. Tutti i consumer (mobile, web, admin) sono TypeScript. Nessun partner B2B nell'MVP.
- Supporto nativo per WebSocket subscriptions (necessario per chat real-time).
- Performance comparabile a REST puro (JSON over HTTP).

**Conseguenze:**
- Il contratto API non e documentabile con OpenAPI/Swagger. La documentazione e il codice stesso (tipi TypeScript).
- Se in futuro servira un'API pubblica (partner B2B, web app non-TS), sara necessario aggiungere un thin REST layer sopra il service layer.
- Il team deve familiarizzare con i pattern tRPC (procedure, middleware, subscriptions).

**Alternative scartate:**
- REST + OpenAPI: richiede code generation (openapi-typescript, orval), introduce drift tra spec e implementazione, non ha type safety nativa.
- GraphQL: over-engineering per un singolo consumer mobile. Complessita N+1, necessita di dataloader, schema stitching inutile.

---

### ADR-003: Hono su Node.js (Fly.io) invece di Fastify/Express

**Status:** Accepted (aggiornato -- Opzione B+ dal doc 10: Hono su Node.js con deploy su Fly.io)

**Contesto:**
Il backend necessita di un HTTP framework. Dopo il dibattito architetturale (doc 10), la decisione e di usare Hono su Node.js con deploy su Fly.io, combinando la leggerezza di Hono con la flessibilita di un runtime Node.js completo e il supporto WebSocket nativo di Fly.io.

**Decisione:**
Adottare Hono su Node.js, deploy su Fly.io (multi-region).

**Motivazioni:**
- Hono e multi-runtime: funziona su Node.js, Cloudflare Workers, Deno, Bun. Bundle leggero (~14KB).
- Fly.io offre WebSocket nativo senza limitazioni, ideale per la chat real-time.
- Node.js completo permette l'uso di librerie native (bcrypt, sharp, BullMQ) senza limitazioni edge.
- Middleware ricco: CORS, auth, rate limiting, logging, tutti nativi.
- Adapter tRPC via `@trpc/server/adapters/fetch` o `@hono/node-server`.
- Fly.io multi-region (Francoforte come primario) per bassa latenza in Italia/Europa.
- API familiare per sviluppatori Express/Fastify (app.get, app.post, middleware chain).

**Conseguenze:**
- I middleware Fastify/Express non sono compatibili. I middleware vanno riscritti per il modello Hono.
- Il WebSocket usa la libreria `ws` o `@hono/node-ws` nativa su Fly.io.
- L'entry point e `index.ts` con `@hono/node-server` per avviare il server Node.js.
- Deploy via Docker + `fly deploy` invece di `wrangler deploy`.

---

### ADR-004: Drizzle ORM invece di Prisma

**Status:** Accepted

**Contesto:**
Serve un ORM TypeScript per PostgreSQL. Le opzioni principali sono Prisma e Drizzle.

**Decisione:**
Adottare Drizzle ORM.

**Motivazioni:**
- SQL-first approach: le query Drizzle sono trasparenti, prevedibili e mappano 1:1 a SQL. Cruciale per le query geospaziali PostGIS dove servono raw queries con la stessa ergonomia.
- Zero codegen: lo schema Drizzle e codice TypeScript puro, senza `prisma generate`. Nessun client generato da sincronizzare.
- Bundle size minima: Drizzle non ha runtime pesante come Prisma Client (~2MB). Cruciale per Cloudflare Workers dove il bundle limit e 10MB.
- `drizzle-zod`: generazione automatica di Zod schema dalle tabelle, riduce duplicazione nella definizione dei tipi.
- Migration system semplice e basato su SQL puro (leggibile, versionabile, debuggabile).
- Supporto nativo per prepared statements e query parametriche.

**Conseguenze:**
- Le relazioni N:N e le nested queries richiedono piu codice manuale rispetto a Prisma
- L'ecosistema di tooling (studio, visualizzazione) e meno maturo di Prisma
- Le query PostGIS richiedono `sql.raw()` in alcuni casi

---

### ADR-005: Zustand + TanStack Query per State Management

**Status:** Accepted

**Contesto:**
L'app mobile necessita di gestire stato client (auth, UI) e stato server (dati da API). Le opzioni valutate: (a) Redux Toolkit + RTK Query, (b) Zustand + TanStack Query, (c) Jotai + TanStack Query.

**Decisione:**
Zustand per client state, TanStack Query (via tRPC) per server state.

**Motivazioni:**
- Zustand e minimale (~1KB), TypeScript-native, nessun boilerplate. Perfetto per stato locale come auth token, active dog selection, UI state.
- TanStack Query (integrato automaticamente con tRPC) gestisce tutta la complessita del server state: caching, background refetch, optimistic updates, retry, pagination.
- La separazione netta tra client state (Zustand) e server state (TanStack Query) evita i problemi di sincronizzazione tipici di Redux dove tutto viene messo in un unico store.
- Redux Toolkit aggiunge ~12KB e introduce pattern (slices, reducers, actions) piu verbosi del necessario per le dimensioni del progetto.

**Conseguenze:**
- Nessun DevTools avanzato come Redux DevTools (Zustand ha un middleware devtools basico)
- Lo stato offline richiede gestione manuale (MMKV per persistenza, coda messaggi in Zustand)

---

### ADR-006: Expo con Expo Router (non bare React Native)

**Status:** Accepted

**Contesto:**
L'app mobile deve supportare iOS e Android. Le opzioni: (a) Expo managed workflow con Expo Router, (b) bare React Native con React Navigation, (c) Flutter.

**Decisione:**
Expo SDK 52 con managed workflow e Expo Router v4.

**Motivazioni:**
- Expo Router fornisce file-based routing (come Next.js) che semplifica la navigazione e riduce il boilerplate rispetto a React Navigation
- EAS Build e EAS Update consentono build cloud e OTA updates senza configurare Xcode/Gradle localmente
- Il managed workflow copre tutti i requisiti MVP: camera, geolocation, push notifications, secure storage, maps
- Expo SDK 52 supporta la New Architecture di React Native (Fabric, TurboModules) per performance native
- Development builds consentono l'aggiunta di moduli nativi custom se necessario, senza uscire dall'ecosistema Expo
- Il team puo fare preview su dispositivo fisico via QR code, accelerando il feedback loop

**Conseguenze:**
- Alcune librerie native meno comuni potrebbero richiedere un config plugin o un development build
- Le build production richiedono un account EAS (gratuito per uso base, a pagamento per priority builds)
- OTA updates hanno limiti di dimensione (~50MB per bundle)

---

### ADR-007: PostgreSQL + PostGIS per Geolocation

**Status:** Accepted

**Contesto:**
Il matching richiede query geospaziali efficienti (trovare cani entro un raggio). Le opzioni: (a) PostgreSQL + PostGIS, (b) PostgreSQL con formula Haversine in SQL, (c) MongoDB con 2dsphere indexes, (d) Servizio dedicato (Elasticsearch con geo_point).

**Decisione:**
PostgreSQL con estensione PostGIS.

**Motivazioni:**
- PostGIS e lo standard industriale per query geospaziali. `ST_DWithin` con indice GIST ha complessita O(log n), molto superiore a Haversine su ogni riga.
- Un singolo database per tutti i dati (relazionali + geospaziali) riduce la complessita operativa.
- PostgreSQL e gia nel stack per i dati relazionali. Aggiungere PostGIS e un `CREATE EXTENSION`, non un nuovo servizio.
- Le query geospaziali dell'MVP sono semplici (distanza punto-punto entro raggio). Non servono operazioni complesse (polygon intersection, routing).
- PostGIS supporta il sistema di coordinate WGS 84 (SRID 4326) usato da tutti i dispositivi GPS.

**Conseguenze:**
- Le immagini Docker devono usare `postgis/postgis` invece di `postgres` standard
- Le query geo richiedono `sql.raw()` in Drizzle (nessun supporto ORM nativo per geography)
- La migrazione del campo location richiede SQL custom oltre alle migration Drizzle

---

### ADR-008: Upstash Redis + BullMQ + WebSocket nativo invece di Cloudflare KV/Queues/DO

**Status:** Accepted (aggiornato -- Opzione B+ dal doc 10: Fly.io + Upstash Redis)

**Contesto:**
Il sistema necessita di: (a) caching per ridurre il carico su PostgreSQL, (b) real-time per messaggi chat, (c) job queue per task asincroni. Con la migrazione a Fly.io (Node.js), si possono usare librerie Node.js mature come BullMQ e il modulo `ws` nativo.

**Decisione:**
- **Upstash Redis** per cache, sessioni, rate limiting (serverless, edge-compatible)
- **BullMQ** su Upstash Redis per job asincroni (moderazione foto, email, push)
- **WebSocket nativo** (libreria `ws`) su Fly.io per chat real-time

**Motivazioni:**
- Upstash Redis offre un Redis serverless con API REST e free tier generoso. Compatibile con BullMQ e qualsiasi client Redis standard.
- BullMQ e la libreria di job queue piu matura dell'ecosistema Node.js: priorita, retry, rate limiting, dashboard (BullBoard), repeatable jobs, dead letter queue.
- WebSocket nativo su Fly.io elimina la complessita dei Durable Objects e permette connessioni persistenti illimitate.
- Fly.io supporta WebSocket nativamente senza proxy layer aggiuntivi.
- Costo contenuto: Upstash Redis free tier per l'MVP, poi $10/mese (pro).

**Conseguenze:**
- Upstash Redis ha latenza leggermente superiore rispetto a un Redis self-hosted, ma sufficiente per cache e rate limiting.
- Per scalare oltre una singola istanza Fly.io, serve Redis Pub/Sub per coordinare i WebSocket tra le istanze.
- BullMQ richiede un processo worker (che puo girare sullo stesso processo Node.js dell'API).

---

### ADR-009: Nativewind (Tailwind) per Styling Mobile

**Status:** Accepted

**Contesto:**
Serve un sistema di styling per l'app React Native. Opzioni: (a) StyleSheet.create nativo, (b) Styled Components, (c) Nativewind (Tailwind CSS per RN), (d) Tamagui.

**Decisione:**
Nativewind v4 (Tailwind CSS compilato per React Native).

**Motivazioni:**
- Utility-first approach riduce la necessita di creare file di stile separati. Gli stili sono inline e leggibili.
- Coerenza con l'ecosistema web Tailwind: sviluppatori con esperienza Tailwind sono immediatamente produttivi.
- Nativewind v4 compila a StyleSheet.create nativo -- zero overhead runtime.
- Design tokens (colori, spacing, typography) configurati una volta nel `tailwind.config.js` e usati ovunque.
- Dark mode support nativo tramite classi `dark:`.

**Conseguenze:**
- Le classi Tailwind possono diventare verbose per componenti complessi. Mitigazione: usare `cva` (class-variance-authority) per varianti di componenti.
- Alcuni stili React Native non hanno equivalente Tailwind. In quei casi si usa `style` prop nativo.

---

### ADR-010: Strategia di Branching (GitHub Flow)

**Status:** Accepted

**Decisione:**
GitHub Flow con due branch protetti:

- `main` -- produzione, deploy automatico
- `develop` -- staging, deploy automatico

**Workflow:**
1. Feature branch da `develop`: `feat/nome-feature`
2. PR su `develop` con CI obbligatoria
3. Merge su `develop` -> deploy staging automatico
4. Release: PR da `develop` a `main` con approval obbligatoria
5. Merge su `main` -> deploy production automatico

**Naming convention branch:**
- `feat/` -- nuove funzionalita
- `fix/` -- bug fix
- `refactor/` -- refactoring senza cambio di comportamento
- `chore/` -- configurazione, dipendenze, CI

---

## 14. Appendice - Configurazioni

### 14.1 TypeScript Base Config

```json
// tooling/typescript/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

### 14.2 ESLint Flat Config (Base)

```javascript
// tooling/eslint/base.js
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" }
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  }
);
```

### 14.3 Comandi di Sviluppo

```bash
# Setup iniziale
pnpm install

# Avvio servizi locali (solo PostgreSQL + PostGIS)
docker compose -f docker/docker-compose.yml up -d

# Avvio development (tutti i workspace in parallelo)
pnpm turbo dev

# Solo backend
pnpm --filter @dogwalk/api dev

# Solo mobile
pnpm --filter @dogwalk/mobile dev

# Database
pnpm --filter @dogwalk/db db:push       # Push schema a DB (dev)
pnpm --filter @dogwalk/db db:migrate    # Run migrations (staging/prod)
pnpm --filter @dogwalk/db db:seed       # Seed data di sviluppo
pnpm --filter @dogwalk/db db:studio     # Drizzle Studio (DB browser)

# Quality
pnpm turbo lint                          # ESLint su tutto
pnpm turbo typecheck                     # tsc --noEmit su tutto
pnpm turbo test                          # Test su tutto

# Build
pnpm turbo build                         # Build tutti i packages
pnpm --filter @dogwalk/api build         # Build solo backend

# Mobile builds
eas build --platform ios --profile preview
eas build --platform android --profile preview
eas update --branch staging              # OTA update
```

---

> **Documento preparato da:** Software Architecture Team - DogWalk
> **Prossima revisione:** Aprile 2026 (post Sprint 2)
> **Distribuzione:** Engineering Team, Tech Lead, CTO

NOT FOUND
