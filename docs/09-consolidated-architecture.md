# DogWalk - Architettura Consolidata (FONTE DI VERITA)

> **Versione:** 2.0 (Decisione B+)
> **Data:** 9 marzo 2026
> **Autore:** CTO / Architecture Board
> **Stato:** Approvato
> **Classificazione:** Documento interno - Confidenziale
> **Priorita:** Questo documento PREVALE su tutti gli altri documenti architetturali (01-10) in caso di conflitto.

---

## Indice

1. [Conflitti Risolti](#1-conflitti-risolti)
2. [Struttura Monorepo Definitiva](#2-struttura-monorepo-definitiva)
3. [Tech Stack Definitivo](#3-tech-stack-definitivo)
4. [Architettura Ibrida (Fly.io + Cloudflare)](#4-architettura-ibrida-flyio--cloudflare)
5. [Costi Aggiornati (Fly.io + Cloudflare + Upstash)](#5-costi-aggiornati-flyio--cloudflare--upstash)
6. [Piano di Implementazione Allineato](#6-piano-di-implementazione-allineato)
7. [Checklist Pre-Sviluppo](#7-checklist-pre-sviluppo)

---

## 1. Conflitti Risolti

Dall'analisi incrociata dei documenti 01-08, sono stati identificati i seguenti conflitti e incoerenze. Per ciascuno viene riportato: cosa diceva il documento originale, la decisione definitiva, e la motivazione.

### CONFLITTO 1: Framework Backend -- Fastify vs Hono

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | Fastify 5.x come HTTP framework, `@trpc/server` adapter per Fastify, `@fastify/websocket` per WebSocket | **Hono su Node.js, deploy su Fly.io** |
| **Doc 07** (Web Architecture) | Hono su Cloudflare Workers, API client con `hono/client` | Aggiornato: Hono su Node.js/Fly.io |
| **Doc 08** (Backoffice) | Hono su Cloudflare Workers | Aggiornato: Hono su Node.js/Fly.io |

**Motivazione:** La decisione B+ sposta l'API da Cloudflare Workers a **Fly.io** (Node.js runtime). Hono resta il framework HTTP scelto per la sua leggerezza e tipizzazione, ma gira su Node.js con deploy containerizzato su Fly.io. Questo risolve le limitazioni di Workers: WebSocket nativo (senza Durable Objects), accesso completo a Node.js API, supporto nativo BullMQ/Redis, multi-region con Fly.io Machines.

**Impatto:** L'entry point dell'API resta `index.ts` (Hono). I middleware restano compatibili. Il deploy passa da `wrangler deploy` a `fly deploy` con Dockerfile. Il WebSocket passa da Durable Objects a WebSocket nativo su Fly.io.

---

### CONFLITTO 2: Cache e Job Queue -- Redis/BullMQ vs Cloudflare KV/Queues vs Upstash Redis/BullMQ

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | Redis 7.x per cache, sessioni, pub/sub. BullMQ 5.x per job queue. ioredis 5.x come client. Docker Compose con Redis per dev. | **Upstash Redis** per cache e sessioni. **BullMQ su Upstash Redis** per job asincroni. |
| **Doc 07** (Web Architecture) | Cloudflare KV per caching | Aggiornato: Upstash Redis |
| **Doc 09** v1.0 | Cloudflare KV + Cloudflare Queues | Aggiornato con decisione B+ |

**Motivazione:** La decisione B+ reintroduce Redis nello stack tramite **Upstash Redis** (serverless, pay-per-request, multi-region). Con il passaggio a Fly.io/Node.js, BullMQ torna disponibile come soluzione matura per i job asincroni. Upstash Redis offre compatibilita completa con ioredis, pricing serverless (pay-per-command), e replica multi-region. Rispetto a Cloudflare KV, offre strong consistency e supporto nativo per pub/sub e rate limiting.

**Impatto:** I background jobs usano BullMQ con worker Node.js su Fly.io. La cache e le sessioni usano Upstash Redis. Il rate limiting torna a essere Redis-based.

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
| **Doc 04** (Budget) | AWS come cloud provider. ECS Fargate per compute. RDS PostgreSQL. ElastiCache Redis. S3 + CloudFront. API Gateway WebSocket. SES per email. Stima 87-4.420 EUR/mese. | **Fly.io per API/compute**, **Cloudflare per Pages/R2/CDN**, **Upstash per Redis**. |
| **Doc 07** (Web Architecture) | Cloudflare Pages, Workers, R2, KV, D1 | Aggiornato: Pages + R2 + CDN restano Cloudflare. API su Fly.io. |
| **Doc 08** (Backoffice) | Cloudflare Pages per hosting, Workers per API | Aggiornato: Pages su Cloudflare, API su Fly.io |

**Motivazione:** La decisione B+ adotta un approccio ibrido: **Fly.io** per l'API backend (Node.js runtime completo, WebSocket nativo, multi-region Machines, Docker deploy) e **Cloudflare** per il frontend (Pages, R2, CDN). Questo elimina le limitazioni di Workers (CPU time limit, no WebSocket server nativo, no Node.js API) mantenendo i vantaggi di Cloudflare per static hosting e storage. Il database resta su Neon (PostgreSQL serverless).

---

### CONFLITTO 6: Database hosting -- Generico vs Neon

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | PostgreSQL 16.x generico (implicito self-hosted o RDS) | **Neon** (PostgreSQL serverless, edge-compatible) |
| **Doc 04** (Budget) | RDS PostgreSQL con costi da $25 a $1.400/mese | Neon con free tier (0.5GB) poi pay-per-use |
| **Doc 07** (Web Architecture) | PostgreSQL su Neon | Confermato |

**Motivazione:** Neon e PostgreSQL serverless che supporta branching (un database per ogni PR), auto-scaling a zero, e connessioni HTTP/WebSocket. Su Fly.io si possono usare sia connessioni TCP tradizionali che il driver serverless HTTP. PostGIS e pienamente supportato su Neon.

---

### CONFLITTO 7: Real-time/WebSocket -- Socket.io/Fastify WS vs Durable Objects vs WebSocket nativo

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 02** (MVP Spec) | Menziona "WebSocket con TLS 1.3" genericamente | **WebSocket nativo su Fly.io** |
| **Doc 03** (Architecture) | `@fastify/websocket` per WebSocket, Redis Pub/Sub per fanout | **WebSocket nativo su Fly.io** + Upstash Redis Pub/Sub |
| **Doc 05** (Roadmap) | "Socket.io / Firebase Realtime" per chat | **WebSocket nativo su Fly.io** |
| **Doc 09** v1.0 | Cloudflare Durable Objects per chat real-time | Aggiornato con decisione B+ |

**Motivazione:** Con il passaggio a Fly.io/Node.js, il WebSocket server nativo e disponibile senza necessita di Durable Objects. Hono su Node.js supporta WebSocket upgrade diretto. Fly.io offre multi-region con sticky sessions per le connessioni WebSocket. Upstash Redis Pub/Sub gestisce il fanout cross-region. Nessun bisogno di Durable Objects.

---

### CONFLITTO 8: Email -- Nodemailer/SES vs Resend/CF Email Workers

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 03** (Architecture) | Nodemailer 6.x per email transazionali | **Resend** (o Cloudflare Email Workers in futuro) |
| **Doc 04** (Budget) | AWS SES ($0.10/1.000 email) | Resend (free tier 100 email/giorno, poi $20/mese per 50K) |

**Motivazione:** Anche se con Fly.io/Node.js Nodemailer sarebbe ora tecnicamente possibile, Resend resta la scelta per la DX superiore (API HTTP, SDK leggero, ottima dashboard) e il free tier sufficiente per l'MVP (100 email/giorno).

---

### CONFLITTO 9: Content Moderation -- AWS Rekognition vs alternativa edge

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 02** (MVP Spec) | AWS Rekognition per moderazione foto | **Cloudflare Workers AI** (modello NSFW classification) oppure **Hive Moderation** via API |
| **Doc 03** (Architecture) | AWS Rekognition per scansione contenuti | Workers AI o Hive Moderation |

**Motivazione:** AWS Rekognition richiede chiamate cross-cloud. Cloudflare Workers AI offre modelli di classificazione immagini via REST API, chiamabili da Fly.io tramite BullMQ worker. Se la qualita non e sufficiente per l'MVP, Hive Moderation offre un'API HTTP alternativa.

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

**Motivazione:** tRPC e Hono RPC risolvono lo stesso problema (type-safe API) ma tRPC e piu maturo per le subscription WebSocket e ha un ecosistema piu ricco di middleware. Hono serve come HTTP framework (routing, middleware, CORS) e tRPC come API layer type-safe sopra Hono. L'adapter `@trpc/server/adapters/fetch` funziona su Node.js/Fly.io. Il `@dogwalk/api-client` usa il client tRPC, non `hono/client`.

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
| **Doc 03** (Architecture) | `docker-compose.yml` con PostgreSQL + Redis + MinIO | **`docker-compose.yml`** con PostgreSQL + PostGIS + Redis (per dev locale). MinIO eliminato. |

**Motivazione:** Con la decisione B+, Redis torna nel docker-compose per dev locale (necessario per BullMQ e cache). MinIO resta eliminato (R2 per storage). PostgreSQL come database locale. In alternativa, si possono usare Neon branching e Upstash Redis per environment di dev remoto.

---

### CONFLITTO 15: Architettura mobile -- "React Native / Flutter" ambiguita

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 02** (MVP Spec) | "React Native / Flutter -- cross-platform" nell'architettura funzionale | **Expo SDK 52+ con Expo Router** (React Native) |
| **Doc 05** (Roadmap) | "React Native / Flutter" nella descrizione competenze | Expo (React Native) |

**Motivazione:** I doc 02 e 05 lasciavano ambiguita tra React Native e Flutter. La scelta definitiva e Expo (React Native) per condivisione dei tipi TypeScript, dei package di validazione Zod, e dei componenti UI React con la web app e il backoffice.

---

### CONFLITTO 16: Infrastruttura API -- Cloudflare Workers vs Server tradizionale (Decisione B+)

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 09** v1.0 | Cloudflare Workers per tutto il backend API | **Fly.io** (Node.js runtime) per API backend |
| **Doc 10** (Analisi Workers vs Server) | Analisi comparativa Workers vs Server tradizionale | Decisione **B+**: Hono su Node.js/Fly.io |

**Motivazione:** L'analisi del doc 10 ha evidenziato limiti critici di Cloudflare Workers per il caso d'uso DogWalk:
- **CPU time limit** (10-50ms su free, 30s su paid): insufficiente per algoritmo di matching complesso con PostGIS
- **No WebSocket server nativo**: richiede Durable Objects (complessita aggiuntiva, costi elevati a scala)
- **No Node.js API completo**: incompatibilita con BullMQ, librerie native, stream processing
- **Cold start edge-case**: Durable Objects hanno latenza di creazione
- **Vendor lock-in**: Durable Objects e Cloudflare Queues sono proprietari

La decisione B+ adotta **Fly.io** come piattaforma per l'API:
- **Multi-region Machines**: deploy in EU (ams, cdg, fra) con auto-scaling
- **WebSocket nativo**: senza Durable Objects, con sticky sessions e Redis Pub/Sub
- **Node.js completo**: BullMQ, stream, librerie native, nessun limite CPU
- **Docker deploy**: portabilita totale, nessun vendor lock-in
- **Pricing competitivo**: $0 per 3 shared VMs, poi $1.94/mese per shared-cpu-1x 256MB

Cloudflare resta per: Pages (web + admin), R2 (storage), CDN, Turnstile, Workers AI (moderazione).

---

### CONFLITTO 17 (rinumerato): Auth backend -- Service Blueprint

| Aspetto | Documento originale | Decisione definitiva |
|---------|-------------------|---------------------|
| **Doc 06** (UX/UI) | Menziona "Firebase/Supabase" come backstage auth | **Lucia Auth o custom JWT** su Node.js/Fly.io |

**Motivazione:** Firebase Auth aggiunge una dipendenza esterna non necessaria. Lucia Auth e una libreria di autenticazione leggera, con supporto per sessioni e JWT. In alternativa, un'implementazione custom JWT con bcrypt (nativo su Node.js) e pienamente funzionante su Fly.io.

---

### CONFLITTO 18 (rinumerato): Landing page pre-lancio

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
│   ├── api/                              # Hono su Node.js, deploy su Fly.io
│   │   ├── src/
│   │   │   ├── index.ts                  # Entry point: Hono app + tRPC adapter
│   │   │   ├── config/
│   │   │   │   └── env.ts                # Validazione env con Zod
│   │   │   ├── trpc/
│   │   │   │   ├── index.ts              # tRPC init, context, middleware
│   │   │   │   ├── router.ts             # Root router (merge tutti i router)
│   │   │   │   └── middleware/
│   │   │   │       ├── auth.ts           # JWT verification middleware
│   │   │   │       ├── rateLimit.ts      # Rate limiting (Upstash Redis)
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
│   │   │   │   │   └── chat.websocket.ts       # WebSocket nativo per chat room
│   │   │   │   ├── notification/
│   │   │   │   ├── upload/
│   │   │   │   ├── moderation/
│   │   │   │   └── admin/                # Endpoint admin (protetti RBAC)
│   │   │   ├── jobs/                     # BullMQ workers (job asincroni)
│   │   │   │   ├── photo-moderation.ts
│   │   │   │   ├── push-notification.ts
│   │   │   │   ├── email.ts
│   │   │   │   └── cleanup.ts
│   │   │   └── utils/
│   │   │       ├── geo.ts                # PostGIS helpers
│   │   │       ├── jwt.ts                # JWT sign/verify
│   │   │       ├── redis.ts              # Upstash Redis client
│   │   │       └── errors.ts
│   │   ├── Dockerfile                    # Multi-stage build per Fly.io
│   │   ├── fly.toml                      # Configurazione Fly.io (region, scaling)
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
│   └── admin/                            # Next.js + shadcn/ui su Cloudflare Pages
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── config/
│       │   ├── providers/
│       │   │   ├── auth-provider.ts
│       │   │   ├── data-provider.ts       # Data provider custom per API Hono/tRPC
│       │   │   ├── access-control-provider.ts
│       │   │   └── live-provider.ts       # WebSocket nativo Fly.io
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
│   └── docker-compose.yml               # PostgreSQL + PostGIS + Redis (dev locale)
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

### 3.3 Backend (Hono su Node.js / Fly.io)

| Tecnologia | Versione | Ruolo | Giustificazione |
|-----------|----------|-------|-----------------|
| **Hono** | ~4.x | HTTP framework | Leggero (14KB), middleware ricco, multi-runtime |
| **tRPC** | ~11.x | Type-safe API layer | End-to-end type safety, subscriptions |
| **Drizzle ORM** | ~0.35.x | ORM type-safe | SQL-first, leggero, performance |
| **@neondatabase/serverless** | latest | PostgreSQL driver | HTTP/WebSocket, serverless-compatible |
| **Zod** | ~3.23 | Validazione runtime | Condiviso con frontend |
| **bcrypt** | ~5.x | Password hashing | Node.js nativo, performante |
| **jose** | ~5.x | JWT sign/verify | Standard Web Crypto API |
| **BullMQ** | ~5.x | Job queue asincroni | Retry, scheduling, priorita, dashboard |
| **ioredis** | ~5.x | Redis client per Upstash | Compatibile con Upstash Redis, BullMQ |
| **expo-server-sdk** | ~3.x | Invio push notification | API Expo Push ufficiale |

### 3.4 Database, Cache e Storage

| Tecnologia | Ruolo | Giustificazione |
|-----------|-------|-----------------|
| **PostgreSQL 16 (Neon)** | Database relazionale primario | Serverless, auto-scaling, branching per PR |
| **PostGIS 3.4** | Estensione geospaziale | Query ST_DWithin per matching geografico |
| **Upstash Redis** | Cache, sessioni, rate limiting, pub/sub | Serverless, pay-per-command, multi-region, strong consistency |
| **BullMQ su Upstash Redis** | Job asincroni | Moderazione foto, email, push, cleanup |
| **Cloudflare R2** | Object storage (foto cani) | S3-compatible, zero egress fee |

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
| **Next.js** | 15.x | Framework React full-stack | SSR/SSG, App Router, middleware RBAC, stesso stack della web app |
| **shadcn/ui** | latest | Componenti UI (Tailwind) | Design system unificato con web app, accessibile, personalizzabile |
| **TanStack Table** | 8.x | Tabelle avanzate | Sorting, filtering, pagination server-side |
| **Vite** | 6.x | Build tool | HMR veloce, SPA output per CF Pages |
| **Recharts** | 2.x | Grafici dashboard | Framework-agnostic, leggero |
| **React Hook Form** | 7.x | Gestione form | Validazione con Zod, stesso pattern del mobile |

### 3.7 Auth

| Tecnologia | Ruolo | Giustificazione |
|-----------|-------|-----------------|
| **Lucia Auth** (o custom JWT) | Autenticazione e sessioni | Leggero, zero dipendenze esterne |
| **jose** | JWT signing/verification | Standard Web Crypto API |
| **OAuth** | Google + Apple Sign-In | Provider sociali richiesti dall'MVP |

### 3.8 Servizi Esterni

| Servizio | Ruolo | Giustificazione |
|---------|-------|-----------------|
| **Resend** | Email transazionali | API HTTP, edge-compatible, free tier 100/day |
| **Mapbox** | Mappe (mobile + web) | Pricing competitivo, SDK performante |
| **Cloudflare Turnstile** | Anti-bot per form web | Gratuito, privacy-first, nativo CF |
| **Cloudflare Workers AI** | Moderazione immagini | Chiamato via REST API da Fly.io, nessun costo egress |

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
| **Sentry** | Error tracking e performance (mobile + API) |
| **Cloudflare Analytics** | Web analytics (Pages) |
| **Fly.io Metrics** | Monitoring API (CPU, RAM, connessioni) |
| **ESLint** (flat config) | Linting |
| **Prettier** | Code formatting |
| **Husky + lint-staged** | Pre-commit hooks |
| **Commitlint** | Conventional commits |

---

## 4. Architettura Ibrida (Fly.io + Cloudflare)

### 4.1 Diagramma dei Servizi

```
                          ┌──────────────────────────────────────────┐
                          │           Cloudflare Network              │
                          │         (CDN + Edge + DDoS)               │
                          └──────────┬───────────────────────────────┘
                                     │
                    ┌────────────────┘
                    │
         ┌──────────▼──────────┐
         │  Cloudflare Pages    │
         │                      │
         │  dogwalk.app (web)   │
         │  admin.dogwalk.app   │
         │                      │                    ┌─────────────────────────┐
         │  ┌────────────────┐  │                    │     Fly.io (multi-region)│
         │  │ Astro SSG/SSR  │  │    API calls       │     api.dogwalk.app     │
         │  │ (marketing)    │──┼───────────────────▶│                         │
         │  └────────────────┘  │                    │     Hono + tRPC         │
         │  ┌────────────────┐  │                    │     Node.js runtime     │
         │  │ React SPA      │  │    API calls       │                         │
         │  │ (web app ph2)  │──┼───────────────────▶│  ┌───────────────────┐  │
         │  └────────────────┘  │                    │  │  Auth Module      │  │
         │  ┌────────────────┐  │                    │  │  User Module      │  │
         │  │ Next.js Admin  │  │    Admin API       │  │  Dog Module       │  │
         │  │ (backoffice)   │──┼───────────────────▶│  │  Match Module     │  │
         │  └────────────────┘  │                    │  │  Chat (WebSocket) │  │
         └──────────────────────┘                    │  │  Upload Module    │  │
                                                     │  │  Notification     │  │
              ┌──────────────────┐                   │  │  Admin Module     │  │
              │  Cloudflare R2   │◀──────────────────│  │  BullMQ Workers   │  │
              │  (foto, media)   │   presigned URL   │  └────────┬──────────┘  │
              └──────────────────┘                   └───────────┼─────────────┘
                                                                 │
                    ┌────────────────────────────────────────────┘
                    │
    ┌───────────────┼────────────────┐
    │               │                │
    ▼               ▼                ▼
┌────────┐   ┌──────────────┐   ┌───────────────┐
│  Neon   │   │   Upstash    │   │  Workers AI   │
│ (PgSQL) │   │   Redis      │   │  (NSFW detect)│
│         │   │              │   │               │
│ PostGIS │   │ Cache        │   │  Chiamato via │
│ Schema  │   │ Sessions     │   │  REST API     │
│ Drizzle │   │ Rate limit   │   │               │
│         │   │ BullMQ queue │   └───────────────┘
└────────┘   │ Pub/Sub (WS) │
              └──────────────┘

Expo Mobile App ──── API calls + WebSocket ────▶ Fly.io (api.dogwalk.app)

Servizi Esterni:
┌────────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐
│   Resend   │  │  Mapbox  │  │  Sentry  │  │ Expo Push  │  │  Apple/  │
│  (email)   │  │  (mappe) │  │ (errors) │  │   API      │  │  Google  │
│            │  │          │  │          │  │            │  │  OAuth   │
└────────────┘  └──────────┘  └──────────┘  └────────────┘  └──────────┘
```

### 4.2 Dettaglio Servizi per Piattaforma

#### Fly.io (API Backend)

| Servizio | Uso in DogWalk | Configurazione | Note |
|---------|----------------|---------------|------|
| **Fly Machines** | API backend (Hono + tRPC + BullMQ) | `fly.toml` in `apps/api/` | Deploy su `api.dogwalk.app`, multi-region EU |
| **WebSocket nativo** | Chat real-time | Sticky sessions via `fly-replay` header | Nessun Durable Object necessario |

#### Cloudflare (Frontend + Storage)

| Servizio | Uso in DogWalk | Note |
|---------|----------------|------|
| **Pages** | Web marketing + Admin SPA | `dogwalk.app` + `admin.dogwalk.app` |
| **R2** | Storage foto cani, avatar | Accesso via presigned URL generato dall'API su Fly.io |
| **Workers AI** | Classificazione NSFW foto | Chiamato via REST API dall'API su Fly.io |
| **Cloudflare Images** | Resize on-the-fly foto cani | Transform via URL (`/cdn-cgi/image/`) |
| **Turnstile** | Anti-bot form web (waitlist, contatti) | Gratuito, GDPR-friendly |
| **CDN** | Cache e distribuzione statica | Built-in con Pages e R2 |

#### Upstash (Cache + Queue)

| Servizio | Uso in DogWalk | Note |
|---------|----------------|------|
| **Upstash Redis** | Cache, sessioni, rate limiting | Env var `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN` |
| **BullMQ su Redis** | Job asincroni (moderazione, email, push) | Code: `photo-moderation`, `push-notification`, `email`, `cleanup` |
| **Redis Pub/Sub** | Fanout WebSocket cross-region | Per sincronizzare connessioni WebSocket su piu regioni Fly.io |

### 4.3 Flusso Upload Foto

```
1. Mobile/Web richiede presigned URL → API Fly.io
2. API genera presigned URL per R2 (via S3-compatible SDK) → restituisce al client
3. Client upload diretto a R2 (PUT)
4. Client conferma upload → API Fly.io
5. API aggiunge job su BullMQ (coda photo-moderation)
6. BullMQ worker: chiama Workers AI via REST API per classificazione NSFW
7. Se approvata: status = "approved", foto visibile
8. Se rifiutata: status = "rejected", notifica utente
9. Immagini servite via Cloudflare Images (resize on-the-fly)
```

### 4.4 Flusso Chat Real-time (WebSocket nativo su Fly.io)

```
1. Utente apre chat di un match → WebSocket connect a Fly.io
2. Fly.io sticky session mantiene la connessione sulla stessa Machine
3. Server mantiene lo stato della room in memoria (utenti connessi, typing)
4. Messaggio inviato → broadcast all'altro utente (stesso server o via Redis Pub/Sub cross-region)
5. Messaggio persistito nel database (Neon)
6. Se destinatario offline → aggiunge job su BullMQ (coda push-notification)
7. BullMQ worker: invio push notification via Expo Push API
```

---

## 5. Costi Aggiornati (Fly.io + Cloudflare + Upstash)

### 5.1 Pricing Fly.io (marzo 2026)

| Servizio | Free Tier | Pricing oltre free tier |
|---------|-----------|------------------------|
| **Machines (shared-cpu-1x, 256MB)** | 3 VM gratuite | $1.94/mese per VM aggiuntiva |
| **Machines (shared-cpu-2x, 512MB)** | -- | $3.88/mese per VM |
| **Machines (performance-1x, 2GB)** | -- | $29.00/mese per VM |
| **Bandwidth** | 100GB/mese in uscita | $0.02/GB addizionale |
| **Persistent Volumes** | 3GB gratuiti | $0.15/GB/mese |

### 5.1b Pricing Upstash Redis (marzo 2026)

| Piano | Comandi/giorno | Storage | Costo |
|-------|---------------|---------|-------|
| **Free** | 10.000 comandi/giorno | 256MB | $0/mese |
| **Pay-as-you-go** | Illimitati | Illimitato | $0.2/100K comandi |
| **Pro 2K** | 2.000 comandi/sec max | 10GB | $280/mese |

### 5.1c Pricing Cloudflare (servizi residui)

| Servizio | Free Tier | Pricing oltre free tier |
|---------|-----------|------------------------|
| **R2** | 10GB storage, 10M Class A ops (PUT), 10M Class B ops (GET) | $0.015/GB/mese storage, $4.50/M Class A, $0.36/M Class B |
| **Pages** | Illimitato (build, bandwidth, siti) | Gratuito (anche piano Pro) |
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
| Fly.io (API) | 1 shared-cpu-1x 256MB (free tier) | 0 |
| Upstash Redis | ~5K comandi/giorno (free tier) | 0 |
| R2 (foto, ~2GB) | Free tier | 0 |
| Pages (web + admin) | Free | 0 |
| Workers AI (moderazione) | Free tier | 0 |
| Neon (PostgreSQL) | Free tier (0.5GB) | 0 |
| **Totale** | | **~0** |

#### 10.000 utenti (espansione citta)

| Servizio | Configurazione | Costo/mese (EUR) |
|---------|----------------|:----------------:|
| Fly.io (API) | 2 shared-cpu-1x 512MB (1 free + 1 paid) | 4 |
| Upstash Redis | ~50K comandi/giorno (pay-as-you-go) | 3 |
| R2 (foto, ~30GB) | 30GB storage + ops | 5 |
| Pages (web + admin) | Free | 0 |
| Workers AI | ~50K classificazioni | 0 |
| Neon (PostgreSQL) | Launch (10GB) | 19 |
| Cloudflare Images | ~10K transforms | 10 |
| **Totale** | | **~41** |

#### 50.000 utenti (trazione Italia)

| Servizio | Configurazione | Costo/mese (EUR) |
|---------|----------------|:----------------:|
| Fly.io (API) | 3 shared-cpu-2x 1GB, multi-region | 25 |
| Upstash Redis | ~500K comandi/giorno (pay-as-you-go) | 30 |
| R2 (foto, ~150GB) | Storage + ops | 20 |
| Pages | Free | 0 |
| Workers AI | ~200K classificazioni | 10 |
| Neon (PostgreSQL) | Scale (50GB, auto-scaling) | 69 |
| Cloudflare Images | ~100K transforms | 25 |
| Resend (email) | ~50K email/mese | 20 |
| **Totale** | | **~199** |

#### 100.000 utenti (scala Europa)

| Servizio | Configurazione | Costo/mese (EUR) |
|---------|----------------|:----------------:|
| Fly.io (API) | 4 performance-1x 2GB, multi-region | 120 |
| Upstash Redis | ~2M comandi/giorno (Pro) | 70 |
| R2 (foto, ~400GB) | Storage + ops | 50 |
| Pages | Free | 0 |
| Workers AI | ~500K classificazioni | 25 |
| Neon (PostgreSQL) | Business (500GB, always-on) | 700 |
| Cloudflare Images | ~300K transforms | 65 |
| Resend (email) | ~200K email/mese | 50 |
| **Totale** | | **~1.080** |

### 5.4 Confronto con Budget AWS Originale (Doc 04) e Cloudflare-only (Doc 09 v1.0)

| Utenti | Costo AWS (doc 04) | Costo CF-only (doc 09 v1.0) | Costo B+ (Fly+CF+Upstash) | Risparmio vs AWS |
|:------:|:------------------:|:---------------------------:|:-------------------------:|:----------------:|
| 1.000 | 87 EUR/mese | ~5 EUR/mese | ~0 EUR/mese | **100%** |
| 10.000 | 534 EUR/mese | ~51 EUR/mese | ~41 EUR/mese | **92%** |
| 50.000 | 2.115 EUR/mese | ~199 EUR/mese | ~199 EUR/mese | **91%** |
| 100.000 | 4.420 EUR/mese | ~1.020 EUR/mese | ~1.080 EUR/mese | **76%** |

Il costo B+ e comparabile alla versione Cloudflare-only a bassa scala (e addirittura inferiore per 1K-10K utenti grazie ai free tier di Fly.io e Upstash). A scala maggiore (100K+) il costo e leggermente superiore, ma si guadagna in flessibilita, assenza di limiti CPU, WebSocket nativo, e nessun vendor lock-in su Durable Objects/Queues.

---

## 6. Piano di Implementazione Allineato

### 6.1 Panoramica Apps e Fasi

| App | MVP (Fase 1) | Fase 2 | Fase 3 | Note |
|-----|:------------:|:------:|:------:|------|
| **mobile** (Expo) | Core completo | Filtri, notifiche, calendario, badge | Social, gamification, AI | Priorita assoluta |
| **api** (Hono/Fly.io) | Tutti gli endpoint MVP | Endpoint admin, analytics | ML matching, marketplace | Sviluppato in parallelo con mobile |
| **web** (Astro) | Landing page + waitlist + blog | Profilo condivisibile, eventi | SPA web app completa | Marketing site dal pre-lancio |
| **admin** (Next.js + shadcn/ui) | Moderazione foto + gestione utenti | Dashboard analytics, feature flags | Workflow avanzati | Operativo al lancio alpha |

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
| S3 (sett 7-8) | Geolocation PostGIS, proximity search | Mappa, discovery feed, permessi | Legal pages | Setup Next.js admin base |
| S4 (sett 9-10) | Matching algorithm, swipe API | Swipe cards, match animation | Dog/[id] SSR (condivisibile) | Moderazione foto (coda) |
| S5 (sett 11-12) | Chat (WebSocket nativo), BullMQ setup | Chat UI, WebSocket integration | -- | Gestione utenti, report |
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
| 1 | **Fly.io** | Creare account, installare `flyctl` CLI, creare organizzazione | DevOps | Free (3 VM gratuite) |
| 2 | **Cloudflare** | Creare account (Pages, R2, Workers AI) | DevOps | Free |
| 3 | **Upstash** | Creare account, creare database Redis (regione EU) | DevOps | Free |
| 4 | **Neon** | Creare account, creare progetto con PostGIS | DevOps | Free |
| 5 | **GitHub** | Creare organizzazione `dogwalk-app`, repo `dogwalk` | DevOps | Free (o Team $4/user/mese) |
| 6 | **Expo / EAS** | Creare account Expo, attivare piano Production ($99/mese) | DevOps | $99/mese |
| 7 | **Apple Developer** | Registrare account sviluppatore | PO | $99/anno |
| 8 | **Google Play Console** | Registrare account sviluppatore | PO | $25 una tantum |
| 9 | **Resend** | Creare account, verificare dominio | DevOps | Free |
| 10 | **Mapbox** | Creare account, ottenere API key | DevOps | Free tier |
| 11 | **Sentry** | Creare organizzazione, progetto per mobile + API | DevOps | $26/mese (Team) |
| 12 | **Figma** | Creare team, invitare designer | UX Lead | $15/editor/mese |
| 13 | **Linear** | Creare workspace, configurare progetti | SM | $8/user/mese |
| 14 | **Dominio** | Registrare `dogwalk.app`, `dogwalk.it` | DevOps | ~$30/anno |

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
- [ ] Creare `Dockerfile` multi-stage in `apps/api/` (Node.js 20 Alpine)
- [ ] Creare `fly.toml` in `apps/api/` (regione `ams`, auto-scaling)
- [ ] Verificare Docker locale funzionante (`docker build` per API)
- [ ] Configurare `docker-compose.yml` con PostgreSQL + PostGIS + Redis

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
  - `fly deploy --config apps/api/fly.toml` API (staging)
  - Cloudflare Pages deploy web (staging)
  - Cloudflare Pages deploy admin (staging)
- [ ] **deploy-production.yml**: Deploy production su merge in `main`
  - EAS Build + Submit (production)
  - `fly deploy --config apps/api/fly.toml` API (production)
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
- [ ] Definire le variabili d'ambiente in `fly.toml` e `.env`
- [ ] Definire gli endpoint admin (`/api/admin/v1/...`)
- [ ] Concordare formato paginazione standard (`{ data, meta: { total, page, pageSize } }`)
- [ ] Concordare formato errori standard (tRPC error codes)

### 7.7 Ambienti

| Ambiente | API | Web | Admin | Database | Cache | Scopo |
|---------|-----|-----|-------|----------|-------|-------|
| **Local** | `node --watch` (Hono) | `astro dev` | `vite dev` | Docker PostgreSQL | Docker Redis | Sviluppo quotidiano |
| **Preview** | Fly.io preview app | Pages preview | Pages preview | Neon branch per PR | Upstash Redis (dev) | Review PR |
| **Staging** | `api-staging.dogwalk.app` (Fly.io) | `staging.dogwalk.app` | `admin-staging.dogwalk.app` | Neon branch `staging` | Upstash Redis (staging) | Test pre-release |
| **Production** | `api.dogwalk.app` (Fly.io) | `dogwalk.app` | `admin.dogwalk.app` | Neon main branch | Upstash Redis (prod) | Live |

### 7.8 Sicurezza Pre-Lancio

- [ ] Configurare CORS per API Fly.io (origin whitelist)
- [ ] Configurare CSP headers per Pages
- [ ] Setup Cloudflare WAF (regole base anti-DDoS per Pages/CDN)
- [ ] Configurare rate limiting per API (Upstash Redis)
- [ ] Implementare JWT con rotazione refresh token
- [ ] Configurare HTTPS redirect (Cloudflare per Pages, Fly.io per API)
- [ ] Setup 2FA per account admin (Fly.io, Cloudflare, Upstash, Neon, GitHub)
- [ ] Creare `.env` con secrets separati per staging/production
- [ ] Mai committare secrets nel repo (usare `fly secrets set` e GitHub Secrets)

---

> **Questo documento e la FONTE DI VERITA per tutte le decisioni architetturali del progetto DogWalk.**
> In caso di conflitto tra questo documento e qualsiasi altro documento (01-10), questo documento prevale.
> **Decisione B+:** API su Fly.io (Node.js), cache/queue su Upstash Redis, frontend su Cloudflare Pages/R2/CDN.
>
> **Prossima revisione:** Aprile 2026 (dopo Sprint 2 della Fase 1)
> **Distribuzione:** Engineering Team, Product Owner, CTO
