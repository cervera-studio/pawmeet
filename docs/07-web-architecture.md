# PawMeet - Architettura Web

> **Versione:** 1.0
> **Data:** 9 marzo 2026
> **Autore:** Senior Frontend Architect
> **Stato:** Draft

---

## Indice

1. [Tech Stack](#1-tech-stack)
2. [Struttura nell'app monorepo](#2-struttura-nellapp-monorepo)
3. [Pagine e Routes](#3-pagine-e-routes)
4. [Integrazione Cloudflare](#4-integrazione-cloudflare)
5. [Performance e SEO](#5-performance--seo)
6. [Shared Packages](#6-shared-packages)
7. [Design e Componenti](#7-design-e-componenti)
8. [Internazionalizzazione (i18n)](#8-internazionalizzazione-i18n)

---

## 1. Tech Stack

### 1.1 Framework: Astro + React (scelta motivata)

**Scelta: Astro 5 con React islands per la parte marketing + React SPA per la web app.**

| Opzione valutata | Pro | Contro |
|-----------------|-----|--------|
| **Next.js su Cloudflare Pages** (via @opennextjs/cloudflare) | Ecosistema maturo, App Router potente, unico framework | @opennextjs/cloudflare e' ancora un adapter di terze parti con limitazioni (middleware parziale, ISR non nativo su CF, Image Optimization assente). Overhead di JS per pagine statiche. |
| **Astro 5 + React** | Zero JS di default per pagine statiche (landing, blog, legal). Islands architecture per interattivita' mirata. Supporto Cloudflare Pages nativo e stabile. Content Collections per blog/legal. | Due modelli mentali (Astro per marketing, React per web app). Meno unificato. |

**Motivazione della scelta:**

1. **Il 70% del sito e' contenuto statico** (landing, blog, legal, chi siamo). Astro produce HTML puro senza JS inutile, risultando in Core Web Vitals significativamente migliori rispetto a Next.js per queste pagine. Una landing page Astro pesa ~0 KB di JS; la stessa in Next.js pesa 80-100 KB minimo (framework runtime).

2. **Supporto Cloudflare nativo**: Astro ha un adapter ufficiale `@astrojs/cloudflare` mantenuto dal core team, mentre @opennextjs/cloudflare e' un progetto community con supporto parziale delle feature di Next.js (ISR, middleware, Image Optimization non supportati nativamente su CF).

3. **Islands architecture**: Le pagine marketing che necessitano di interattivita' (waitlist form, testimonial carousel) caricano solo il React necessario per quel componente, non l'intero framework.

4. **Web App come SPA**: La web app (`/app/*`) viene servita come una React SPA con client-side routing (React Router o TanStack Router), montata dentro un layout Astro. Questo permette di condividere componenti React con il mobile (Expo) tramite i shared packages.

5. **Content Collections**: Astro gestisce nativamente blog posts e pagine legal come file Markdown/MDX con type safety, senza bisogno di un CMS esterno per l'MVP.

### 1.2 Stack completo

| Layer | Tecnologia | Motivazione |
|-------|-----------|-------------|
| **Framework** | Astro 5 | SSG/SSR per marketing, islands per interattivita' |
| **UI Library** | React 19 | Condivisione componenti con mobile (Expo) e backoffice |
| **Routing Web App** | TanStack Router | Type-safe routing, code splitting automatico, search params tipizzati |
| **Styling** | Tailwind CSS 4 | Utility-first, consistente con mobile (NativeWind), tree-shaking aggressivo |
| **State Management** | Zustand | Leggero (1 KB), API semplice, nessun boilerplate, ottimo per condivisione con mobile |
| **Server State** | TanStack Query v5 | Caching, deduplication, optimistic updates. Condiviso con mobile. |
| **API Client** | `@pawmeet/api-client` (shared) | Client tRPC type-safe, condiviso con mobile e backoffice |
| **Forms** | React Hook Form + `@pawmeet/validation` | Validazione Zod condivisa con backend e mobile |
| **Analytics** | Cloudflare Web Analytics + Plausible | Privacy-first, no cookie banner necessario, GDPR compliant |
| **Content** | Astro Content Collections (Markdown/MDX) | Blog e pagine legali come file nel repo, type-safe, git-versioned |
| **Mappe** | Mapbox GL JS (o MapLibre GL) | Leggero, performante, condivisibile la logica con mobile |
| **Real-time** | WebSocket nativo su Fly.io | Chat nella web app, consistente con il backend mobile |
| **Auth** | Cookie-based sessions (web) tramite `@pawmeet/api-client` | Piu' sicuro di JWT in localStorage per web; il backend gestisce gia' JWT per mobile |
| **Testing** | Vitest + Playwright | Unit/integration con Vitest, E2E con Playwright |

### 1.3 Diagramma di alto livello

```
                    +---------------------------+
                    |     Cloudflare CDN/Edge    |
                    +---------------------------+
                              |
                    +---------------------------+
                    |   Cloudflare Pages         |
                    |   (Astro SSG + SSR)        |
                    +---------------------------+
                         |              |
              +----------+    +---------+--------+
              |               |                  |
    +---------+-----+  +------+------+  +--------+-------+
    | Pagine SSG    |  | Pagine SSR  |  | SPA React      |
    | (landing,     |  | (waitlist,  |  | (/app/*)        |
    |  blog, legal) |  |  dog/[id],  |  | discovery, chat |
    |               |  |  events)    |  | profilo, dash   |
    +---------------+  +------+------+  +--------+-------+
                              |                  |
                    +---------+------------------+
                    |   Fly.io                    |
                    |   (Node.js + Hono API)      |
                    +---------------------------+
                         |         |         |
                    +----+--+ +---+---+ +---+----+
                    | Neon  | |  R2   | | Upstash|
                    | (SQL) | | (img) | | Redis  |
                    +-------+ +-------+ |(cache) |
                         |              +--------+
                    +----+------+
                    | PostgreSQL |
                    | (Neon)     |
                    +------------+
```

---

## 2. Struttura nell'app monorepo

### 2.1 Posizionamento nel monorepo

```
pawmeet-app/
├── apps/
│   ├── mobile/              → Expo (React Native)
│   ├── web/                 → Sito web (Astro + React) ← QUESTO DOCUMENTO
│   ├── backoffice/          → Admin dashboard
│   └── api/                 → Hono su Fly.io (Node.js)
├── packages/
│   ├── types/               → @pawmeet/types
│   ├── validation/          → @pawmeet/validation (Zod)
│   ├── api-client/          → @pawmeet/api-client
│   ├── utils/               → @pawmeet/utils
│   ├── ui/                  → @pawmeet/ui (componenti React condivisi)
│   ├── db/                  → @pawmeet/db (Drizzle schema + migrations)
│   └── config/              → @pawmeet/config (eslint, tsconfig, tailwind)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 2.2 Struttura dettagliata di `apps/web/`

```
apps/web/
├── astro.config.ts                  # Configurazione Astro + adapter Cloudflare
├── tailwind.config.ts               # Estende @pawmeet/config/tailwind
├── tsconfig.json                    # Estende @pawmeet/config/tsconfig
├── package.json
├── public/
│   ├── favicon.svg
│   ├── og-default.jpg               # Open Graph image default
│   ├── robots.txt
│   ├── manifest.json                # PWA manifest (futuro)
│   └── _headers                     # Cloudflare Pages headers
├── src/
│   ├── assets/
│   │   ├── images/                  # Immagini ottimizzate da Astro
│   │   │   ├── hero-landing.webp
│   │   │   ├── how-it-works/
│   │   │   └── team/
│   │   └── fonts/                   # Font self-hosted (no Google Fonts request)
│   │       └── inter/
│   ├── components/
│   │   ├── astro/                   # Componenti Astro (zero JS)
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   ├── Navigation.astro
│   │   │   ├── HeroSection.astro
│   │   │   ├── HowItWorks.astro
│   │   │   ├── TestimonialCard.astro
│   │   │   ├── FeatureGrid.astro
│   │   │   ├── CTASection.astro
│   │   │   ├── AppStoreButtons.astro
│   │   │   ├── BlogPostCard.astro
│   │   │   ├── SEOHead.astro
│   │   │   ├── StructuredData.astro
│   │   │   ├── CookieBanner.astro
│   │   │   └── LanguageSwitcher.astro
│   │   └── react/                   # Componenti React (islands interattivi)
│   │       ├── WaitlistForm.tsx      # Form waitlist con Turnstile
│   │       ├── ContactForm.tsx       # Form contatti
│   │       ├── MobileMenu.tsx        # Menu hamburger mobile
│   │       ├── TestimonialCarousel.tsx
│   │       ├── BlogSearch.tsx        # Ricerca articoli blog
│   │       ├── DogProfileCard.tsx    # Card profilo cane condivisibile
│   │       └── ShareButtons.tsx      # Social share buttons
│   ├── content/
│   │   ├── config.ts                # Content Collections schema (Zod)
│   │   ├── blog/
│   │   │   ├── come-socializzare-cucciolo.md
│   │   │   ├── migliori-parchi-cani-milano.md
│   │   │   └── ...
│   │   └── legal/
│   │       ├── privacy-policy.md
│   │       ├── terms-and-conditions.md
│   │       └── cookie-policy.md
│   ├── i18n/
│   │   ├── index.ts                 # Utility i18n
│   │   ├── routing.ts               # Middleware routing per locale
│   │   └── locales/
│   │       ├── it.json              # Italiano (default)
│   │       ├── en.json
│   │       ├── es.json
│   │       ├── fr.json
│   │       └── de.json
│   ├── layouts/
│   │   ├── BaseLayout.astro         # Layout base con SEOHead, analytics
│   │   ├── MarketingLayout.astro    # Header + Footer per pagine marketing
│   │   ├── BlogLayout.astro         # Layout blog con sidebar/TOC
│   │   ├── LegalLayout.astro        # Layout pagine legali
│   │   └── AppLayout.astro          # Layout minimal per la SPA React
│   ├── pages/
│   │   ├── index.astro              # Homepage / Landing
│   │   ├── chi-siamo.astro          # Chi siamo
│   │   ├── contatti.astro           # Contatti / Supporto
│   │   ├── waitlist.astro           # Pre-registrazione
│   │   ├── blog/
│   │   │   ├── index.astro          # Lista articoli blog
│   │   │   └── [...slug].astro      # Singolo articolo blog
│   │   ├── legal/
│   │   │   ├── privacy.astro        # Privacy Policy
│   │   │   ├── terms.astro          # T&C
│   │   │   └── cookies.astro        # Cookie Policy
│   │   ├── dog/
│   │   │   └── [id].astro           # Profilo cane condivisibile (SSR)
│   │   ├── events/
│   │   │   ├── index.astro          # Lista eventi (SSR)
│   │   │   └── [slug].astro         # Singolo evento (SSR)
│   │   ├── app/
│   │   │   └── [...path].astro      # SPA catch-all (CSR)
│   │   ├── sitemap.xml.ts           # Sitemap dinamica
│   │   └── [...locale]/             # Pagine localizzate (i18n)
│   │       ├── index.astro
│   │       └── ...                  # Mirror delle pagine principali
│   ├── spa/                         # React SPA (web app fase 2)
│   │   ├── App.tsx                  # Root della SPA
│   │   ├── router.tsx               # TanStack Router config
│   │   ├── routes/
│   │   │   ├── dashboard.tsx        # Dashboard utente
│   │   │   ├── profile.tsx          # Profilo utente
│   │   │   ├── discovery.tsx        # Discovery / swipe (versione light)
│   │   │   ├── matches.tsx          # Lista match
│   │   │   ├── chat/
│   │   │   │   ├── index.tsx        # Lista conversazioni
│   │   │   │   └── [matchId].tsx    # Singola conversazione
│   │   │   ├── dog/
│   │   │   │   ├── new.tsx          # Crea profilo cane
│   │   │   │   └── [id]/
│   │   │   │       ├── edit.tsx     # Modifica profilo cane
│   │   │   │       └── index.tsx    # Visualizza profilo cane
│   │   │   └── settings.tsx         # Impostazioni account
│   │   ├── components/              # Componenti specifici della web app
│   │   │   ├── AppShell.tsx         # Shell con sidebar/bottom nav
│   │   │   ├── DiscoveryCard.tsx
│   │   │   ├── ChatBubble.tsx
│   │   │   ├── MatchList.tsx
│   │   │   └── DogProfileForm.tsx
│   │   ├── hooks/                   # Hook specifici web app
│   │   │   ├── useGeolocation.ts
│   │   │   ├── useChat.ts
│   │   │   └── useAuth.ts
│   │   └── stores/                  # Zustand stores
│   │       ├── authStore.ts
│   │       ├── chatStore.ts
│   │       └── discoveryStore.ts
│   ├── styles/
│   │   └── global.css               # @tailwind directives + custom utilities
│   └── utils/
│       ├── cloudflare.ts            # Helpers per CF bindings (R2) e Upstash Redis
│       ├── seo.ts                   # Helpers generazione meta tags
│       └── analytics.ts            # Wrapper analytics events
├── tests/
│   ├── unit/                        # Test Vitest
│   └── e2e/                         # Test Playwright
└── wrangler.toml                    # Configurazione Cloudflare Pages (deploy web)
```

### 2.3 Configurazione Astro

```typescript
// astro.config.ts
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://pawmeet.io',
  output: 'hybrid',  // SSG di default, SSR opt-in per route
  adapter: cloudflare({
    platformProxy: {
      enabled: true,  // Accesso a R2 in dev
    },
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      i18n: {
        defaultLocale: 'it',
        locales: { it: 'it-IT', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' },
      },
    }),
    mdx(),
  ],
  i18n: {
    defaultLocale: 'it',
    locales: ['it', 'en', 'es', 'fr', 'de'],
    routing: {
      prefixDefaultLocale: false,  // / = italiano, /en/ = inglese
    },
  },
  vite: {
    optimizeDeps: {
      include: ['@pawmeet/ui', '@pawmeet/validation'],
    },
  },
});
```

---

## 3. Pagine e Routes

### 3.1 Marketing Site (Fase 1)

| Route | Pagina | Rendering | Descrizione |
|-------|--------|:---------:|-------------|
| `/` | Homepage | **SSG** | Hero, value proposition, come funziona, testimonial, CTA download |
| `/chi-siamo` | Chi siamo | **SSG** | Team, missione, storia |
| `/blog` | Blog index | **SSG** | Lista articoli, paginazione, categorie |
| `/blog/[slug]` | Articolo blog | **SSG** | Singolo post, Content Collections |
| `/waitlist` | Waiting list | **SSR** | Form pre-registrazione con Turnstile, salvataggio su Fly.io API |
| `/contatti` | Contatti | **SSG** | Form contatti (island React), info supporto |
| `/legal/privacy` | Privacy Policy | **SSG** | Content Collection Markdown |
| `/legal/terms` | Termini e Condizioni | **SSG** | Content Collection Markdown |
| `/legal/cookies` | Cookie Policy | **SSG** | Content Collection Markdown |
| `/dog/[id]` | Profilo cane pubblico | **SSR** | Profilo condivisibile sui social, con Open Graph dinamico |
| `/events` | Lista eventi | **SSR** | Eventi pubblici PawMeet, filtrabili per citta' |
| `/events/[slug]` | Singolo evento | **SSR** | Dettaglio evento con mappa, partecipanti, CTA |
| `/sitemap.xml` | Sitemap | **SSG** | Generata automaticamente da @astrojs/sitemap |

### 3.2 Pagine localizzate

Le pagine SSG vengono generate per ogni locale configurato. L'italiano e' il default senza prefisso:

| Route IT (default) | Route EN | Route ES |
|---------------------|----------|----------|
| `/` | `/en` | `/es` |
| `/chi-siamo` | `/en/about` | `/es/sobre-nosotros` |
| `/blog` | `/en/blog` | `/es/blog` |
| `/waitlist` | `/en/waitlist` | `/es/waitlist` |
| `/contatti` | `/en/contact` | `/es/contacto` |
| `/legal/privacy` | `/en/legal/privacy` | `/es/legal/privacidad` |

### 3.3 Web App SPA (Fase 2)

Tutte le route sotto `/app/*` sono gestite da una singola pagina Astro (`pages/app/[...path].astro`) che monta la React SPA. Il routing interno e' gestito da TanStack Router con code splitting.

| Route | Pagina | Rendering | Auth richiesta |
|-------|--------|:---------:|:--------------:|
| `/app` | Dashboard | **CSR** | Si' |
| `/app/profile` | Profilo utente | **CSR** | Si' |
| `/app/profile/edit` | Modifica profilo | **CSR** | Si' |
| `/app/dogs` | I miei cani | **CSR** | Si' |
| `/app/dogs/new` | Nuovo profilo cane | **CSR** | Si' |
| `/app/dogs/[id]` | Profilo cane | **CSR** | Si' |
| `/app/dogs/[id]/edit` | Modifica profilo cane | **CSR** | Si' |
| `/app/discovery` | Discovery / Swipe | **CSR** | Si' |
| `/app/matches` | Lista match | **CSR** | Si' |
| `/app/chat` | Lista conversazioni | **CSR** | Si' |
| `/app/chat/[matchId]` | Conversazione | **CSR** | Si' |
| `/app/events` | Eventi (vista utente) | **CSR** | Si' |
| `/app/settings` | Impostazioni | **CSR** | Si' |

### 3.4 Strategia di rendering

```
                  Marketing Site                    Web App
              ┌─────────────────────┐         ┌──────────────┐
              │                     │         │              │
  SSG ────────┤  Landing, Blog,     │         │              │
  (build time)│  Legal, Chi siamo   │         │              │
              │                     │         │              │
              ├─────────────────────┤   CSR ──┤  /app/*      │
  SSR ────────┤  Waitlist,          │  (SPA)  │  React +     │
  (on-demand) │  Dog/[id],          │         │  TanStack    │
              │  Events             │         │  Router      │
              └─────────────────────┘         └──────────────┘
```

**Perche' SSR per `/waitlist`**: Il form di pre-registrazione usa Cloudflare Turnstile per anti-bot. La pagina viene renderizzata server-side per generare il token Turnstile e validare la submission direttamente nell'edge function, evitando round-trip aggiuntivi al backend.

**Perche' SSR per `/dog/[id]`**: I profili cane condivisibili devono generare meta tag Open Graph dinamici (titolo, descrizione, immagine del cane) per avere preview corrette quando condivisi su social network. L'SSR su Cloudflare edge e' sufficientemente veloce (~20ms TTFB) per questo use case.

**Perche' CSR per `/app/*`**: La web app richiede interattivita' completa, gestione stato client-side, WebSocket per la chat. Non c'e' beneficio SEO (contenuto dietro autenticazione). La SPA viene servita come shell HTML statica + bundle JS, con data fetching tramite TanStack Query.

---

## 4. Integrazione Cloudflare

### 4.1 Cloudflare Pages

```
┌──────────────────────────────────────────┐
│           Cloudflare Pages               │
├──────────────────────────────────────────┤
│  Static Assets (SSG)                     │
│  ├── /*.html (landing, blog, legal)      │
│  ├── /_astro/* (JS/CSS bundles)          │
│  └── /public/* (immagini, fonts)         │
├──────────────────────────────────────────┤
│  Edge Functions (SSR) ← Pages Functions  │
│  ├── /waitlist                           │
│  ├── /dog/[id]                           │
│  ├── /events/*                           │
│  └── /app/* (serve SPA shell)            │
└──────────────────────────────────────────┘
```

**Configurazione deploy:**

- Branch `main` -> production (`pawmeet.io`)
- Branch `develop` -> preview (`preview.pawmeet.io`)
- Build command: `pnpm turbo build --filter=web`
- Output directory: `apps/web/dist`
- Node.js version: 20.x (per il build)

### 4.2 API calls via Fly.io

Le API vivono in `apps/api/` come servizio Node.js su Fly.io, esposto su `api.pawmeet.io`. Il web lo chiama tramite `@pawmeet/api-client`:

```typescript
// packages/api-client/src/index.ts
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@pawmeet/api'; // tipi del router tRPC

export const createApiClient = (baseUrl: string) => {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        // Su web: cookie-based auth (credentials: 'include')
        // Su mobile: Bearer token
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            credentials: 'include', // invia cookies HttpOnly
          }),
      }),
    ],
  });
};
```

La web app usa il client cosi':

```typescript
// apps/web/src/spa/hooks/useApi.ts
import { createApiClient } from '@pawmeet/api-client';

export const api = createApiClient('https://api.pawmeet.io');

// Esempio con TanStack Query
export const useDogProfile = (dogId: string) => {
  return useQuery({
    queryKey: ['dog', dogId],
    queryFn: () => api.dog.getById.query({ id: dogId }),
  });
};
```

### 4.3 Immagini via Cloudflare R2 + Images

```
┌──────────────┐     ┌─────────────────────┐     ┌────────────┐
│  Client      │────>│ Cloudflare Images   │────>│     R2     │
│  (browser)   │     │ (resize on-the-fly) │     │  (storage) │
└──────────────┘     └─────────────────────┘     └────────────┘
                              │
                     /cdn-cgi/image/
                     width=400,height=400,
                     format=auto,quality=80
                     /dog-photos/abc123.jpg
```

**Strategia immagini:**

| Contesto | Dimensione | Formato | Qualita' |
|----------|-----------|---------|----------|
| Thumbnail lista | 200x200 | WebP/AVIF auto | 75 |
| Card profilo cane | 400x400 | WebP/AVIF auto | 80 |
| Foto profilo full | 800x800 | WebP/AVIF auto | 85 |
| Hero landing | 1200x630 | WebP/AVIF auto | 85 |
| Open Graph | 1200x630 | JPEG (compatibilita') | 90 |

Le immagini statiche del marketing site (hero, team, illustrazioni) sono processate a build time da Astro Image (`<Image />` component) e servite dal CDN Pages.

Le foto dei cani (user-generated) sono su R2 e trasformate on-the-fly da Cloudflare Images.

### 4.4 Upstash Redis per caching

| Key pattern | Contenuto | TTL | Use Case |
|-----------|----------|-----|----------|
| `web:dog:{id}` | Profili cane pubblici (JSON) | 5 min | Cache SSR `/dog/[id]` per evitare query DB su ogni richiesta |
| `web:events` | Lista eventi (JSON) | 15 min | Cache SSR `/events` |
| `web:blog:meta:{slug}` | Metadata blog posts | 1 ora | Contatore visite, articoli correlati |
| `web:waitlist:rate:{ip}` | Rate limiting per IP | 1 ora | Anti-abuse form waitlist |

```typescript
// Esempio uso Upstash Redis nella route SSR /dog/[id]
// apps/web/src/pages/dog/[id].astro
---
import { Redis } from '@upstash/redis';

export const prerender = false; // SSR

const redis = Redis.fromEnv();
const { id } = Astro.params;

// Check cache
const cacheKey = `web:dog:${id}`;
let dogProfile = await redis.get(cacheKey);

if (!dogProfile) {
  // Fetch from API
  const response = await fetch(`${import.meta.env.API_URL}/dogs/${id}`);
  if (!response.ok) return Astro.redirect('/404');
  dogProfile = await response.json();
  // Cache per 5 minuti
  await redis.set(cacheKey, JSON.stringify(dogProfile), { ex: 300 });
}
---
```

### 4.5 Cloudflare Web Analytics

```html
<!-- Inserito in BaseLayout.astro -->
<!-- Cloudflare Web Analytics - NO cookies, NO PII, GDPR compliant -->
<script
  defer
  src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "..."}'
></script>
```

Cloudflare Web Analytics non usa cookies e non raccoglie dati personali, quindi non richiede consenso GDPR. Viene integrato come analytics primario.

Per analytics piu' avanzati (funnel conversion, custom events), si aggiunge **Plausible Analytics** (cloud o self-hosted), anch'esso cookie-free e GDPR compliant senza banner.

```typescript
// apps/web/src/utils/analytics.ts
export const trackEvent = (name: string, props?: Record<string, string>) => {
  // Plausible custom events
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(name, { props });
  }
};

// Uso
trackEvent('waitlist_signup', { source: 'homepage_cta' });
trackEvent('dog_profile_shared', { breed: 'labrador' });
```

### 4.6 Turnstile per anti-bot

Il form di waitlist e contatti usa Cloudflare Turnstile (alternativa CAPTCHA invisibile):

```typescript
// apps/web/src/components/react/WaitlistForm.tsx
import { Turnstile } from '@marsidev/react-turnstile';

export function WaitlistForm() {
  const [token, setToken] = useState<string | null>(null);

  const onSubmit = async (data: WaitlistFormData) => {
    const response = await fetch('/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ ...data, turnstileToken: token }),
    });
    // ...
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="email" {...register('email')} />
      <Turnstile
        siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY}
        onSuccess={setToken}
      />
      <button type="submit" disabled={!token}>Iscriviti</button>
    </form>
  );
}
```

La validazione del token avviene server-side nella Pages Function:

```typescript
// apps/web/functions/api/waitlist.ts
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { email, turnstileToken } = await context.request.json();

  // Valida Turnstile token
  const turnstileResponse = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body: JSON.stringify({
        secret: context.env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
      }),
    }
  );
  const result = await turnstileResponse.json();
  if (!result.success) {
    return new Response('Invalid captcha', { status: 403 });
  }

  // Salva tramite Fly.io API
  // ...
};
```

---

## 5. Performance & SEO

### 5.1 Core Web Vitals Targets

| Metrica | Target | Come lo raggiungiamo |
|---------|--------|---------------------|
| **LCP** (Largest Contentful Paint) | < 1.5s | Astro SSG = HTML pre-renderizzato. Hero image con `fetchpriority="high"`, preload, formato WebP/AVIF. Font self-hosted con `font-display: swap`. |
| **INP** (Interaction to Next Paint) | < 100ms | Zero JS sulle pagine statiche. Islands React caricati con `client:visible` (lazy). Nessun hydration inutile. |
| **CLS** (Cumulative Layout Shift) | < 0.05 | `width`/`height` espliciti su tutte le immagini (Astro Image li aggiunge automaticamente). Font fallback con `size-adjust`. Skeleton per contenuti asincroni. |
| **FCP** (First Contentful Paint) | < 0.8s | Edge-rendered su Cloudflare (TTFB < 50ms per SSG, < 100ms per SSR). Inline critical CSS via Astro. |
| **TTFB** | < 100ms | Cloudflare CDN con 300+ PoP globali. SSG servito direttamente dal CDN. SSR su edge (non origin). |

### 5.2 Confronto peso pagine

| Pagina | Con Astro (nostra scelta) | Con Next.js (ipotetico) |
|--------|:------------------------:|:-----------------------:|
| Homepage (SSG) | ~15 KB JS (solo islands) | ~90 KB JS (framework) |
| Blog post (SSG) | ~0 KB JS | ~85 KB JS |
| Privacy policy (SSG) | ~0 KB JS | ~85 KB JS |
| Web App (CSR) | ~150 KB JS (React SPA) | ~180 KB JS |

### 5.3 Structured Data (JSON-LD)

```typescript
// apps/web/src/components/astro/StructuredData.astro
---
interface Props {
  type: 'Organization' | 'WebSite' | 'BlogPosting' | 'Event' | 'Product';
  data: Record<string, unknown>;
}

const { type, data } = Astro.props;
---

<script type="application/ld+json" set:html={JSON.stringify({
  '@context': 'https://schema.org',
  '@type': type,
  ...data,
})} />
```

**Schema implementati per pagina:**

| Pagina | Schema.org Type | Dati |
|--------|----------------|------|
| Homepage | `Organization`, `WebSite`, `SoftwareApplication` | Info azienda, search action, link app store |
| Blog post | `BlogPosting`, `BreadcrumbList` | Autore, data, immagine, breadcrumb |
| Dog profile | `Thing` (custom) | Nome cane, razza, immagine, descrizione |
| Evento | `Event` | Data, luogo, organizzatore, prezzo |
| Chi siamo | `Organization`, `Person[]` | Team members, fondazione |

**Esempio profilo cane condivisibile:**

```json
{
  "@context": "https://schema.org",
  "@type": "Thing",
  "name": "Luna",
  "description": "Labrador femmina di 2 anni, molto socievole. Adora le passeggiate al parco.",
  "image": "https://cdn.pawmeet.io/dogs/abc123/photo-1.jpg",
  "additionalType": "https://pawmeet.io/schema/DogProfile",
  "breed": "Labrador Retriever",
  "sameAs": "https://pawmeet.io/dog/abc123"
}
```

### 5.4 Open Graph / Social Cards

Ogni pagina SSR genera meta tag OG dinamici. Per le pagine SSG, sono definiti staticamente.

```astro
<!-- apps/web/src/components/astro/SEOHead.astro -->
---
interface Props {
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
}

const { title, description, image = '/og-default.jpg', type = 'website', noindex = false } = Astro.props;
const canonicalUrl = new URL(Astro.url.pathname, Astro.site);
---

<title>{title} | PawMeet</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonicalUrl} />

{noindex && <meta name="robots" content="noindex, nofollow" />}

<!-- Open Graph -->
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={new URL(image, Astro.site)} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:type" content={type} />
<meta property="og:site_name" content="PawMeet" />
<meta property="og:locale" content="it_IT" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={new URL(image, Astro.site)} />

<!-- App links -->
<meta property="al:ios:app_store_id" content="XXXXXXXXX" />
<meta property="al:ios:app_name" content="PawMeet" />
<meta property="al:android:package" content="app.pawmeet.android" />
<meta property="al:android:app_name" content="PawMeet" />
```

**Social card per profilo cane** (`/dog/[id]`): L'immagine OG viene generata dinamicamente da una Cloudflare Pages Function dedicata (`og.pawmeet.io/dog/[id].png`) usando `@cloudflare/pages-plugin-vercel-og` o `satori` + `resvg-wasm`. La card mostra la foto del cane, nome, razza e punteggio di compatibilita'.

### 5.5 Sitemap

Generata automaticamente da `@astrojs/sitemap` per le pagine SSG. Per le pagine SSR (profili cane, eventi), una sitemap dinamica viene generata da un endpoint dedicato:

```typescript
// apps/web/src/pages/sitemap-dogs.xml.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const { env } = locals.runtime;
  // Fetch ultimi 1000 profili cane pubblici
  const dogs = await fetch(`${import.meta.env.API_URL}/dogs/public?limit=1000`);
  const data = await dogs.json();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${data.dogs.map((dog: { id: string; updatedAt: string }) => `
        <url>
          <loc>https://pawmeet.io/dog/${dog.id}</loc>
          <lastmod>${dog.updatedAt}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.6</priority>
        </url>
      `).join('')}
    </urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};

export const prerender = false;
```

**Sitemap index** (`/sitemap-index.xml`) che raggruppa:
- `/sitemap-0.xml` (pagine statiche, generata da Astro)
- `/sitemap-dogs.xml` (profili cane, dinamica)
- `/sitemap-events.xml` (eventi, dinamica)
- `/sitemap-blog.xml` (articoli blog, generata da Astro)

### 5.6 robots.txt

```
# apps/web/public/robots.txt
User-agent: *
Allow: /
Disallow: /app/
Disallow: /api/

Sitemap: https://pawmeet.io/sitemap-index.xml
```

Le pagine sotto `/app/` sono escluse dall'indicizzazione perche' richiedono autenticazione e non hanno valore SEO.

---

## 6. Shared Packages

### 6.1 Mappa delle dipendenze

```
                    ┌──────────────┐
                    │ @pawmeet/    │
                    │ config       │
                    │ (eslint, ts, │
                    │  tailwind)   │
                    └──────┬───────┘
                           │ usato da tutti
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐     ┌──────▼──────┐   ┌──────▼──────┐
    │  types  │     │ validation  │   │   utils     │
    │         │     │ (Zod)       │   │             │
    └────┬────┘     └──────┬──────┘   └──────┬──────┘
         │                 │                 │
         └────────┬────────┴────────┬────────┘
                  │                 │
           ┌──────▼──────┐  ┌──────▼──────┐
           │ api-client  │  │    ui       │
           │ (tRPC)      │  │ (React)    │
           └──────┬──────┘  └──────┬──────┘
                  │                 │
    ┌─────────────┼─────────────────┼───────────┐
    │             │                 │           │
┌───▼───┐   ┌────▼────┐    ┌───────▼──┐  ┌────▼──────┐
│  web  │   │ mobile  │    │backoffice│  │   api     │
│(Astro)│   │ (Expo)  │    │          │  │ (Hono)   │
└───────┘   └─────────┘    └──────────┘  └──────────┘
```

### 6.2 `@pawmeet/types`

Tipi TypeScript condivisi tra tutti i progetti. Nessuna dipendenza runtime.

```typescript
// packages/types/src/dog.ts
export interface DogProfile {
  id: string;
  ownerId: string;
  name: string;
  birthDate: string; // ISO 8601
  breed: string;
  breedSecondary?: string;
  size: DogSize;
  weightKg: number;
  gender: 'maschio' | 'femmina';
  isNeutered: boolean;
  energyLevel: EnergyLevel;
  behaviorWithDogs: BehaviorLevel;
  behaviorWithPeople: BehaviorLevel;
  leashBehavior: LeashBehavior;
  recallReliability?: RecallReliability;
  bio?: string;
  walkPrefTime: WalkTime[];
  walkPrefDurationMin: number;
  walkPrefDurationMax: number;
  walkPrefTerrain: TerrainType[];
  isActive: boolean;
  photos: DogPhoto[];
  createdAt: string;
  updatedAt: string;
}

export type DogSize = 'toy' | 'piccola' | 'media' | 'grande' | 'gigante';
export type EnergyLevel = 'bassa' | 'media' | 'alta' | 'molto_alta';
// ... altri tipi
```

**Uso nel web:**
```typescript
import type { DogProfile, DogSize } from '@pawmeet/types';
```

### 6.3 `@pawmeet/validation`

Schemi Zod usati per validazione form (client) e API (server). Single source of truth.

```typescript
// packages/validation/src/dog.ts
import { z } from 'zod';

export const dogSizeSchema = z.enum(['toy', 'piccola', 'media', 'grande', 'gigante']);

export const createDogProfileSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-zA-ZÀ-ÿ\s]+$/),
  birthDate: z.string().date(),
  breed: z.string().min(1),
  size: dogSizeSchema,
  weightKg: z.number().min(0.5).max(100),
  // ... altri campi con validazioni dettagliate
}).refine(
  (data) => isWeightConsistentWithSize(data.weightKg, data.size),
  { message: 'Il peso non e\' coerente con la taglia selezionata' }
);

export const waitlistSchema = z.object({
  email: z.string().email('Email non valida'),
  name: z.string().min(2).max(50).optional(),
  city: z.string().min(2).max(100).optional(),
  hasDog: z.boolean().optional(),
  turnstileToken: z.string().min(1),
});

export type CreateDogProfileInput = z.infer<typeof createDogProfileSchema>;
export type WaitlistInput = z.infer<typeof waitlistSchema>;
```

**Uso nel web con React Hook Form:**
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { waitlistSchema } from '@pawmeet/validation';

const { register, handleSubmit } = useForm({
  resolver: zodResolver(waitlistSchema),
});
```

### 6.4 `@pawmeet/api-client`

Client tRPC type-safe generato dai tipi del router. Funziona sia su web (fetch con cookies) che su mobile (fetch con Bearer token).

```typescript
// packages/api-client/src/index.ts
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@pawmeet/api';

export type ApiClient = ReturnType<typeof createApiClient>;

export const createApiClient = (
  baseUrl: string,
  options?: {
    authMode?: 'cookie' | 'bearer';
    getToken?: () => Promise<string | null>;
  }
) => {
  const { authMode = 'cookie', getToken } = options ?? {};

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        fetch: async (input, init) => {
          const headers = new Headers(init?.headers);

          if (authMode === 'bearer' && getToken) {
            const token = await getToken();
            if (token) headers.set('Authorization', `Bearer ${token}`);
          }

          return fetch(input, {
            ...init,
            headers,
            credentials: authMode === 'cookie' ? 'include' : 'omit',
          });
        },
      }),
    ],
  });
};
```

### 6.5 `@pawmeet/ui`

Componenti React condivisi tra web e backoffice. **Non** condivisi con mobile (React Native ha componenti diversi), ma la logica e l'API dei componenti sono allineate.

```typescript
// packages/ui/src/components/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@pawmeet/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-amber-500 text-white hover:bg-amber-600',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        ghost: 'hover:bg-slate-100',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);
```

### 6.6 `@pawmeet/utils`

Utility function pure, senza dipendenze da framework:

```typescript
// packages/utils/src/index.ts
export { cn } from './cn';                          // classnames merge (clsx + twMerge)
export { formatDistance } from './format-distance';  // "< 1 km", "~2 km", "> 10 km"
export { calculateAge } from './calculate-age';      // Da birthDate a "2 anni"
export { slugify } from './slugify';                 // Per URL-friendly strings
export { truncate } from './truncate';               // Tronca testo con ellipsis
```

---

## 7. Design e Componenti

### 7.1 Design System - Traduzione in Tailwind

Il design system definito dal team UX/UI viene implementato come configurazione Tailwind condivisa:

```typescript
// packages/config/tailwind/index.ts
import type { Config } from 'tailwindcss';

export default {
  content: [], // Ogni app aggiunge i suoi path
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#FFC107',  // Primary - Amber/Gold (calore, energia, amicizia)
          600: '#FFB300',
          700: '#FFA000',
          800: '#FF8F00',
          900: '#FF6F00',
        },
        nature: {
          50:  '#E8F5E9',
          100: '#C8E6C9',
          500: '#4CAF50',  // Secondary - Green (natura, passeggiate, outdoor)
          700: '#388E3C',
        },
        earth: {
          50:  '#EFEBE9',
          100: '#D7CCC8',
          500: '#795548',  // Accent - Brown (terra, cani, naturalezza)
          700: '#5D4037',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],  // Per titoli
      },
      borderRadius: {
        'card': '1rem',
        'button': '0.75rem',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),  // Per blog content
    require('@tailwindcss/forms'),       // Per form styling
  ],
} satisfies Partial<Config>;
```

### 7.2 Responsive Design Strategy (Mobile-First)

Breakpoint system:

| Breakpoint | Larghezza | Device target |
|------------|-----------|---------------|
| Default (no prefix) | 0-639px | Mobile portrait |
| `sm:` | 640px+ | Mobile landscape / tablet portrait |
| `md:` | 768px+ | Tablet |
| `lg:` | 1024px+ | Desktop piccolo |
| `xl:` | 1280px+ | Desktop |
| `2xl:` | 1536px+ | Desktop grande |

**Layout pattern per sezione:**

```
Mobile (default)          Tablet (md:)              Desktop (lg:)
┌────────────────┐       ┌──────────────────┐      ┌────────────────────────┐
│   Header       │       │     Header       │      │       Header           │
├────────────────┤       ├────────┬─────────┤      ├──────┬─────────────────┤
│                │       │        │         │      │ Side │                 │
│   Content      │       │Content │ Sidebar │      │ bar  │    Content      │
│   (stacked)    │       │        │         │      │      │                 │
│                │       │        │         │      │      │                 │
├────────────────┤       ├────────┴─────────┤      ├──────┴─────────────────┤
│   Footer       │       │     Footer       │      │       Footer           │
└────────────────┘       └──────────────────┘      └────────────────────────┘
```

**Web App responsive:**

```
Mobile (default)          Desktop (lg:)
┌────────────────┐       ┌──────┬─────────────────┐
│   Top bar      │       │ Side │                 │
├────────────────┤       │ bar  │                 │
│                │       │      │    Content      │
│   Content      │       │ Nav  │                 │
│                │       │ icons│                 │
│                │       │      │                 │
├────────────────┤       │      │                 │
│  Bottom nav    │       └──────┴─────────────────┘
└────────────────┘
```

Su mobile, la web app usa una bottom navigation bar (come l'app nativa). Su desktop, una sidebar a sinistra.

### 7.3 Dark Mode Support

Implementato con la strategia `class` di Tailwind, sincronizzato con la preferenza di sistema:

```typescript
// packages/config/tailwind/index.ts
export default {
  darkMode: 'class',
  // ...
};
```

```typescript
// apps/web/src/utils/theme.ts
export function initTheme() {
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
}
```

Le pagine marketing partono in light mode (piu' adatto al branding caldo/amber). La web app rispetta la preferenza utente.

**Palette dark mode:**

```css
/* Esempio mapping */
.dark {
  --brand-500: #FFD54F;   /* Piu' chiaro per contrasto su sfondo scuro */
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
}
```

### 7.4 Componenti chiave

| Componente | Tipo | Dove e' usato | Note |
|-----------|------|---------------|------|
| `HeroSection` | Astro (zero JS) | Homepage | Illustrazione + CTA, nessuna interattivita' |
| `WaitlistForm` | React island | Homepage, /waitlist | `client:visible` per lazy load, Turnstile |
| `DogProfileCard` | React (shared) | /dog/[id], web app | Condiviso con backoffice via @pawmeet/ui |
| `AppStoreButtons` | Astro (zero JS) | Homepage, footer | Link statici App Store / Google Play |
| `TestimonialCarousel` | React island | Homepage | `client:visible`, swiper-lite |
| `BlogPostCard` | Astro (zero JS) | /blog | Card con immagine, titolo, excerpt |
| `DiscoveryCard` | React (SPA) | /app/discovery | Swipe card, animazioni gesture |
| `ChatBubble` | React (SPA) | /app/chat | Real-time via WebSocket |
| `AppShell` | React (SPA) | /app/* | Layout con nav, sidebar responsive |

---

## 8. Internazionalizzazione (i18n)

### 8.1 Strategia

| Aspetto | Scelta | Motivazione |
|---------|--------|-------------|
| **Lingua default** | Italiano | Mercato primario Italia |
| **Lingue fase 1** | IT, EN | Inglese per copertura internazionale base e turisti |
| **Lingue fase 2** | + ES, FR, DE | Espansione EU come da piano di mercato |
| **Routing** | Prefisso path (es. `/en/blog`) | SEO-friendly, ogni lingua ha URL dedicato indicizzabile |
| **Default senza prefisso** | Si' (`/` = italiano) | URL puliti per il mercato primario |
| **Rilevamento lingua** | `Accept-Language` header + cookie preferenza | Redirect automatico alla prima visita, poi rispetta la scelta |
| **Content (blog)** | File separati per lingua | `/content/blog/it/`, `/content/blog/en/` |
| **Stringhe UI** | JSON per locale | File JSON flat, nessun nesting eccessivo |

### 8.2 Implementazione

Astro 5 ha supporto i18n nativo. La configurazione in `astro.config.ts` (gia' mostrata sopra) abilita il routing per locale.

```typescript
// apps/web/src/i18n/index.ts
import it from './locales/it.json';
import en from './locales/en.json';

const translations = { it, en } as const;
type Locale = keyof typeof translations;

export function t(key: string, locale: Locale = 'it'): string {
  const keys = key.split('.');
  let value: any = translations[locale];
  for (const k of keys) {
    value = value?.[k];
  }
  return value ?? key; // Fallback: ritorna la chiave se non trovata
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, locale] = url.pathname.split('/');
  if (locale in translations) return locale as Locale;
  return 'it';
}
```

**Struttura file di traduzione:**

```json
// apps/web/src/i18n/locales/it.json
{
  "nav": {
    "home": "Home",
    "about": "Chi siamo",
    "blog": "Blog",
    "waitlist": "Lista d'attesa",
    "contact": "Contatti",
    "login": "Accedi",
    "download": "Scarica l'app"
  },
  "hero": {
    "title": "Trova il compagno di passeggiata perfetto per il tuo cane",
    "subtitle": "Matching intelligente basato su compatibilita', geolocalizzazione e chat sicura.",
    "cta_primary": "Iscriviti alla waiting list",
    "cta_secondary": "Scopri come funziona"
  },
  "waitlist": {
    "title": "Unisciti alla lista d'attesa",
    "subtitle": "Sii tra i primi a provare PawMeet nella tua citta'.",
    "email_placeholder": "La tua email",
    "name_placeholder": "Il tuo nome (opzionale)",
    "city_placeholder": "La tua citta' (opzionale)",
    "has_dog_label": "Ho gia' un cane",
    "submit": "Iscrivimi",
    "success": "Perfetto! Ti avviseremo quando PawMeet sara' disponibile nella tua zona.",
    "error": "Si e' verificato un errore. Riprova."
  },
  "footer": {
    "privacy": "Privacy Policy",
    "terms": "Termini e Condizioni",
    "cookies": "Cookie Policy",
    "copyright": "PawMeet. Tutti i diritti riservati."
  }
}
```

### 8.3 SEO multilingua

Ogni pagina localizzata include i tag `hreflang` per indicare le versioni alternative ai motori di ricerca:

```astro
<!-- Generato automaticamente in SEOHead.astro -->
<link rel="alternate" hreflang="it" href="https://pawmeet.io/" />
<link rel="alternate" hreflang="en" href="https://pawmeet.io/en/" />
<link rel="alternate" hreflang="es" href="https://pawmeet.io/es/" />
<link rel="alternate" hreflang="x-default" href="https://pawmeet.io/" />
```

### 8.4 Web App (SPA) i18n

La web app usa la stessa struttura JSON ma caricata runtime. TanStack Router gestisce il locale come search param o cookie (non come path prefix, perche' `/app/` e' gia' un namespace dedicato):

```typescript
// apps/web/src/spa/i18n.ts
import { create } from 'zustand';

interface I18nStore {
  locale: 'it' | 'en' | 'es' | 'fr' | 'de';
  messages: Record<string, string>;
  setLocale: (locale: string) => Promise<void>;
}

export const useI18n = create<I18nStore>((set) => ({
  locale: 'it',
  messages: {},
  setLocale: async (locale) => {
    const messages = await import(`../i18n/locales/${locale}.json`);
    set({ locale: locale as any, messages: messages.default });
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
  },
}));
```

### 8.5 Content localizzato (blog)

I blog post sono organizzati per lingua:

```
src/content/blog/
├── it/
│   ├── come-socializzare-cucciolo.md
│   └── migliori-parchi-cani-milano.md
├── en/
│   ├── how-to-socialize-puppy.md
│   └── best-dog-parks-milan.md
└── es/
    └── como-socializar-cachorro.md
```

Ogni post ha un campo `translationKey` nel frontmatter per collegare le versioni:

```markdown
---
title: "Come socializzare un cucciolo"
translationKey: "socialize-puppy"
locale: "it"
---
```

Questo permette di generare automaticamente i link `hreflang` tra le versioni tradotte dello stesso articolo.

---

## Appendice A: Checklist di Lancio

- [ ] Cloudflare Pages configurato con custom domain `pawmeet.io`
- [ ] SSL/TLS Full (Strict) abilitato
- [ ] `_headers` file con security headers (CSP, X-Frame-Options, etc.)
- [ ] Cloudflare Web Analytics token configurato
- [ ] Turnstile site key e secret key configurati
- [ ] Upstash Redis configurato con credenziali (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
- [ ] R2 bucket configurato per immagini
- [ ] Sitemap verificata su Google Search Console
- [ ] robots.txt verificato
- [ ] Open Graph preview testato con Facebook Debugger e Twitter Card Validator
- [ ] Core Web Vitals verificati con Lighthouse CI (score > 95)
- [ ] Test E2E Playwright passano su tutte le pagine critiche
- [ ] i18n: tutte le stringhe tradotte per le lingue attive
- [ ] Accessibilita': audit WCAG 2.1 AA superato
- [ ] Dark mode testato su tutte le pagine

---

> **Documento redatto da:** Senior Frontend Architect
> **Prossima revisione:** Dopo Sprint 0 (post-PoC tech stack)
> **Stato:** Da validare con il team backend per allineamento API (Fly.io) e servizi Cloudflare (Pages, R2, CDN)

NOT FOUND
