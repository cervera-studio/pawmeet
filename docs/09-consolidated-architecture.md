# DogWalk - Architettura Consolidata (FONTE DI VERITA)

> **Versione:** 1.0
> **Data:** 9 marzo 2026
> **Autore:** CTO / Architecture Board
> **Stato:** Approvato
> **Classificazione:** Documento interno - Confidenziale
> **Priorita:** Questo documento PREVALE su tutti gli altri documenti architetturali (01-08) in caso di conflitto.

---

## Indice

1. [Conflitti Risolti](#1-conflitti-risolti)
2. [Struttura Monorepo Definitiva](#2-struttura-monorepo-definitiva)
3. [Tech Stack Definitivo](#3-tech-stack-definitivo)
4. [Architettura Cloudflare](#4-architettura-cloudflare)
5. [Costi Cloudflare Aggiornati](#5-costi-cloudflare-aggiornati)
6. [Piano di Implementazione Allineato](#6-piano-di-implementazione-allineato)
7. [Checklist Pre-Sviluppo](#7-checklist-pre-sviluppo)

---

## 1. Conflitti Risolti

Dall'analisi incrociata dei documenti 01-08, sono stati identificati i seguenti conflitti e incoerenze. Per ciascuno viene riportato: cosa diceva il documento originale, la decisione definitiva, e la motivazione.

### CONFLITTO 1: Framework Backend -- Fastify vs Hono

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | Fastify 5.x come HTTP framework, `@trpc/server` adapter per Fastify, `@fastify/websocket` per WebSocket | **Hono su Cloudflare Workers** |
| **Doc 07** (Web Architecture) | Hono su Cloudflare Workers, API client con `hono/client` | Confermato |
| **Doc 08** (Backoffice) | Hono su Cloudflare Workers | Confermato |

**Motivazione:** Fastify e un framework Node.js tradizionale che richiede un runtime Node.js completo (ECS Fargate, VM, container). La decisione strategica e di operare interamente su Cloudflare Workers, dove Fastify non puo girare. Hono e il framework edge-native per eccellenza, con supporto nativo per Cloudflare Workers, tipizzazione delle route, e un client RPC type-safe simile a tRPC. Il doc 03 era stato scritto prima della decisione definitiva sull'infrastruttura Cloudflare-only.

**Impatto:** L'entry point dell'API cambia da `server.ts` (Fastify) a `index.ts` (Hono Worker). I middleware vanno riscritti per il modello Hono. Il WebSocket passa da `@fastify/websocket` a Cloudflare Durable Objects.

---

### CONFLITTO 2: Cache e Job Queue -- Redis/BullMQ vs Cloudflare KV/Queues

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | Redis 7.x per cache, sessioni, pub/sub. BullMQ 5.x per job queue. ioredis 5.x come client. Docker Compose con Redis per dev. | **Cloudflare KV** per cache e sessioni. **Cloudflare Queues** per job asincroni. |
| **Doc 07** (Web Architecture) | Cloudflare KV per caching | Confermato |

**Motivazione:** Redis richiede un server sempre attivo (ElastiCache, Upstash, etc.) con costi fissi e gestione separata. Cloudflare KV e un key-value store globale edge-native con free tier generoso, perfettamente integrato con Workers. Cloudflare Queues sostituisce BullMQ per i job asincroni (moderazione foto, invio push, email). Il rate limiting passa da Redis-based a KV-based o a Cloudflare native rate limiting.

**Impatto:** Eliminazione completa di Redis dallo stack. I background jobs vanno ripensati come consumer di Cloudflare Queues invece che worker BullMQ. Il pub/sub per chat real-time passa a Durable Objects.

---

### CONFLITTO 3: File Storage -- AWS S3/MinIO vs Cloudflare R2

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | MinIO per dev, AWS S3 per produzione. `@aws-sdk/client-s3` come client. Presigned URL per upload diretto a S3. CloudFront come CDN per immagini. | **Cloudflare R2** per storage. CDN Cloudflare integrato. |
| **Doc 07** (Web Architecture) | Cloudflare R2 + Cloudflare Images per resize on-the-fly | Confermato |

**Motivazione:** R2 e API-compatibile con S3 ma senza egress fee (costo banda in uscita zero). Si integra nativamente con Workers e Pages. Cloudflare Images gestisce il resize on-the-fly senza bisogno di job asincroni con Sharp. L'`@aws-sdk/client-s3` resta utilizzabile perche R2 espone un'interfaccia S3-compatible.

**Impatto:** Eliminazione di MinIO dal docker-compose di dev. Eliminazione di CloudFront. I presigned URL si generano tramite R2 API. Il job `photo:resize` con Sharp viene eliminato, sostituito da Cloudflare Images transform on-the-fly.

---

### CONFLITTO 4: CDN -- CloudFront vs Cloudflare

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | CloudFront per distribuzione immagini | **Cloudflare CDN** (built-in con R2 e Pages) |
| **Doc 04** (Budget) | Costi CloudFront in budget ($0.085/GB EU) | Cloudflare CDN incluso, egress R2 gratuito |

**Motivazione:** Cloudflare CDN e built-in con tutti i servizi Cloudflare. R2 non ha costi di egress. Nessun bisogno di un CDN separato.

---

### CONFLITTO 5: Infrastruttura Cloud -- AWS vs Cloudflare

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 04** (Budget) | AWS come cloud provider. ECS Fargate per compute. RDS PostgreSQL. ElastiCache Redis. S3 + CloudFront. API Gateway WebSocket. SES per email. Stima 87-4.420 EUR/mese. | **Cloudflare per tutto** tranne il database (Neon). |
| **Doc 07** (Web Architecture) | Cloudflare Pages, Workers, R2, KV, D1 | Confermato |
| **Doc 08** (Backoffice) | Cloudflare Pages per hosting, Workers per API | Confermato |

**Motivazione:** Cloudflare offre un free tier estremamente generoso (100K req/day su Workers, 10GB su R2, KV free tier). L'architettura edge-first elimina cold start, riduce la latenza, e semplifica il deployment. I costi sono radicalmente inferiori ad AWS per il nostro volume di traffico. Il database resta su Neon (PostgreSQL serverless edge-compatible) perche Cloudflare D1 (SQLite) non supporta PostGIS.

---

### CONFLITTO 6: Database hosting -- Generico vs Neon

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | PostgreSQL 16.x generico (implicito self-hosted o RDS) | **Neon** (PostgreSQL serverless, edge-compatible) |
| **Doc 04** (Budget) | RDS PostgreSQL con costi da $25 a $1.400/mese | Neon con free tier (0.5GB) poi pay-per-use |
| **Doc 07** (Web Architecture) | PostgreSQL su Neon | Confermato |

**Motivazione:** Neon e PostgreSQL serverless che supporta branching (un database per ogni PR), auto-scaling a zero, e connessioni HTTP/WebSocket edge-compatible. Questo lo rende perfetto per Cloudflare Workers che non supportano connessioni TCP persistenti. PostGIS e pienamente supportato su Neon.

---

### CONFLITTO 7: Real-time/WebSocket -- Socket.io/Fastify WS vs Durable Objects

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 02** (MVP Spec) | Menziona "WebSocket con TLS 1.3" genericamente | **Cloudflare Durable Objects** per chat real-time |
| **Doc 03** (Architecture) | `@fastify/websocket` per WebSocket, Redis Pub/Sub per fanout | **Cloudflare Durable Objects** |
| **Doc 05** (Roadmap) | "Socket.io / Firebase Realtime" per chat | **Cloudflare Durable Objects** |

**Motivazione:** Cloudflare Workers non supporta WebSocket server tradizionali. I Durable Objects offrono WebSocket con stato persistente, perfetti per le chat room. Ogni match diventa un Durable Object con la sua coppia di WebSocket. Nessun bisogno di Redis Pub/Sub o di un server WebSocket separato.

---

### CONFLITTO 8: Email -- Nodemailer/SES vs Resend/CF Email Workers

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | Nodemailer 6.x per email transazionali | **Resend** (o Cloudflare Email Workers in futuro) |
| **Doc 04** (Budget) | AWS SES ($0.10/1.000 email) | Resend (free tier 100 email/giorno, poi $20/mese per 50K) |

**Motivazione:** Nodemailer richiede un server SMTP e non funziona su Cloudflare Workers. Resend offre un'API HTTP edge-compatible, con SDK leggero, ottima DX, e un free tier sufficiente per l'MVP. In alternativa futura, Cloudflare Email Workers per invio diretto.

---

### CONFLITTO 9: Content Moderation -- AWS Rekognition vs alternativa edge

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 02** (MVP Spec) | AWS Rekognition per moderazione foto | **Cloudflare Workers AI** (modello NSFW classification) oppure **Hive Moderation** via API |
| **Doc 03** (Architecture) | AWS Rekognition per scansione contenuti | Workers AI o Hive Moderation |

**Motivazione:** AWS Rekognition richiede chiamate cross-cloud. Cloudflare Workers AI offre modelli di classificazione immagini eseguibili direttamente sull'edge, eliminando latenza e dipendenze esterne. Se la qualita non e sufficiente per l'MVP, Hive Moderation offre un'API HTTP chiamabile da Workers.

---

### CONFLITTO 10: Naming dei Shared Packages

| Package | Doc 03 | Doc 07 | Doc 08 | Decisione definitiva |
|---------|--------|--------|--------|---------------------|
| Tipi condivisi | `@dogwalk/shared-types` | `@dogwalk/types` | `@dogwalk/types` | **`@dogwalk/types`** |
| Validazione | `@dogwalk/validation` | `@dogwalk/validation` | `@dogwalk/validators` | **`@dogwalk/validation`** |
| Costanti | `@dogwalk/constants` | (merge in config) | `@dogwalk/config` | **`@dogwalk/config`** (include costanti, enum, config condivise) |
| UI | `@dogwalk/ui` | `@dogwalk/ui` | `@dogwalk/ui` | **`@dogwalk/ui`** |
| Utils | `@dogwalk/utils` | `@dogwalk/utils` | (non menzionato) | **`@dogwalk/utils`** |
| API Client | (non presente) | `@dogwalk/api-client` | (non presente) | **`@dogwalk/api-client`** |
| DB | (dentro apps/api) | (non presente) | (non presente) | **`@dogwalk/db`** (estratto come package condiviso) |
| ESLint config | `@dogwalk/eslint-config` | (in config) | (non presente) | Merge in **`tooling/`** directory |

**Motivazione:** Uniformare i nomi in tutto il monorepo. Il doc 08 usava `@dogwalk/validators` (plurale), standardizzato a `@dogwalk/validation` (singolare, coerente con doc 03 e 07). Il doc 03 usava `@dogwalk/shared-types`, semplificato a `@dogwalk/types`. Il package `@dogwalk/constants` viene fuso in `@dogwalk/config` per ridurre la frammentazione.

---

### CONFLITTO 11: API Layer -- tRPC vs Hono RPC

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | tRPC 11.x come API layer, con adapter Fastify | **tRPC** su Hono (adapter `@trpc/server/adapters/fetch`) |
| **Doc 07** (Web Architecture) | Hono RPC client (`hono/client`) per type-safety | tRPC per API mobile e web app, con Hono come HTTP framework sottostante |

**Motivazione:** tRPC e Hono RPC risolvono lo stesso problema (type-safe API) ma tRPC e piu maturo per le subscription WebSocket e ha un ecosistema piu ricco di middleware. Hono serve come HTTP framework (routing, middleware, CORS) e tRPC come API layer type-safe sopra Hono. L'adapter `@trpc/server/adapters/fetch` funziona nativamente su Cloudflare Workers. Il `@dogwalk/api-client` usa il client tRPC, non `hono/client`.

---

### CONFLITTO 12: Struttura API backend -- db dentro apps/api vs package separato

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | Schema Drizzle, migrations e seed dentro `apps/api/src/db/` | **`packages/db/`** come package `@dogwalk/db` separato |

**Motivazione:** Lo schema del database e le migrations devono essere accessibili sia dall'API che dal backoffice (per query dirette e per i tipi delle tabelle). Estrarre in un package condiviso evita duplicazione e garantisce un'unica fonte di verita per lo schema.

---

### CONFLITTO 13: Monitoring e Analytics

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 04** (Budget) | Sentry + New Relic + Mixpanel + Datadog | **Sentry** (error tracking) + **Cloudflare Analytics** (infra) |
| **Doc 07** (Web Architecture) | Cloudflare Web Analytics + Plausible | Cloudflare Web Analytics per web marketing |

**Motivazione:** Sentry e lo standard per error tracking su mobile e Workers. Cloudflare Analytics e gratuito e built-in. Per product analytics (funnel, cohort) si puo aggiungere PostHog self-hosted o Plausible in futuro, ma non e critico per l'MVP. Eliminazione di Datadog, New Relic, e Mixpanel per ridurre complessita e costi.

---

### CONFLITTO 14: Docker Compose per development

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | `docker-compose.yml` con PostgreSQL + Redis + MinIO | **`docker-compose.yml`** solo con PostgreSQL + PostGIS (per dev locale). Redis e MinIO eliminati. |

**Motivazione:** Redis sostituito da Cloudflare KV (emulato localmente via `wrangler dev`). MinIO sostituito da R2 (emulato localmente via `wrangler dev --r2`). Solo PostgreSQL richiede un container Docker locale perche Neon non ha un emulatore locale (in alternativa, si puo usare Neon branching per environment di dev).

---

### CONFLITTO 15: Architettura mobile -- "React Native / Flutter" ambiguita

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 02** (MVP Spec) | "React Native / Flutter -- cross-platform" nell'architettura funzionale | **Expo SDK 52+ con Expo Router** (React Native) |
| **Doc 05** (Roadmap) | "React Native / Flutter" nella descrizione competenze | Expo (React Native) |

**Motivazione:** I doc 02 e 05 lasciavano ambiguita tra React Native e Flutter. La scelta definitiva e Expo (React Native) per condivisione dei tipi TypeScript, dei package di validazione Zod, e dei componenti UI React con la web app e il backoffice.

---

### CONFLITTO 16: Auth backend -- Service Blueprint

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 06** (UX/UI) | Menziona "Firebase/Supabase" come backstage auth | **Lucia Auth o custom JWT** su Cloudflare Workers |

**Motivazione:** Firebase Auth aggiunge una dipendenza esterna non necessaria. Lucia Auth e una libreria di autenticazione leggera, edge-compatible, con supporto per sessioni e JWT. In alternativa, un'implementazione custom JWT con bcrypt (via `@noble/hashes` per edge compatibility) e pienamente funzionante su Workers.

---

### CONFLITTO 17: Landing page pre-lancio

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 04** (Budget) | "Dominio + hosting + sviluppo (template Webflow/Framer)" per la landing page, costo 500 EUR | **Astro su Cloudflare Pages** (incluso nel monorepo) |

**Motivazione:** La landing page e gia prevista come parte di `apps/web/` nel monorepo (doc 07). Non serve Webflow/Framer. Il costo di sviluppo e incluso nel lavoro del team frontend. Il dominio resta un costo separato (~200 EUR/anno).

---

## 2. Struttura Monorepo Definitiva

```
dogwalk/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                        # Lint, type-check, test su ogni PR
│   │   ├── deploy-preview.yml            # Deploy preview per PR (EAS Update + CF Pages preview)
│   │   ├── deploy-staging.yml            # Deploy staging su merge in develop
│   │   └── deploy-production.yml         # Deploy production su merge in main
│   ├── CODEOWNERS
│   └── pull_request_template.md
│
├── apps/
│   ├── mobile/                           # Expo SDK 52+ (React Native)
│   │   ├── app/                          # Expo Router v4 - file-based routing
│   │   │   ├── (auth)/                   # Route group: schermate auth
│   │   │   │   ├── login.tsx
│   │   │   │   ├── register.tsx
│   │   │   │   └── forgot-password.tsx
│   │   │   ├── (onboarding)/             # Route group: onboarding flow
│   │   │   │   ├── welcome.tsx
│   │   │   │   ├── owner-profile.tsx
│   │   │   │   ├── dog-basics.tsx
│   │   │   │   ├── dog-physical.tsx
│   │   │   │   ├── dog-behavior.tsx
│   │   │   │   ├── dog-photos.tsx
│   │   │   │   └── permissions.tsx
│   │   │   ├── (tabs)/                   # Route group: tab navigation
│   │   │   │   ├── _layout.tsx           # Tab layout con bottom nav
│   │   │   │   ├── discover/
│   │   │   │   │   ├── index.tsx         # Feed swipe cards
│   │   │   │   │   └── [dogId].tsx       # Profilo cane espanso
│   │   │   │   ├── matches/
│   │   │   │   │   ├── index.tsx         # Lista match attivi
│   │   │   │   │   └── [matchId].tsx     # Chat con match
│   │   │   │   ├── map/
│   │   │   │   │   └── index.tsx         # Mappa cani nelle vicinanze
│   │   │   │   └── profile/
│   │   │   │       ├── index.tsx         # Il mio profilo
│   │   │   │       ├── dogs/
│   │   │   │       │   ├── [dogId]/
│   │   │   │       │   │   └── edit.tsx
│   │   │   │       │   └── new.tsx
│   │   │   │       ├── settings.tsx
│   │   │   │       └── privacy.tsx
│   │   │   ├── _layout.tsx               # Root layout (providers, auth guard)
│   │   │   └── +not-found.tsx
│   │   ├── assets/                       # Immagini, font, animazioni Lottie
│   │   ├── components/                   # Componenti specifici app mobile
│   │   │   ├── cards/
│   │   │   ├── chat/
│   │   │   ├── dog/
│   │   │   ├── map/
│   │   │   └── onboarding/
│   │   ├── hooks/                        # Custom hooks specifici mobile
│   │   ├── services/                     # API client, storage, location
│   │   ├── stores/                       # Zustand stores
│   │   ├── styles/                       # Theme e stili globali (NativeWind)
│   │   ├── app.json
│   │   ├── eas.json
│   │   ├── metro.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── api/                              # Hono su Cloudflare Workers
│   │   ├── src/
│   │   │   ├── index.ts                  # Entry point: Hono app + tRPC adapter
│   │   │   ├── config/
│   │   │   │   └── env.ts                # Validazione env/bindings con Zod
│   │   │   ├── trpc/
│   │   │   │   ├── index.ts              # tRPC init, context, middleware
│   │   │   │   ├── router.ts             # Root router (merge tutti i router)
│   │   │   │   └── middleware/
│   │   │   │       ├── auth.ts           # JWT verification middleware
│   │   │   │       ├── rateLimit.ts      # Rate limiting (KV-based)
│   │   │   │       └── logging.ts        # Request logging
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.router.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   └── providers/
│   │   │   │   ├── user/
│   │   │   │   ├── dog/
│   │   │   │   ├── matching/
│   │   │   │   │   └── algorithm/
│   │   │   │   ├── chat/
│   │   │   │   │   └── chat.durable-object.ts  # Durable Object per chat room
│   │   │   │   ├── notification/
│   │   │   │   ├── upload/
│   │   │   │   ├── moderation/
│   │   │   │   └── admin/                # Endpoint admin (protetti RBAC)
│   │   │   ├── queues/                   # Consumer Cloudflare Queues
│   │   │   │   ├── photo-moderation.ts
│   │   │   │   ├── push-notification.ts
│   │   │   │   ├── email.ts
│   │   │   │   └── cleanup.ts
│   │   │   └── utils/
│   │   │       ├── geo.ts                # PostGIS helpers
│   │   │       ├── jwt.ts                # JWT sign/verify (edge-compatible)
│   │   │       └── errors.ts
│   │   ├── wrangler.toml                 # Configurazione Workers, bindings
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
│   └── admin/                            # Refine + Ant Design su Cloudflare Pages
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── config/
│       │   ├── providers/
│       │   │   ├── auth-provider.ts
│       │   │   ├── data-provider.ts       # Data provider custom per API Hono/tRPC
│       │   │   ├── access-control-provider.ts
│       │   │   └── live-provider.ts       # WebSocket Durable Objects
│       │   ├── modules/
│       │   │   ├── dashboard/
│       │   │   ├── moderation/
│       │   │   ├── users/
│       │   │   ├── dogs/
│       │   │   ├── analytics/
│       │   │   ├── content/
│       │   │   ├── system/
│       │   │   └── admin-management/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── utils/
│       │   └── styles/
│       ├── vite.config.ts
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
│   ├── typescript/
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
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .gitignore
├── .nvmrc                               # Node.js 20 LTS
└── .node-version
```

### Workspace Configuration

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

## 3. Tech Stack Definitivo

### 3.1 Runtime e Tooling

| Tecnologia | Versione | Ruolo | Giustificazione |
|-----------|----------|-------|-----------------|
| **Node.js** | 20 LTS | Runtime per build e tooling | LTS stabile, richiesto da Expo e Turborepo |
| **TypeScript** | ~5.4 | Linguaggio su tutto lo stack | Type safety end-to-end |
| **pnpm** | >=9.0 | Package manager | Workspace-native, efficiente su disco |
| **Turborepo** | >=2.0 | Build system e task orchestration | Caching remoto, task parallelizzati |

### 3.2 Frontend Mobile

| Tecnologia | Versione | Ruolo | Giustificazione |
|-----------|----------|-------|-----------------|
| **Expo** | SDK 52+ | Framework React Native | Managed workflow, EAS Build, OTA updates |
| **Expo Router** | v4 | File-based routing | Convenzione chiara, deep linking nativo |
| **React Native** | 0.76.x (via Expo) | UI framework mobile | Cross-platform, ecosistema maturo |
| **NativeWind** | ~4.x | Styling (Tailwind per RN) | Coerenza con Tailwind CSS web |
| **Zustand** | ~5.0 | State management client | Leggero (1KB), TS-first, no boilerplate |
| **TanStack Query** | ~5.x | Server state, caching, sync | Deduplication, optimistic updates, offline |
| **React Native Reanimated** | ~3.x | Animazioni (swipe gestures) | Performance nativa (UI thread) |
| **React Native Gesture Handler** | ~2.x | Gesture recognition | Swipe cards, pull-to-refresh |
| **React Native Maps** | ~1.x | Mappa nativa | Google/Apple Maps |
| **Expo Location** | ~17.x | Geolocalizzazione | API unificata iOS/Android |
| **Expo Notifications** | ~0.29.x | Push notifications | Expo Push API |
| **Expo Image** | ~2.x | Image loading | Caching, progressive loading |
| **Expo SecureStore** | ~14.x | Storage sicuro per token | Keychain (iOS) / Keystore (Android) |
| **React Native MMKV** | ~3.x | Storage locale veloce | 10x piu veloce di AsyncStorage |
| **React Hook Form** | ~7.x | Gestione form | Validazione con Zod, performance |
| **Lucide React Native** | ~0.4x | Icon set | Leggero, tree-shakeable |
| **date-fns** | ~4.x | Manipolazione date | Modulare, tree-shakeable |

### 3.3 Backend (Cloudflare Workers)

| Tecnologia | Versione | Ruolo | Giustificazione |
|-----------|----------|-------|-----------------|
| **Hono** | ~4.x | HTTP framework | Edge-native, leggero (14KB), middleware ricco |
| **tRPC** | ~11.x | Type-safe API layer | End-to-end type safety, subscriptions |
| **Drizzle ORM** | ~0.35.x | ORM type-safe | SQL-first, leggero, edge-compatible |
| **@neondatabase/serverless** | latest | PostgreSQL driver | HTTP/WebSocket, edge-compatible |
| **Zod** | ~3.23 | Validazione runtime | Condiviso con frontend |
| **@noble/hashes** | latest | Password hashing (bcrypt alternative) | Edge-compatible (no native bindings) |
| **jose** | ~5.x | JWT sign/verify | Edge-compatible, standard Web Crypto API |
| **expo-server-sdk** | ~3.x | Invio push notification | API Expo Push ufficiale |

### 3.4 Database e Storage

| Tecnologia | Ruolo | Giustificazione |
|-----------|-------|-----------------|
| **PostgreSQL 16 (Neon)** | Database relazionale primario | Serverless, auto-scaling, branching per PR, edge-compatible |
| **PostGIS 3.4** | Estensione geospaziale | Query ST_DWithin per matching geografico |
| **Cloudflare R2** | Object storage (foto cani) | S3-compatible, zero egress fee |
| **Cloudflare KV** | Cache, sessioni, rate limiting | Edge-native, eventually consistent, free tier |
| **Cloudflare D1** | Storage ausiliario leggero | Feature flags, config, waitlist (SQLite edge) |
| **Cloudflare Durable Objects** | Chat real-time (WebSocket con stato) | Stato persistente per room, WebSocket nativo |
| **Cloudflare Queues** | Job asincroni | Moderazione foto, email, push, cleanup |

### 3.5 Web Marketing (apps/web)

| Tecnologia | Versione | Ruolo | Giustificazione |
|-----------|----------|-------|-----------------|
| **Astro** | 5.x | SSG/SSR marketing site | Zero JS di default, Content Collections, adapter CF nativo |
| **React** | 19.x | Islands interattivi + SPA (fase 2) | Condivisione con mobile e backoffice |
| **Tailwind CSS** | 4.x | Styling web | Utility-first, tree-shaking, coerenza con NativeWind |
| **TanStack Router** | latest | Routing SPA (fase 2) | Type-safe, code splitting |

### 3.6 Backoffice (apps/admin)

| Tecnologia | Versione | Ruolo | Giustificazione |
|-----------|----------|-------|-----------------|
| **Refine** | 4.x | Admin framework headless | CRUD rapido, RBAC, TanStack Query nativo |
| **Ant Design** | 5.x | UI library | Tabelle potenti, form, componenti enterprise |
| **Vite** | 6.x | Build tool | HMR veloce, SPA output per CF Pages |
| **Recharts** | 2.x | Grafici dashboard | Framework-agnostic, leggero |
| **React Router** | 7.x | Routing admin | Supportato nativamente da Refine |

### 3.7 Auth

| Tecnologia | Ruolo | Giustificazione |
|-----------|-------|-----------------|
| **Lucia Auth** (o custom JWT) | Autenticazione e sessioni | Edge-compatible, zero dipendenze esterne |
| **jose** | JWT signing/verification | Standard Web Crypto API, edge-native |
| **OAuth** | Google + Apple Sign-In | Provider sociali richiesti dall'MVP |

### 3.8 Servizi Esterni

| Servizio | Ruolo | Giustificazione |
|---------|-------|-----------------|
| **Resend** | Email transazionali | API HTTP, edge-compatible, free tier 100/day |
| **Mapbox** | Mappe (mobile + web) | Pricing competitivo, SDK performante |
| **Cloudflare Turnstile** | Anti-bot per form web | Gratuito, privacy-first, nativo CF |
| **Cloudflare Workers AI** | Moderazione immagini | On-edge, nessuna dipendenza esterna |

### 3.9 Testing

| Tecnologia | Ruolo |
|-----------|-------|
| **Vitest** | Unit + integration backend e web |
| **Jest** | Test runner mobile (via Expo) |
| **React Native Testing Library** | Component testing mobile |
| **Playwright** | E2E testing web |
| **MSW** | API mocking |

### 3.10 DevOps e Quality

| Tecnologia | Ruolo |
|-----------|-------|
| **GitHub Actions** | CI/CD |
| **EAS Build** | Build cloud per Expo (iOS + Android) |
| **EAS Update** | OTA updates |
| **Sentry** | Error tracking e performance |
| **Cloudflare Analytics** | Web analytics + infra monitoring |
| **ESLint** (flat config) | Linting |
| **Prettier** | Code formatting |
| **Husky + lint-staged** | Pre-commit hooks |
| **Commitlint** | Conventional commits |

---

## 4. Architettura Cloudflare

### 4.1 Diagramma dei Servizi

```
                          ┌──────────────────────────────────────────┐
                          │           Cloudflare Network              │
                          │         (CDN + Edge + DDoS)               │
                          └──────────┬──────────┬────────────────────┘
                                     │          │
                    ┌────────────────┘          └────────────────┐
                    │                                            │
         ┌──────────▼──────────┐                    ┌───────────▼──────────┐
         │  Cloudflare Pages    │                    │  Cloudflare Workers   │
         │                      │                    │  (api.dogwalk.app)    │
         │  dogwalk.app (web)   │                    │                      │
         │  admin.dogwalk.app   │                    │  Hono + tRPC         │
         │                      │                    │                      │
         │  ┌────────────────┐  │                    │  ┌────────────────┐  │
         │  │ Astro SSG/SSR  │  │    API calls       │  │  Auth Module   │  │
         │  │ (marketing)    │──┼───────────────────▶│  │  User Module   │  │
         │  └────────────────┘  │                    │  │  Dog Module    │  │
         │  ┌────────────────┐  │                    │  │  Match Module  │  │
         │  │ React SPA      │  │    API calls       │  │  Chat Module   │  │
         │  │ (web app ph2)  │──┼───────────────────▶│  │  Upload Module │  │
         │  └────────────────┘  │                    │  │  Notification  │  │
         │  ┌────────────────┐  │                    │  │  Admin Module  │  │
         │  │ Refine SPA     │  │    Admin API       │  └───────┬────────┘  │
         │  │ (backoffice)   │──┼───────────────────▶│          │           │
         │  └────────────────┘  │                    └──────────┼───────────┘
         └──────────────────────┘                               │
                                                                │
                    ┌───────────────────────────────────────────┘
                    │
    ┌───────────────┼────────────────┬──────────────────┬──────────────────┐
    │               │                │                  │                  │
    ▼               ▼                ▼                  ▼                  ▼
┌────────┐   ┌──────────┐    ┌────────────┐    ┌──────────────┐   ┌───────────┐
│  Neon   │   │    R2    │    │     KV     │    │   Durable    │   │  Queues   │
│ (PgSQL) │   │ (storage)│    │  (cache)   │    │  Objects     │   │  (jobs)   │
│         │   │          │    │            │    │  (chat WS)   │   │           │
│ PostGIS │   │ Foto cani│    │ Sessions   │    │              │   │ Photo mod │
│ Schema  │   │ Media    │    │ Rate limit │    │ 1 DO per     │   │ Push send │
│ Drizzle │   │ Avatar   │    │ Cache API  │    │ match/room   │   │ Email     │
└────────┘   └──────────┘    └────────────┘    └──────────────┘   └───────────┘
                                                                        │
                                                                        ▼
                                                                  ┌───────────┐
                                                                  │  Workers  │
                                                                  │    AI     │
                                                                  │ (NSFW    │
                                                                  │  detect)  │
                                                                  └───────────┘

Servizi Esterni:
┌────────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐
│   Resend   │  │  Mapbox  │  │  Sentry  │  │ Expo Push  │  │  Apple/  │
│  (email)   │  │  (mappe) │  │ (errors) │  │   API      │  │  Google  │
│            │  │          │  │          │  │            │  │  OAuth   │
└────────────┘  └──────────┘  └──────────┘  └────────────┘  └──────────┘
```

### 4.2 Dettaglio Servizi Cloudflare

| Servizio | Uso in DogWalk | Binding name | Note |
|---------|----------------|-------------|------|
| **Workers** | API backend (Hono + tRPC) | -- | Deploy su `api.dogwalk.app` |
| **Pages** | Web marketing + Admin SPA | -- | `dogwalk.app` + `admin.dogwalk.app` |
| **R2** | Storage foto cani, avatar | `PHOTOS_BUCKET` | Accesso via presigned URL o binding diretto |
| **KV** | Cache sessioni, rate limiting, feature flags | `CACHE`, `SESSIONS`, `RATE_LIMIT` | Eventually consistent, TTL configurabile |
| **D1** | Waitlist, feature flags, config leggera | `DB_D1` | SQLite edge, per dati non relazionali complessi |
| **Durable Objects** | Chat room WebSocket | `CHAT_ROOM` | 1 DO per match, stato persistente |
| **Queues** | Job asincroni | `PHOTO_QUEUE`, `PUSH_QUEUE`, `EMAIL_QUEUE` | Producer/consumer pattern |
| **Workers AI** | Classificazione NSFW foto | `AI` | Modello on-edge |
| **Cloudflare Images** | Resize on-the-fly foto cani | -- | Transform via URL (`/cdn-cgi/image/`) |
| **Turnstile** | Anti-bot form web (waitlist, contatti) | -- | Gratuito, GDPR-friendly |

### 4.3 Flusso Upload Foto

```
1. Mobile/Web richiede presigned URL → API Worker
2. API genera presigned URL per R2 → restituisce al client
3. Client upload diretto a R2 (PUT)
4. Client conferma upload → API Worker
5. API pubblica messaggio su PHOTO_QUEUE
6. Consumer Queue: Workers AI classifica NSFW
7. Se approvata: status = "approved", foto visibile
8. Se rifiutata: status = "rejected", notifica utente
9. Immagini servite via Cloudflare Images (resize on-the-fly)
```

### 4.4 Flusso Chat Real-time (Durable Objects)

```
1. Utente apre chat di un match → WebSocket connect
2. Worker instrada al Durable Object del match (ID = matchId)
3. DO mantiene lo stato della room (utenti connessi, typing)
4. Messaggio inviato → DO broadcast all'altro utente
5. DO persiste il messaggio nel database (via Neon HTTP)
6. Se destinatario offline → pubblica su PUSH_QUEUE
7. Consumer Queue: invio push notification via Expo Push API
```

---

## 5. Costi Cloudflare Aggiornati

### 5.1 Pricing Cloudflare (marzo 2026)

| Servizio | Free Tier | Pricing oltre free tier |
|---------|-----------|------------------------|
| **Workers** | 100.000 req/giorno, 10ms CPU/req | $5/mese per 10M req inclusi, poi $0.50/M req |
| **KV** | 100.000 letture/giorno, 1.000 scritture/giorno, 1GB storage | $5/mese per 10M letture, $0.50/M letture addizionali |
| **R2** | 10GB storage, 10M Class A ops (PUT), 10M Class B ops (GET) | $0.015/GB/mese storage, $4.50/M Class A, $0.36/M Class B |
| **Pages** | Illimitato (build, bandwidth, siti) | Gratuito (anche piano Pro) |
| **Durable Objects** | Incluso nel piano Workers Paid ($5/mese) | $0.15/M richieste, $12.50/M GB-sec durata |
| **Queues** | 1M operazioni/mese | $0.40/M operazioni |
| **D1** | 5GB storage, 5M righe lette/giorno, 100K scritte/giorno | $0.75/M righe lette, $1.00/M righe scritte |
| **Workers AI** | 10.000 neuroni/giorno (free) | Variabile per modello |
| **Cloudflare Images** | Non ha free tier per transforms | $5/mese per 5.000 transform unique, poi $1/5.000 |

### 5.2 Costi Neon (PostgreSQL)

| Piano | Storage | Compute | Costo |
|-------|---------|---------|-------|
| **Free** | 0.5GB | 0.25 vCPU, auto-suspend | $0/mese |
| **Launch** | 10GB incluso | 1 vCPU, auto-suspend | $19/mese |
| **Scale** | 50GB incluso | 4 vCPU, auto-scaling | $69/mese |
| **Business** | 500GB incluso | 8 vCPU, always-on | $700/mese |

### 5.3 Stima Mensile per Scaglione Utenti

#### 1.000 utenti (alpha/beta)

| Servizio | Configurazione | Costo/mese (EUR) |
|---------|----------------|:----------------:|
| Workers (API) | ~50K req/giorno (free tier) | 0 |
| KV (cache) | ~30K letture/giorno (free tier) | 0 |
| R2 (foto, ~2GB) | Free tier | 0 |
| Pages (web + admin) | Free | 0 |
| Durable Objects (chat) | ~10K req/giorno (Workers Paid) | 5 |
| Queues (jobs) | ~100K ops/mese (free tier) | 0 |
| D1 (config) | Free tier | 0 |
| Workers AI (moderazione) | Free tier | 0 |
| Neon (PostgreSQL) | Free tier (0.5GB) | 0 |
| **Totale Cloudflare + Neon** | | **~5** |

#### 10.000 utenti (espansione citta)

| Servizio | Configurazione | Costo/mese (EUR) |
|---------|----------------|:----------------:|
| Workers (API) | ~500K req/giorno | 5 (piano paid base) |
| KV (cache) | ~300K letture/giorno | 5 (incluso nel piano) |
| R2 (foto, ~30GB) | 30GB storage + ops | 5 |
| Pages (web + admin) | Free | 0 |
| Durable Objects (chat) | ~200K req/mese | 5 (incluso) |
| Queues (jobs) | ~2M ops/mese | 2 |
| D1 | Free tier sufficiente | 0 |
| Workers AI | ~50K classificazioni | 0 |
| Neon (PostgreSQL) | Launch (10GB) | 19 |
| Cloudflare Images | ~10K transforms | 10 |
| **Totale** | | **~51** |

#### 50.000 utenti (trazione Italia)

| Servizio | Configurazione | Costo/mese (EUR) |
|---------|----------------|:----------------:|
| Workers (API) | ~3M req/giorno | 15 |
| KV (cache) | ~2M letture/giorno | 10 |
| R2 (foto, ~150GB) | Storage + ops | 20 |
| Pages | Free | 0 |
| Durable Objects (chat) | ~2M req/mese | 15 |
| Queues | ~10M ops/mese | 10 |
| D1 | ~1M righe/giorno | 5 |
| Workers AI | ~200K classificazioni | 10 |
| Neon (PostgreSQL) | Scale (50GB, auto-scaling) | 69 |
| Cloudflare Images | ~100K transforms | 25 |
| Resend (email) | ~50K email/mese | 20 |
| **Totale** | | **~199** |

#### 100.000 utenti (scala Europa)

| Servizio | Configurazione | Costo/mese (EUR) |
|---------|----------------|:----------------:|
| Workers (API) | ~8M req/giorno | 40 |
| KV (cache) | ~5M letture/giorno | 25 |
| R2 (foto, ~400GB) | Storage + ops | 50 |
| Pages | Free | 0 |
| Durable Objects (chat) | ~5M req/mese | 30 |
| Queues | ~25M ops/mese | 20 |
| D1 | ~5M righe/giorno | 15 |
| Workers AI | ~500K classificazioni | 25 |
| Neon (PostgreSQL) | Business (500GB, always-on) | 700 |
| Cloudflare Images | ~300K transforms | 65 |
| Resend (email) | ~200K email/mese | 50 |
| **Totale** | | **~1.020** |

### 5.4 Confronto con Budget AWS Originale (Doc 04)

| Utenti | Costo AWS (doc 04) | Costo Cloudflare+Neon | Risparmio |
|:------:|:------------------:|:---------------------:|:---------:|
| 1.000 | 87 EUR/mese | ~5 EUR/mese | **94%** |
| 10.000 | 534 EUR/mese | ~51 EUR/mese | **90%** |
| 50.000 | 2.115 EUR/mese | ~199 EUR/mese | **91%** |
| 100.000 | 4.420 EUR/mese | ~1.020 EUR/mese | **77%** |

Il risparmio complessivo sull'infrastruttura nel primo anno (rispetto al budget AWS del doc 04) e stimato in **7.000-8.000 EUR**, riducendo il costo totale infrastruttura annuale da ~9.610 EUR a ~1.500-2.000 EUR.

---

## 6. Piano di Implementazione Allineato

### 6.1 Panoramica Apps e Fasi

| App | MVP (Fase 1) | Fase 2 | Fase 3 | Note |
|-----|:------------:|:------:|:------:|------|
| **mobile** (Expo) | Core completo | Filtri, notifiche, calendario, badge | Social, gamification, AI | Priorita assoluta |
| **api** (Hono Workers) | Tutti gli endpoint MVP | Endpoint admin, analytics | ML matching, marketplace | Sviluppato in parallelo con mobile |
| **web** (Astro) | Landing page + waitlist + blog | Profilo condivisibile, eventi | SPA web app completa | Marketing site dal pre-lancio |
| **admin** (Refine) | Moderazione foto + gestione utenti | Dashboard analytics, feature flags | Workflow avanzati | Operativo al lancio alpha |

### 6.2 Sprint Allocation per App

#### Fase 0 -- Pre-progetto (4 settimane, 2 sprint)

| Sprint | API | Mobile | Web | Admin |
|:------:|:---:|:------:|:---:|:-----:|
| S0 (sett 1-2) | Setup monorepo, schema DB, auth PoC | Setup Expo, design system, NativeWind | Landing page Astro, waitlist | -- |

#### Fase 1 -- MVP (12 settimane, 6 sprint)

| Sprint | API | Mobile | Web | Admin |
|:------:|:---:|:------:|:---:|:-----:|
| S1 (sett 3-4) | Auth (register, login, JWT), User CRUD | Auth screens, onboarding flow | Blog setup, SEO | -- |
| S2 (sett 5-6) | Dog CRUD, upload R2, breeds API | Dog profile wizard, photo upload | Blog contenuti | -- |
| S3 (sett 7-8) | Geolocation PostGIS, proximity search | Mappa, discovery feed, permessi | Legal pages | Setup Refine base |
| S4 (sett 9-10) | Matching algorithm, swipe API | Swipe cards, match animation | Dog/[id] SSR (condivisibile) | Moderazione foto (coda) |
| S5 (sett 11-12) | Chat (Durable Objects), Queues setup | Chat UI, WebSocket integration | -- | Gestione utenti, report |
| Stab. | Stabilizzazione, fix, performance | Bug fixing, polish | -- | Testing moderazione |

#### Fase 2 -- Consolidamento (6 settimane, 3 sprint)

| Sprint | API | Mobile | Web | Admin |
|:------:|:---:|:------:|:---:|:-----:|
| S6 (sett 13-14) | Filtri avanzati, push notifications | Filtri UI, notifiche | -- | Dashboard KPI base |
| S7 (sett 15-16) | Calendario, multi-cane | Calendario UI, multi-cane | Eventi listing | Analytics funnel |
| S8 (sett 17-18) | Badge, feedback post-passeggiata | Badge UI, feedback | -- | Matching config |

#### Fase 3 -- Social + Ecosistema (16 settimane, 8 sprint)

| Sprint | API | Mobile | Web | Admin |
|:------:|:---:|:------:|:---:|:-----:|
| S9-10 | Eventi di gruppo API | Eventi UI | Pagina eventi SSR | Moderazione eventi |
| S11 | Gamification API | Gamification UI | -- | Badge manager |
| S12-13 | Feed media API | Feed foto/video | -- | Content moderation |
| S14 | Fitness integration API | Apple Health / Google Fit | Web app SPA (inizio) | -- |
| S15-16 | AI matching, ML pipeline | -- | Web app SPA (discovery, chat) | A/B test dashboard |

### 6.3 Cosa e MVP vs Post-MVP per App

| Feature | Mobile | API | Web | Admin |
|---------|:------:|:---:|:---:|:-----:|
| Auth (email + social) | MVP | MVP | -- | MVP |
| Profilo cane (CRUD + foto) | MVP | MVP | -- | MVP |
| Geolocalizzazione | MVP | MVP | -- | -- |
| Matching (swipe, algoritmo) | MVP | MVP | -- | -- |
| Chat (testo + immagini) | MVP | MVP | -- | -- |
| Landing page + waitlist | -- | -- | MVP | -- |
| Blog + SEO | -- | -- | MVP | -- |
| Legal pages | -- | -- | MVP | -- |
| Moderazione foto | -- | MVP | -- | MVP |
| Gestione utenti base | -- | MVP | -- | MVP |
| Filtri avanzati | Post | Post | -- | -- |
| Push notifications | Post | Post | -- | -- |
| Calendario condiviso | Post | Post | -- | -- |
| Multi-cane | Post | Post | -- | -- |
| Badge | Post | Post | -- | Post |
| Dashboard analytics | -- | Post | -- | Post |
| Profilo condivisibile | -- | Post | Post | -- |
| Web app SPA | -- | -- | Post (F3) | -- |
| Eventi | Post (F3) | Post (F3) | Post (F3) | Post (F3) |
| Gamification | Post (F3) | Post (F3) | -- | Post (F3) |
| AI matching | Post (F3) | Post (F3) | -- | Post (F3) |

### 6.4 Dipendenze tra Apps

```
packages/db          ──┐
packages/types       ──┤
packages/validation  ──┼──▶ apps/api (DEVE essere sviluppato per primo o in parallelo)
packages/config      ──┤        │
packages/utils       ──┘        │
                                │ API pronta
                                ▼
                    ┌───────────┬───────────────┐
                    │           │               │
              apps/mobile  apps/web        apps/admin
                    │      (usa API per     (usa API admin
                    │       SSR e SPA)       per moderazione)
                    │           │               │
              packages/ui  packages/api-client  │
              packages/     (condiviso tra      │
              api-client    web e mobile)       │
                                                │
                                          packages/types
                                          packages/validation
```

**Regola:** L'API e il blocco critico. Nessuna app puo procedere senza gli endpoint API corrispondenti. Gli sprint sono strutturati per sviluppare API e mobile in parallelo (backend-first di 1-2 giorni per endpoint).

---

## 7. Checklist Pre-Sviluppo

### 7.1 Account e Servizi da Attivare

| # | Servizio | Azione | Responsabile | Costo iniziale |
|---|---------|--------|-------------|:--------------:|
| 1 | **Cloudflare** | Creare account, attivare piano Workers Paid ($5/mese) | DevOps | $5/mese |
| 2 | **Neon** | Creare account, creare progetto con PostGIS | DevOps | Free |
| 3 | **GitHub** | Creare organizzazione `dogwalk-app`, repo `dogwalk` | DevOps | Free (o Team $4/user/mese) |
| 4 | **Expo / EAS** | Creare account Expo, attivare piano Production ($99/mese) | DevOps | $99/mese |
| 5 | **Apple Developer** | Registrare account sviluppatore | PO | $99/anno |
| 6 | **Google Play Console** | Registrare account sviluppatore | PO | $25 una tantum |
| 7 | **Resend** | Creare account, verificare dominio | DevOps | Free |
| 8 | **Mapbox** | Creare account, ottenere API key | DevOps | Free tier |
| 9 | **Sentry** | Creare organizzazione, progetto per mobile + workers | DevOps | $26/mese (Team) |
| 10 | **Figma** | Creare team, invitare designer | UX Lead | $15/editor/mese |
| 11 | **Linear** | Creare workspace, configurare progetti | SM | $8/user/mese |
| 12 | **Dominio** | Registrare `dogwalk.app`, `dogwalk.it` | DevOps | ~$30/anno |

### 7.2 Repository Setup

- [ ] Inizializzare monorepo con `pnpm init` e `pnpm-workspace.yaml`
- [ ] Configurare Turborepo (`turbo.json`)
- [ ] Creare struttura directory (apps/, packages/, tooling/)
- [ ] Setup TypeScript base configs in `tooling/typescript/`
- [ ] Setup ESLint configs in `tooling/eslint/`
- [ ] Setup Prettier config in `tooling/prettier/`
- [ ] Configurare Husky + lint-staged + Commitlint
- [ ] Creare `.nvmrc` con Node 20
- [ ] Creare `.env.example` con tutte le variabili necessarie
- [ ] Configurare `.gitignore` completo
- [ ] Setup `CODEOWNERS`
- [ ] Setup `pull_request_template.md`

### 7.3 CI/CD Pipeline

- [ ] **ci.yml**: Lint, typecheck, test su ogni PR
  - pnpm install, turbo lint, turbo typecheck, turbo test
  - Matrix: Node 20
- [ ] **deploy-preview.yml**: Preview deployment per PR
  - EAS Update per mobile (preview channel)
  - Cloudflare Pages preview per web
  - Cloudflare Pages preview per admin
- [ ] **deploy-staging.yml**: Deploy staging su merge in `develop`
  - EAS Build + EAS Update (staging channel)
  - Wrangler deploy API worker (staging)
  - Cloudflare Pages deploy web (staging)
  - Cloudflare Pages deploy admin (staging)
- [ ] **deploy-production.yml**: Deploy production su merge in `main`
  - EAS Build + Submit (production)
  - Wrangler deploy API worker (production)
  - Cloudflare Pages deploy web (production)
  - Cloudflare Pages deploy admin (production)
  - Tag git con versione semantica

### 7.4 Design Tokens

- [ ] Definire palette colori (gia in doc 06, sezione 4.1)
  - Primary: `#FF6B35`
  - Secondary: `#2D6A4F`
  - Neutri, semantici, DogWalk-specifici
- [ ] Definire scala tipografica (Inter, 11 livelli)
- [ ] Definire spacing scale (base 4px, 11 livelli)
- [ ] Definire border radius tokens
- [ ] Definire shadow tokens (light + dark mode)
- [ ] Implementare tema NativeWind (`tailwind.config.ts` in mobile)
- [ ] Implementare tema Tailwind CSS (`tailwind.config.ts` in web)
- [ ] Verificare coerenza cross-platform dei token

### 7.5 Database Schema

- [ ] Creare progetto Neon con PostGIS abilitato
- [ ] Definire schema Drizzle in `packages/db/src/schema/`
  - `users` (con supporto PostGIS geography)
  - `dog_profiles`
  - `dog_photos`
  - `matches`
  - `swipes`
  - `messages`
  - `reports`
  - `blocks`
  - `push_tokens`
  - `admin_users`
- [ ] Creare migration iniziale (`drizzle-kit generate`)
- [ ] Applicare migration su Neon (`drizzle-kit push`)
- [ ] Creare indice spaziale GiST su `users.location`
- [ ] Preparare seed data per dev (razze FCI, utenti test)
- [ ] Configurare Neon branching per development

### 7.6 API Contracts

- [ ] Definire tutti i tipi in `packages/types/`
- [ ] Definire tutti gli schema Zod in `packages/validation/`
- [ ] Definire la struttura dei tRPC router (auth, user, dog, matching, chat, notification)
- [ ] Documentare le costanti di matching in `packages/config/`
- [ ] Definire i bindings Cloudflare in `wrangler.toml`
- [ ] Definire gli endpoint admin (`/api/admin/v1/...`)
- [ ] Concordare formato paginazione standard (`{ data, meta: { total, page, pageSize } }`)
- [ ] Concordare formato errori standard (tRPC error codes)

### 7.7 Ambienti

| Ambiente | API | Web | Admin | Database | Scopo |
|---------|-----|-----|-------|----------|-------|
| **Local** | `wrangler dev` | `astro dev` | `vite dev` | Docker PostgreSQL o Neon branch | Sviluppo quotidiano |
| **Preview** | Worker preview | Pages preview | Pages preview | Neon branch per PR | Review PR |
| **Staging** | `api-staging.dogwalk.app` | `staging.dogwalk.app` | `admin-staging.dogwalk.app` | Neon branch `staging` | Test pre-release |
| **Production** | `api.dogwalk.app` | `dogwalk.app` | `admin.dogwalk.app` | Neon main branch | Live |

### 7.8 Sicurezza Pre-Lancio

- [ ] Configurare CORS per Workers (origin whitelist)
- [ ] Configurare CSP headers per Pages
- [ ] Setup Cloudflare WAF (regole base anti-DDoS)
- [ ] Configurare rate limiting per API
- [ ] Implementare JWT con rotazione refresh token
- [ ] Configurare HTTPS redirect (gestito da Cloudflare)
- [ ] Setup 2FA per account admin (Cloudflare, Neon, GitHub)
- [ ] Creare `.env` con secrets separati per staging/production
- [ ] Mai committare secrets nel repo (usare Cloudflare Secrets e GitHub Secrets)

---

> **Questo documento e la FONTE DI VERITA per tutte le decisioni architetturali del progetto DogWalk.**
> In caso di conflitto tra questo documento e qualsiasi altro documento (01-08), questo documento prevale.
>
> **Prossima revisione:** Aprile 2026 (dopo Sprint 2 della Fase 1)
> **Distribuzione:** Engineering Team, Product Owner, CTO
