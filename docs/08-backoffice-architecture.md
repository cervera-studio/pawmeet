# DogWalk - Architettura Backoffice / Admin Panel

> **Versione:** 2.0
> **Data:** 9 marzo 2026
> **Tipo documento:** Architettura tecnica backoffice
> **Stato:** Approvato
> **Aggiornamento:** Migrazione da Refine + Ant Design a Next.js + shadcn/ui + TanStack Table (vedi doc 11 per il dibattito architetturale)

---

## Indice

1. [Tech Stack e Scelta del Framework](#1-tech-stack-e-scelta-del-framework)
2. [Struttura nel Monorepo](#2-struttura-nel-monorepo)
3. [API Admin](#3-api-admin)
4. [Integrazione Infrastruttura (Fly.io + Cloudflare)](#4-integrazione-infrastruttura-flyio--cloudflare)
5. [Moderazione Workflow](#5-moderazione-workflow)
6. [Dashboard e Reporting](#6-dashboard-e-reporting)
7. [RBAC - Role-Based Access Control](#7-rbac---role-based-access-control)
8. [Audit e Compliance](#8-audit-e-compliance)

---

## 1. Tech Stack e Scelta del Framework

### 1.1 Decisione: Next.js + shadcn/ui + TanStack Table

A seguito del dibattito architetturale documentato nel doc 11, il panel ha votato all'unanimita (5-0) per l'**Opzione B: Next.js + shadcn/ui + TanStack Table**, abbandonando l'originale Opzione A (Refine + Ant Design).

**Motivazione sintetica:**

1. **Uniformita dello stack**: Zero nuove tecnologie, zero nuovi design system, zero nuovi paradigmi. Il backoffice usa lo stesso stack del resto del progetto (Next.js, Tailwind CSS, React Hook Form + Zod, shadcn/ui, repository pattern). Ogni dev che lavora sul mobile o sulla web app puo lavorare sul backoffice senza ramp-up.

2. **Costo di manutenzione ridotto**: ~15 dipendenze in meno da aggiornare, monitorare e debuggare. Un solo design system da mantenere allineato al brand.

3. **Workflow custom non penalizzati**: Il backoffice ha workflow custom (moderazione foto, dashboard analytics, audit log) che richiederebbero comunque codice custom anche con Refine. Il vantaggio di Refine (CRUD automatizzato) si applica solo alle pagine piu semplici.

4. **Time-to-MVP accettabile**: La differenza stimata e di ~7 giorni lavorativi rispetto a Refine, recuperati in zero ramp-up sul framework e manutenzione ridotta nei mesi successivi.

5. **Repository layer leggero**: I view-model non chiamano tRPC/REST direttamente ma passano attraverso interfacce repository (`UserRepository`, `DogRepository`, etc.) fornite via React Context. Questo permette di migrare incrementalmente da REST a tRPC senza toccare i view-model, e di mockare facilmente i repository nei test. I form usano React Hook Form + Zod direttamente, senza adattare la validazione a un sistema proprietario.

### 1.2 Stack Completo

| Layer | Tecnologia | Versione | Motivazione |
|-------|-----------|----------|-------------|
| **Framework** | Next.js (App Router) | 15.x | Stesso della web app, SSR/ISR per dashboard |
| **UI Library** | shadcn/ui | - | Componenti copiati nel progetto, zero dipendenza runtime, stesso design system di web e mobile |
| **Styling** | Tailwind CSS | 4.x | Stesso del resto del progetto, design system unificato |
| **Data Fetching** | Server Components + Server Actions + Repository pattern | - | Data fetching server-side via repository interfaces, mutations via Server Actions. Nessuna dipendenza client-side per data fetching. |
| **Tabelle** | TanStack Table | 8.x | Headless, composable, type-safe, sorting/filtri/paginazione server-side |
| **Form** | React Hook Form + Zod | - | Gia usato ovunque nel monorepo, end-to-end type safety con `@pawmeet/validation` |
| **Form Resolver** | @hookform/resolvers | - | Bridge React Hook Form + Zod |
| **Charting** | Recharts | 2.x | Leggero, composable, ben tipizzato, ottima integrazione React |
| **Mappe** | Mapbox GL JS | 3.x | Heat map utenti, piu flessibile di Google Maps per visualizzazioni custom |
| **Toast/Notifiche** | sonner | - | Toast notifications, leggero, compatibile shadcn/ui |
| **URL State** | nuqs | - | Sincronizzazione stato tabella (filtri, sorting, paginazione) con URL search params |
| **Date** | date-fns | 3.x | Leggero, tree-shakeable, standard nel progetto |
| **Export** | xlsx (SheetJS) + jsPDF | - | Export CSV/Excel e PDF per report |
| **Real-time** | WebSocket nativo su Fly.io | - | Alert dashboard, coda moderazione live |
| **Testing** | Vitest + Testing Library | - | Unit e integration test |
| **Linting** | ESLint + Prettier | - | Condiviso dal monorepo |
| **TypeScript** | TypeScript | 5.x | Strict mode, shared types dal package `@pawmeet/types` |
| **Deploy** | Cloudflare Pages | - | `@opennextjs/cloudflare` per Next.js su Cloudflare |

### 1.3 Pattern CRUD Riutilizzabili

Poiche non si usa un framework admin con CRUD automatizzato, il backoffice adotta pattern riutilizzabili definiti dal panel (doc 11).

#### Componente `<DataTable>` generico

Un singolo componente riutilizzabile basato su TanStack Table + shadcn/ui Table:

```tsx
// src/components/data-table/data-table.tsx

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageCount: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  filtering: ColumnFiltersState
  onFilteringChange: OnChangeFn<ColumnFiltersState>
  isLoading?: boolean
}
```

Questo componente gestisce: header con sorting cliccabile, righe con selezione, paginazione, filtri per colonna, stato di loading, selezione bulk. Si scrive una volta, si usa ovunque.

#### Repository pattern per data fetching

I view-model non chiamano tRPC o REST direttamente. Ogni dominio ha un'interfaccia repository:

```typescript
// src/repositories/interfaces/user-repository.ts
import type { User, UserDetail } from '@pawmeet/types';
import type { Serialized, PaginatedResult } from '@pawmeet/types';

export interface UserRepository {
  list(params: { page: number; pageSize: number; search?: string }): Promise<PaginatedResult<Serialized<User>>>;
  getById(id: string): Promise<Serialized<UserDetail>>;
  suspend(id: string): Promise<void>;
  ban(id: string): Promise<void>;
  reactivate(id: string): Promise<void>;
}
```

Le implementazioni (REST o tRPC) vivono in `repositories/rest/` e `repositories/trpc/`. Un `RepositoryProvider` (React Context) inietta le implementazioni nei view-model:

```typescript
// src/repositories/repository-provider.tsx
const repos = {
  users: createRestUserRepository({ apiClient: api }),      // ← oggi REST
  dogs: createTrpcDogRepository({ trpc }),                   // ← gia tRPC
  settings: createTrpcSettingsRepository({ trpc }),
};
```

Per migrare un endpoint da REST a tRPC, si cambia **una riga** nel provider. I view-model non si toccano.

#### Hook `useServerTable` (deprecato)

> **Nota**: `useServerTable` e in fase di deprecazione. La logica di paginazione server-side si sposta nelle interfacce repository (che accettano `page`, `pageSize`, `search`, `sort`). I view-model usano `useQuery` con il repository invece del generico `useServerTable`.

```tsx
// PRIMA (deprecato)
const result = useServerTable<User>({ endpoint: '/admin/users', queryKey: 'admin-users' });

// DOPO (repository)
const { users } = useRepositories();
const { data } = useQuery({
  queryKey: ['users', params],
  queryFn: () => users.list(params),
});
```

Lo stato della tabella (sorting, filtri, paginazione) resta sincronizzato con i query params dell'URL tramite `nuqs` per permettere il bookmark e la condivisione dei link filtrati.

#### Pattern `<CrudPage>` per pagine standard

```tsx
// Esempio: src/app/(dashboard)/users/page.tsx

export default function UsersPage() {
  const table = useServerTable({
    queryKey: ['admin', 'users'],
    queryFn: (params) => adminApi.users.list(params),
    defaultSort: [{ id: 'createdAt', desc: true }],
  })

  return (
    <PageLayout
      title="Utenti"
      description="Gestione utenti registrati"
      actions={<ExportButton table={table} />}
    >
      <DataTable
        columns={userColumns}
        {...table}
      />
    </PageLayout>
  )
}
```

### 1.4 Perche Recharts (invariato)

Recharts resta la scelta per i grafici. Essendo il backoffice ora basato su Tailwind CSS, Tremor diventa un'alternativa valida (e costruita su Tailwind). Tuttavia Recharts offre maggiore controllo sui grafici custom necessari per le dashboard analytics e la moderazione. Si potra valutare Tremor in futuro per grafici piu semplici.

---

## 2. Struttura nel Monorepo

### 2.1 Posizione nel Monorepo Turborepo

```
dogwalk-app/
├── apps/
│   ├── mobile/                → App React Native (Expo)
│   ├── web/                   → Landing page / webapp (Next.js)
│   ├── admin/                 → Backoffice (questo documento, Next.js)
│   └── api/                   → Backend Hono su Fly.io
├── packages/
│   ├── types/                 → @pawmeet/types - tipi condivisi
│   ├── validation/            → @pawmeet/validation - Zod schemas condivisi
│   ├── utils/                 → @pawmeet/utils - utility condivise
│   ├── api-client/            → @pawmeet/api-client - client tRPC condiviso
│   ├── db/                    → @pawmeet/db - Drizzle schema + migrations
│   ├── config/                → @pawmeet/config - costanti, enum, config
│   └── ui/                    → @pawmeet/ui - componenti condivisi (se necessario)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 2.2 Directory Tree Completo: `apps/admin/`

```
apps/admin/
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx                     → Root layout: provider (QueryClient, ThemeProvider)
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx               → Pagina login admin
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                 → Dashboard layout: sidebar + header + content
│   │   │   ├── page.tsx                   → Dashboard KPI (homepage)
│   │   │   ├── users/
│   │   │   │   ├── page.tsx               → Lista utenti con filtri e ricerca
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx           → Dettaglio completo utente
│   │   │   ├── moderation/
│   │   │   │   ├── photos/
│   │   │   │   │   └── page.tsx           → Coda moderazione foto
│   │   │   │   ├── reports/
│   │   │   │   │   └── page.tsx           → Coda segnalazioni utenti
│   │   │   │   ├── chat-reports/
│   │   │   │   │   └── page.tsx           → Coda segnalazioni chat
│   │   │   │   └── log/
│   │   │   │       └── page.tsx           → Storico azioni moderazione
│   │   │   ├── dogs/
│   │   │   │   ├── page.tsx               → Lista profili cane
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx           → Dettaglio profilo cane
│   │   │   ├── analytics/
│   │   │   │   ├── page.tsx               → Overview analytics
│   │   │   │   ├── funnel/page.tsx        → Funnel onboarding
│   │   │   │   ├── cohorts/page.tsx       → Retention per coorte
│   │   │   │   ├── matching/page.tsx      → Score distribution, success rate
│   │   │   │   ├── revenue/page.tsx       → MRR, churn, ARPU
│   │   │   │   └── ab-tests/page.tsx      → A/B test results
│   │   │   ├── content/
│   │   │   │   ├── push/page.tsx          → Gestione notifiche push
│   │   │   │   ├── events/page.tsx        → Lista eventi community
│   │   │   │   ├── events/[id]/page.tsx   → Dettaglio/moderazione evento
│   │   │   │   └── badges/page.tsx        → Gestione badge e gamification
│   │   │   ├── system/
│   │   │   │   ├── feature-flags/page.tsx → Feature flags CRUD
│   │   │   │   ├── matching-config/page.tsx → Parametri algoritmo matching
│   │   │   │   ├── rate-limiting/page.tsx → Configurazione rate limits
│   │   │   │   └── breeds/page.tsx        → CRUD razze canine
│   │   │   └── settings/
│   │   │       ├── page.tsx               → Impostazioni generali
│   │   │       ├── admins/page.tsx        → Lista utenti admin
│   │   │       ├── roles/page.tsx         → Gestione ruoli
│   │   │       └── audit-log/page.tsx     → Audit log completo
│   │   └── middleware.ts                  → Middleware Next.js per auth + RBAC route protection
│   │
│   ├── components/
│   │   ├── ui/                            → shadcn/ui (componenti importati via CLI)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── command.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── avatar.tsx
│   │   │   └── sonner.tsx                 → Toast provider (sonner)
│   │   ├── data-table/
│   │   │   ├── data-table.tsx             → Componente DataTable generico (TanStack Table + shadcn)
│   │   │   ├── data-table-column-header.tsx → Header colonna con sorting
│   │   │   ├── data-table-pagination.tsx  → Paginazione
│   │   │   ├── data-table-toolbar.tsx     → Toolbar con filtri e ricerca
│   │   │   ├── data-table-faceted-filter.tsx → Filtri faceted
│   │   │   └── data-table-row-actions.tsx → Azioni per riga (dropdown)
│   │   ├── layout/
│   │   │   ├── app-sidebar.tsx            → Sidebar navigazione con badge contatori (shadcn sidebar)
│   │   │   ├── header.tsx                 → Header con user info, notifiche, search (command palette)
│   │   │   ├── breadcrumbs.tsx            → Breadcrumb automatici da route
│   │   │   └── page-layout.tsx            → Layout pagina con titolo, descrizione, azioni
│   │   ├── charts/
│   │   │   ├── kpi-cards.tsx              → MAU, DAU, registrazioni, revenue
│   │   │   ├── trend-charts.tsx           → Grafici utenti, match, retention
│   │   │   ├── alerts-panel.tsx           → Alert automatici
│   │   │   ├── heat-map.tsx               → Mappa heat utenti per citta
│   │   │   ├── revenue-chart.tsx          → Revenue, MRR, churn
│   │   │   ├── funnel-chart.tsx           → Funnel onboarding
│   │   │   ├── cohort-grid.tsx            → Griglia retention per coorte
│   │   │   └── retention-curve.tsx        → Curva retention
│   │   ├── moderation/
│   │   │   ├── photo-review-card.tsx      → Card foto con AI score, azioni approve/reject
│   │   │   ├── photo-grid.tsx             → Griglia foto per bulk review
│   │   │   ├── report-detail.tsx          → Dettaglio segnalazione con storico utente
│   │   │   ├── chat-message-preview.tsx   → Preview messaggio segnalato con contesto
│   │   │   ├── user-action-dialog.tsx     → Dialog warn/suspend/ban (shadcn Dialog)
│   │   │   ├── bulk-action-bar.tsx        → Barra azioni bulk (approva/rifiuta selezionati)
│   │   │   └── moderation-stats.tsx       → Statistiche coda (pending, SLA)
│   │   ├── users/
│   │   │   ├── user-filters.tsx           → Filtri citta, stato, premium, data
│   │   │   ├── user-profile-card.tsx      → Card riepilogo profilo
│   │   │   ├── user-dogs-tab.tsx          → Tab cani dell'utente
│   │   │   ├── user-matches-tab.tsx       → Tab match dell'utente
│   │   │   ├── user-chats-tab.tsx         → Tab chat dell'utente
│   │   │   ├── user-reports-tab.tsx       → Tab segnalazioni
│   │   │   ├── user-payments-tab.tsx      → Tab pagamenti e subscription
│   │   │   ├── user-actions-dropdown.tsx  → Azioni: disattiva, reset pwd, export, delete
│   │   │   └── gdpr-export-dialog.tsx     → Dialog export dati GDPR (shadcn Dialog)
│   │   ├── dogs/
│   │   │   ├── dog-filters.tsx            → Filtri razza, taglia, stato
│   │   │   ├── dog-photo-gallery.tsx      → Galleria foto con stato moderazione
│   │   │   └── dog-suspicious-flag.tsx    → Flag profili sospetti
│   │   ├── common/
│   │   │   ├── status-badge.tsx           → Badge stato (active, suspended, banned)
│   │   │   ├── user-avatar.tsx            → Avatar con stato online/offline
│   │   │   ├── confirm-dialog.tsx         → Dialog conferma azioni distruttive (shadcn AlertDialog)
│   │   │   ├── date-range-picker.tsx      → Selettore range date per filtri
│   │   │   ├── export-button.tsx          → Pulsante export CSV/PDF
│   │   │   ├── empty-state.tsx            → Stato vuoto generico
│   │   │   └── error-boundary.tsx         → Error boundary
│   │   └── media/
│   │       ├── image-viewer.tsx           → Viewer foto fullscreen con zoom
│   │       ├── image-grid.tsx             → Griglia immagini con selezione multipla
│   │       └── ai-score-badge.tsx         → Badge score AI moderazione
│   │
│   ├── hooks/
│   │   ├── use-server-table.ts            → Hook TanStack Table + Query + nuqs (URL state)
│   │   ├── use-permission.ts              → Hook RBAC per condizionare UI
│   │   ├── use-export.ts                  → Hook export dati CSV/PDF
│   │   ├── use-websocket.ts               → Hook WebSocket per real-time
│   │   ├── use-debounce.ts                → Debounce per ricerca
│   │   ├── use-photo-queue.ts             → Fetch + mutazioni coda foto
│   │   ├── use-report-queue.ts            → Fetch + mutazioni segnalazioni
│   │   ├── use-moderation-action.ts       → Azioni warn/suspend/ban
│   │   ├── use-keyboard-shortcuts.ts      → Shortcuts per moderazione veloce
│   │   ├── use-dashboard-kpis.ts          → Fetch KPI aggregati
│   │   ├── use-dashboard-alerts.ts        → Fetch alert dashboard
│   │   ├── use-user-detail.ts             → Fetch dettaglio utente
│   │   ├── use-user-actions.ts            → Mutazioni azioni utente
│   │   ├── use-dog-detail.ts              → Fetch dettaglio cane
│   │   ├── use-funnel-data.ts             → Fetch dati funnel
│   │   └── use-cohort-data.ts             → Fetch dati coorte
│   │
│   ├── lib/
│   │   ├── api.ts                         → Client tRPC configurato (`@pawmeet/api-client`)
│   │   ├── auth.ts                        → Utility autenticazione (JWT, session, cookies)
│   │   ├── permissions.ts                 → Definizione permessi per ruolo, utility RBAC
│   │   ├── utils.ts                       → Utility generiche (cn, formatters)
│   │   └── keyboard-shortcuts.ts          → Registry shortcuts globali
│   │
│   └── types/
│       └── admin.ts                       → Tipi admin-specific (estendono @pawmeet/types)
│
├── next.config.ts                          → Configurazione Next.js
├── tailwind.config.ts                      → Configurazione Tailwind CSS
├── components.json                         → Configurazione shadcn/ui
├── tsconfig.json
├── postcss.config.js
└── package.json
```

### 2.3 Dipendenze dal Monorepo

Il backoffice importa dai packages condivisi:

```typescript
// Tipi condivisi con mobile, web e API
import type { User, DogProfile, Match, ModerationStatus } from '@pawmeet/types';

// Validatori Zod condivisi (es. per form editing profilo cane)
// Usati direttamente con React Hook Form via @hookform/resolvers/zod
import { dogProfileSchema, userSchema } from '@pawmeet/validation';

// Costanti condivise (enum razze, taglie, livelli energia)
import { DOG_SIZES, ENERGY_LEVELS, BEHAVIOR_LEVELS } from '@pawmeet/config';

// Client API condiviso (stesso usato dal mobile)
import { adminApi } from '@pawmeet/api-client';
```

Questo garantisce che i tipi usati nel backoffice siano sempre allineati con quelli dell'API e dell'app mobile. I form usano gli stessi schema Zod del mobile e del backend (end-to-end type safety).

### 2.4 Dipendenze package.json

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-table": "^8.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.0.0",
    "@hookform/resolvers": "^3.0.0",
    "zod": "^3.0.0",
    "recharts": "^2.0.0",
    "sonner": "^1.0.0",
    "nuqs": "^2.0.0",
    "date-fns": "^3.0.0",
    "mapbox-gl": "^3.0.0",
    "xlsx": "^0.18.0",
    "jspdf": "^2.0.0",
    "jspdf-autotable": "^3.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.400.0",
    "@pawmeet/types": "workspace:*",
    "@pawmeet/validation": "workspace:*",
    "@pawmeet/config": "workspace:*",
    "@pawmeet/api-client": "workspace:*",
    "@pawmeet/utils": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "@opennextjs/cloudflare": "^0.5.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## 3. API Admin

### 3.1 Principi di Design

Le API admin sono **endpoint separati** dal backend utente, protetti da autenticazione admin dedicata. Risiedono nello stesso server Fly.io (`apps/api`) ma sotto un prefisso distinto.

```
API utente:  /api/v1/users, /api/v1/matches, /api/v1/chat
API admin:   /api/admin/v1/users, /api/admin/v1/moderation, /api/admin/v1/dashboard
```

**Perche stesso server e non separato:**

- Condivisione dello stesso database e ORM (Drizzle)
- Condivisione middleware (logging, error handling)
- Singolo deployment, meno complessita operativa
- Separazione logica tramite middleware di autenticazione dedicato

### 3.2 Autenticazione Admin

L'autenticazione admin e **completamente separata** dagli utenti dell'app.

```
Tabella: admin_users
├── id              UUID PK
├── email           VARCHAR(255) UNIQUE
├── password_hash   VARCHAR(255)        -- bcrypt cost 12
├── display_name    VARCHAR(100)
├── role            ENUM('super_admin', 'moderator', 'support', 'analyst')
├── is_active       BOOLEAN DEFAULT true
├── mfa_secret      VARCHAR(255)        -- TOTP secret per 2FA
├── mfa_enabled     BOOLEAN DEFAULT false
├── last_login_at   TIMESTAMP
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP
└── created_by      UUID FK -> admin_users.id
```

**Flusso di autenticazione:**

1. Login con email + password
2. Se MFA abilitato: richiesta codice TOTP (Google Authenticator / Authy)
3. Emissione JWT admin con claims: `{ sub, role, permissions[], iat, exp }`
4. Access token: scadenza 30 minuti (piu corta degli utenti app per sicurezza)
5. Refresh token: scadenza 8 ore (sessione lavorativa)
6. Refresh token salvato in `HttpOnly, Secure, SameSite=Strict` cookie
7. Access token in memoria (non localStorage)

**Differenze rispetto all'auth utente:**

| Aspetto | Auth Utente App | Auth Admin |
|---------|----------------|------------|
| Provider | Email, Google, Apple | Solo email + password |
| MFA | No (MVP) | Obbligatorio per Super Admin |
| Token durata | 1h access, 30d refresh | 30min access, 8h refresh |
| Tabella | `users` | `admin_users` |
| Self-registration | Si | No (solo invito da Super Admin) |

### 3.3 Endpoint API Admin

#### Dashboard

| Metodo | Endpoint | Descrizione | Ruoli |
|--------|----------|-------------|-------|
| GET | `/admin/v1/dashboard/kpis` | KPI aggregati (MAU, DAU, revenue...) | Tutti |
| GET | `/admin/v1/dashboard/trends` | Serie temporali per grafici | Tutti |
| GET | `/admin/v1/dashboard/alerts` | Alert attivi | Tutti |
| GET | `/admin/v1/dashboard/heatmap` | Dati mappa heat utenti | Tutti |

#### Moderazione

| Metodo | Endpoint | Descrizione | Ruoli |
|--------|----------|-------------|-------|
| GET | `/admin/v1/moderation/photos` | Coda foto pending | moderator, super_admin |
| PATCH | `/admin/v1/moderation/photos/:id` | Approva/rifiuta foto | moderator, super_admin |
| POST | `/admin/v1/moderation/photos/bulk` | Azione bulk su foto | moderator, super_admin |
| GET | `/admin/v1/moderation/reports` | Coda segnalazioni utenti | moderator, support, super_admin |
| GET | `/admin/v1/moderation/reports/:id` | Dettaglio segnalazione | moderator, support, super_admin |
| PATCH | `/admin/v1/moderation/reports/:id` | Risolvi segnalazione | moderator, super_admin |
| GET | `/admin/v1/moderation/chat-reports` | Coda segnalazioni chat | moderator, super_admin |
| GET | `/admin/v1/moderation/chat-reports/:id` | Dettaglio con messaggi | moderator, super_admin |
| POST | `/admin/v1/moderation/users/:id/warn` | Invia warning | moderator, super_admin |
| POST | `/admin/v1/moderation/users/:id/suspend` | Sospendi (7gg) | moderator, super_admin |
| POST | `/admin/v1/moderation/users/:id/ban` | Ban permanente | super_admin |
| GET | `/admin/v1/moderation/users/:id/history` | Storico azioni moderazione | moderator, support, super_admin |
| GET | `/admin/v1/moderation/stats` | Statistiche moderazione (SLA) | Tutti |

#### Utenti

| Metodo | Endpoint | Descrizione | Ruoli |
|--------|----------|-------------|-------|
| GET | `/admin/v1/users` | Lista utenti (paginata, filtri) | support, moderator, super_admin |
| GET | `/admin/v1/users/:id` | Dettaglio utente completo | support, moderator, super_admin |
| PATCH | `/admin/v1/users/:id/status` | Attiva/disattiva utente | support, super_admin |
| POST | `/admin/v1/users/:id/reset-password` | Trigger reset password | support, super_admin |
| POST | `/admin/v1/users/:id/impersonate` | Genera token impersonate | super_admin |
| GET | `/admin/v1/users/:id/export` | Export dati GDPR (JSON) | support, super_admin |
| DELETE | `/admin/v1/users/:id` | Cancellazione GDPR | super_admin |

#### Cani

| Metodo | Endpoint | Descrizione | Ruoli |
|--------|----------|-------------|-------|
| GET | `/admin/v1/dogs` | Lista profili cane | support, moderator, super_admin |
| GET | `/admin/v1/dogs/:id` | Dettaglio profilo cane | support, moderator, super_admin |
| PATCH | `/admin/v1/dogs/:id/flag` | Flag profilo sospetto | moderator, super_admin |

#### Analytics (Fase 2)

| Metodo | Endpoint | Descrizione | Ruoli |
|--------|----------|-------------|-------|
| GET | `/admin/v1/analytics/funnel` | Dati funnel onboarding | analyst, super_admin |
| GET | `/admin/v1/analytics/cohorts` | Cohort analysis | analyst, super_admin |
| GET | `/admin/v1/analytics/matching` | Matching analytics | analyst, super_admin |
| GET | `/admin/v1/analytics/revenue` | Revenue analytics | analyst, super_admin |
| GET | `/admin/v1/analytics/ab-tests` | Risultati A/B test | analyst, super_admin |

#### Contenuti (Fase 2)

| Metodo | Endpoint | Descrizione | Ruoli |
|--------|----------|-------------|-------|
| POST | `/admin/v1/notifications/push` | Invia push notification | support, super_admin |
| GET | `/admin/v1/events` | Lista eventi | support, super_admin |
| PATCH | `/admin/v1/events/:id` | Modera/modifica evento | moderator, super_admin |
| GET | `/admin/v1/badges` | Lista badge | super_admin |
| POST | `/admin/v1/badges` | Crea badge | super_admin |

#### Sistema (Fase 2)

| Metodo | Endpoint | Descrizione | Ruoli |
|--------|----------|-------------|-------|
| GET | `/admin/v1/feature-flags` | Lista feature flags | super_admin |
| PATCH | `/admin/v1/feature-flags/:key` | Toggle feature flag | super_admin |
| GET | `/admin/v1/matching-config` | Configurazione matching | super_admin |
| PATCH | `/admin/v1/matching-config` | Aggiorna pesi/soglie | super_admin |
| GET | `/admin/v1/breeds` | Lista razze | support, super_admin |
| POST | `/admin/v1/breeds` | Aggiungi razza | super_admin |
| PATCH | `/admin/v1/breeds/:id` | Modifica razza | super_admin |
| DELETE | `/admin/v1/breeds/:id` | Elimina razza | super_admin |

#### Gestione Admin

| Metodo | Endpoint | Descrizione | Ruoli |
|--------|----------|-------------|-------|
| GET | `/admin/v1/admins` | Lista admin | super_admin |
| POST | `/admin/v1/admins` | Crea admin (invito) | super_admin |
| PATCH | `/admin/v1/admins/:id` | Modifica ruolo admin | super_admin |
| DELETE | `/admin/v1/admins/:id` | Disattiva admin | super_admin |
| GET | `/admin/v1/audit-log` | Audit log | super_admin |

### 3.4 Paginazione, Filtri, Sorting

Tutte le API lista seguono una convenzione uniforme:

```
GET /admin/v1/users?page=1&pageSize=25&sort=created_at&order=desc&filter[city]=Milano&filter[status]=active&filter[is_premium]=true&search=mario.rossi
```

**Risposta standard:**

```json
{
  "data": [...],
  "meta": {
    "total": 15234,
    "page": 1,
    "pageSize": 25,
    "totalPages": 610
  }
}
```

L'hook `useServerTable` mappa automaticamente lo stato di TanStack Table a questo formato di query params:

```typescript
// hooks/use-server-table.ts (implementazione concettuale)
function useServerTable<TData>({ queryKey, queryFn, defaultSort, defaultPageSize = 25 }) {
  // Stato sincronizzato con URL tramite nuqs
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [pageSize, setPageSize] = useQueryState('pageSize', parseAsInteger.withDefault(defaultPageSize))
  const [sort, setSort] = useQueryState('sort')
  const [order, setOrder] = useQueryState('order')

  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>(defaultSort ?? [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // TanStack Query per il fetch
  const query = useQuery({
    queryKey: [...queryKey, { page, pageSize, sort, order, filters: columnFilters }],
    queryFn: () => queryFn({ page, pageSize, sort, order, filters: columnFilters }),
  })

  return {
    data: query.data?.data ?? [],
    pageCount: query.data?.meta.totalPages ?? 0,
    pagination: { pageIndex: page - 1, pageSize },
    onPaginationChange: ...,
    sorting,
    onSortingChange: setSorting,
    filtering: columnFilters,
    onFilteringChange: setColumnFilters,
    isLoading: query.isLoading,
  }
}
```

### 3.5 Rate Limiting API Admin

| Endpoint Group | Rate Limit | Window |
|---------------|-----------|--------|
| Auth (login) | 5 richieste | 15 minuti |
| Lettura (GET) | 120 richieste | 1 minuto |
| Scrittura (POST/PATCH/DELETE) | 30 richieste | 1 minuto |
| Bulk actions | 10 richieste | 1 minuto |
| Export GDPR | 5 richieste | 1 ora |
| Impersonate | 3 richieste | 1 ora |

Il rate limiting e implementato tramite Upstash Redis, con chiave `rate:{admin_id}:{endpoint_group}:{window}`.

### 3.6 Audit Logging Middleware

Ogni richiesta admin che modifica dati viene loggata automaticamente tramite un middleware Hono:

```typescript
// Middleware audit log (concettuale)
app.use('/admin/v1/*', async (c, next) => {
  await next();

  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(c.req.method)) {
    await auditLog.create({
      admin_id: c.get('adminUser').id,
      action: `${c.req.method} ${c.req.path}`,
      resource_type: extractResourceType(c.req.path),
      resource_id: extractResourceId(c.req.path),
      changes: c.get('auditChanges') ?? null,   // set dal handler
      ip_address: c.req.header('CF-Connecting-IP'),
      user_agent: c.req.header('User-Agent'),
      timestamp: new Date().toISOString(),
    });
  }
});
```

---

## 4. Integrazione Infrastruttura (Fly.io + Cloudflare)

### 4.1 Architettura di Deployment

```
  Admin browser
       │
       ├──── pages ─────┐
       │                 ▼
       │        ┌──────────────────┐
       │        │ Cloudflare Pages  │  Next.js (@opennextjs/cloudflare)
       │        │ admin.dogwalk.app │  SSR + Static assets
       │        └──────────────────┘
       │
       └──── API ─────────┐
                           ▼
                  ┌──────────────────┐
                  │   Fly.io (Node)  │  Hono API
                  │  api.dogwalk.app │  Admin + User APIs
                  └──┬───┬───┬──────┘
                     │   │   │
        ┌────────────┘   │   └────────────┐
        ▼                ▼                ▼
   ┌──────────┐   ┌───────────┐   ┌──────────────┐
   │ Upstash  │   │Cloudflare │   │  PostgreSQL   │
   │  Redis   │   │    R2     │   │   (Neon)      │
   │ (cache)  │   │  (media)  │   │  + PostGIS    │
   └──────────┘   └───────────┘   └──────────────┘
```

### 4.2 Cloudflare Pages - Admin Next.js

**Dominio:** `admin.dogwalk.app`

**Deploy:** Il backoffice e un'app Next.js deployata su Cloudflare Pages tramite `@opennextjs/cloudflare`. Questo permette SSR/ISR per le dashboard (dati pre-calcolati server-side) e routing file-based nativo.

**Configurazione:**

```toml
# wrangler.toml (sezione Pages)
name = "dogwalk-admin"
compatibility_date = "2026-03-01"

# Headers di sicurezza
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://api.dogwalk.app wss://api.dogwalk.app; img-src 'self' https://*.r2.dev https://api.mapbox.com; style-src 'self' 'unsafe-inline'; script-src 'self'"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

**Accesso ristretto:** Cloudflare Access (Zero Trust) protegge `admin.dogwalk.app` con un policy che richiede autenticazione aziendale (email domain `@dogwalk.app`) prima ancora di servire l'applicazione. Questo aggiunge un layer di sicurezza prima dell'autenticazione applicativa.

### 4.3 Fly.io - API Admin

Stesso server Fly.io dell'API utente, con routing separato:

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { userRoutes } from './routes/user';
import { adminRoutes } from './routes/admin';

const app = new Hono();

// API utente
app.route('/api/v1', userRoutes);

// API admin - middleware auth admin separato
app.route('/api/admin/v1', adminRoutes);

export default app;
```

### 4.4 Cloudflare R2 - Accesso Media in Moderazione

Le foto caricate dagli utenti sono salvate su R2. Per la moderazione, il backoffice accede alle foto tramite URL firmati (signed URLs) con scadenza breve.

```
Flusso:
1. Admin apre coda moderazione foto
2. API admin genera signed URL R2 per ogni foto (scadenza 1 ora)
3. Il browser admin carica le immagini direttamente da R2
4. Nessun proxy tramite server → performance ottimale
```

**Struttura bucket R2:**

```
dogwalk-media/
├── dogs/
│   ├── {dog_id}/
│   │   ├── original/     → Foto originali (per moderazione)
│   │   ├── thumbnails/   → Thumbnail (per liste admin)
│   │   └── optimized/    → Versione ottimizzata (per l'app)
├── chat/
│   └── {match_id}/       → Media chat (per moderazione chat)
└── avatars/
    └── {user_id}/         → Avatar utenti
```

### 4.5 Upstash Redis - Caching Dashboard

I dati della dashboard sono costosi da calcolare (aggregazioni su tabelle grandi). Upstash Redis serve come cache layer:

| Chiave Redis | Contenuto | TTL | Strategia di Invalidazione |
|-----------|-----------|-----|---------------------------|
| `dashboard:kpis:daily` | KPI giornalieri aggregati | 5 minuti | Ricalcolo automatico |
| `dashboard:kpis:hourly` | KPI orari (DAU real-time) | 1 minuto | Ricalcolo automatico |
| `dashboard:trends:{period}` | Serie temporali per grafici | 15 minuti | Ricalcolo automatico |
| `dashboard:heatmap` | Dati mappa heat | 1 ora | Ricalcolo su cron |
| `dashboard:alerts` | Alert attivi | 30 secondi | Invalidazione su evento |
| `moderation:stats` | Contatori coda moderazione | 30 secondi | Invalidazione su azione |
| `moderation:photo_count` | Contatore foto pending | 10 secondi | Invalidazione su azione |

### 4.6 WebSocket Nativo su Fly.io - Real-time

Per aggiornamenti real-time nella dashboard e nelle code di moderazione, si utilizza un WebSocket server nativo su Fly.io:

**Casi d'uso real-time:**

- Nuova foto in coda moderazione → aggiornamento badge sidebar
- Un altro moderatore approva/rifiuta una foto → rimozione dalla coda di tutti i moderatori
- Alert critico (spike segnalazioni) → notifica immediata sulla dashboard
- Aggiornamento KPI dashboard → refresh automatico card

---

## 5. Moderazione Workflow

### 5.1 Workflow Moderazione Foto

```
                    Upload foto utente
                           │
                           ▼
                 ┌─────────────────┐
                 │  Content Modera-│
                 │  tion API (AI)  │
                 │ (AWS Rekognition│
                 │  o similare)    │
                 │                 │
                 └────────┬────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        AI Score < 0.3  0.3-0.7   AI Score > 0.7
        (sicura)       (dubbia)    (problematica)
              │           │           │
              ▼           ▼           ▼
        AUTO-APPROVE   MANUAL      AUTO-REJECT
        moderation_    REVIEW      moderation_
        status =       Entra in    status =
        'approved'     coda admin  'rejected'
              │           │           │
              │           ▼           │
              │  ┌─────────────────┐  │
              │  │  CODA BACKOFFICE │  │
              │  │  (priorita per  │  │
              │  │   AI score)     │  │
              │  └───────┬─────────┘  │
              │          │            │
              │    ┌─────┴─────┐      │
              │    │           │      │
              │    ▼           ▼      │
              │  APPROVE    REJECT    │
              │    │           │      │
              ▼    ▼           ▼      ▼
        ┌──────────────────────────────────┐
        │  Se tutte le foto dell'utente    │
        │  sono rejected:                  │
        │  → Profilo cane diventa          │
        │    invisibile nel feed           │
        │  → Notifica push all'utente      │
        │    con motivo del rifiuto        │
        └──────────────────────────────────┘
```

### 5.2 Workflow Segnalazioni Utente

```
        Utente segnala profilo/comportamento
                       │
                       ▼
              ┌──────────────────┐
              │  Segnalazione    │
              │  status: 'new'   │
              │  + auto-check:   │
              │  - storico       │
              │    segnalato     │
              │  - n. segnala-   │
              │    zioni totali  │
              └───────┬──────────┘
                      │
           ┌──────────┼──────────┐
           │          │          │
           ▼          ▼          ▼
      1a segnalaz.  2-3 segn.  >3 segnalazioni
      Priorita:     Priorita:  Priorita:
      NORMALE       ALTA       URGENTE
           │          │          │
           ▼          ▼          ▼
        ┌─────────────────────────┐
        │     CODA BACKOFFICE     │
        │  (ordinata per priorita │
        │   + data creazione)     │
        └──────────┬──────────────┘
                   │
        ┌──────────┼──────────┬──────────┐
        │          │          │          │
        ▼          ▼          ▼          ▼
    DISMISS     WARNING    SUSPEND     BAN
    (infond.)   (1o avv.)  (7gg, 2o)  (perman.)
        │          │          │          │
        ▼          ▼          ▼          ▼
    Segnalaz.  Notifica   Notifica   Notifica
    chiusa     in-app     in-app +   in-app +
               all'utente email      email
               segnalato  "account   "account
                          sospeso    bannato"
                          7 giorni"
```

### 5.3 Politica di Escalation Automatica

| Condizione | Azione Automatica |
|-----------|-------------------|
| Utente riceve 3+ segnalazioni in 24h | Priorita segnalazione → URGENTE, alert a moderatori |
| Utente riceve 5+ segnalazioni in 7gg | Auto-sospensione preventiva (7gg), notifica super_admin |
| Foto con AI score > 0.9 (esplicita) | Auto-reject + warning automatico all'utente |
| Messaggio chat con keywords violente | Auto-flag + inserimento in coda chat reports |
| Utente segnalato da 3+ utenti diversi per "profilo falso" | Flag automatico, profilo nascosto fino a review |

### 5.4 Queue Management

**Ordinamento coda foto:**

1. Priorita (URGENTE > ALTA > NORMALE)
2. AI score (piu alto = piu sospetto → prima in coda)
3. Tempo in coda (FIFO a parita di priorita e score)

**Ordinamento coda segnalazioni:**

1. Priorita (calcolata da numero segnalazioni)
2. Tipo (sicurezza personale > contenuto > altro)
3. Tempo in coda (FIFO)

**Lock ottimistico:** Quando un moderatore apre un item dalla coda, questo viene "lockato" per 10 minuti per evitare che due moderatori lavorino sullo stesso item. Se il lock scade senza azione, l'item torna disponibile.

### 5.5 SLA di Moderazione

| Tipo | SLA Target | Priorita URGENTE | Alert se |
|------|-----------|-------------------|----------|
| Foto pending | < 4 ore | < 1 ora | > 2 ore (alert giallo), > 4 ore (alert rosso) |
| Segnalazione utente | < 24 ore | < 4 ore | > 12 ore (alert giallo), > 24 ore (alert rosso) |
| Segnalazione chat | < 12 ore | < 2 ore | > 6 ore (alert giallo), > 12 ore (alert rosso) |
| Contenuto illegale | < 1 ora | Immediata | > 30 min (alert rosso a super_admin) |

Gli SLA sono monitorati dal pannello `moderation-stats` nella sidebar e nella dashboard. Alert via email/Slack quando gli SLA vengono superati.

### 5.6 Bulk Actions

Nella coda foto, il moderatore puo selezionare multiple foto e applicare azioni bulk:

- **Approva selezionate**: Approva tutte le foto selezionate in un'unica operazione
- **Rifiuta selezionate**: Rifiuta con motivo comune (dropdown con opzioni predefinite)
- **Seleziona tutti visibili**: Seleziona tutte le foto attualmente in pagina
- **Filtro per AI score range**: Es. "mostra solo foto con score 0.3-0.5" per batch review

### 5.7 Keyboard Shortcuts

Per la moderazione veloce foto (singola review):

| Shortcut | Azione |
|----------|--------|
| `A` | Approva foto corrente |
| `R` | Rifiuta foto corrente (apre dropdown motivo) |
| `S` | Skip (passa alla prossima senza azione) |
| `1-5` | Seleziona motivo rifiuto (dopo aver premuto R) |
| `→` / `←` | Naviga tra foto dello stesso utente |
| `Space` | Toggle zoom foto |
| `Esc` | Chiudi preview / annulla azione |
| `Ctrl+Z` | Annulla ultima azione (entro 10 secondi) |

Gli shortcuts sono visualizzati in un tooltip persistente e possono essere disattivati dalle preferenze utente admin.

---

## 6. Dashboard e Reporting

### 6.1 Strategia Metriche: Real-time vs Batch

| Metrica | Strategia | Refresh | Fonte |
|---------|----------|---------|-------|
| DAU (oggi) | Real-time | 1 min | Redis counter, incrementato da middleware API |
| Registrazioni (oggi) | Real-time | 1 min | Redis counter |
| Foto in coda | Real-time | 10 sec | Redis counter, WebSocket push |
| Segnalazioni aperte | Real-time | 30 sec | Redis counter, WebSocket push |
| MAU | Batch | 1 ora | Cron job BullMQ, query su DB |
| Revenue / MRR | Batch | 1 ora | Cron job BullMQ, query su payment provider |
| Retention (D7/D30) | Batch | 24 ore | Cron job BullMQ notturno |
| Cohort analysis | Batch | 24 ore | Cron job BullMQ notturno |
| Funnel onboarding | Batch | 6 ore | Cron job BullMQ |
| Matching score distribution | Batch | 12 ore | Cron job BullMQ |
| Heatmap utenti | Batch | 1 ora | Cron job BullMQ, aggregazione PostGIS |

### 6.2 Data Aggregation Strategy

**Tabelle di aggregazione pre-calcolate:**

```sql
-- Metriche giornaliere aggregate
CREATE TABLE admin_daily_metrics (
    date           DATE PRIMARY KEY,
    dau            INTEGER NOT NULL DEFAULT 0,
    new_users      INTEGER NOT NULL DEFAULT 0,
    new_dogs       INTEGER NOT NULL DEFAULT 0,
    matches        INTEGER NOT NULL DEFAULT 0,
    walks_started  INTEGER NOT NULL DEFAULT 0,
    messages_sent  INTEGER NOT NULL DEFAULT 0,
    photos_uploaded INTEGER NOT NULL DEFAULT 0,
    photos_approved INTEGER NOT NULL DEFAULT 0,
    photos_rejected INTEGER NOT NULL DEFAULT 0,
    reports_created INTEGER NOT NULL DEFAULT 0,
    reports_resolved INTEGER NOT NULL DEFAULT 0,
    revenue_cents  INTEGER NOT NULL DEFAULT 0,
    premium_subs   INTEGER NOT NULL DEFAULT 0,
    pro_subs       INTEGER NOT NULL DEFAULT 0,
    churned_subs   INTEGER NOT NULL DEFAULT 0,
    computed_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Metriche orarie per grafici intraday
CREATE TABLE admin_hourly_metrics (
    date           DATE NOT NULL,
    hour           SMALLINT NOT NULL,  -- 0-23
    active_users   INTEGER NOT NULL DEFAULT 0,
    new_users      INTEGER NOT NULL DEFAULT 0,
    matches        INTEGER NOT NULL DEFAULT 0,
    messages_sent  INTEGER NOT NULL DEFAULT 0,
    computed_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (date, hour)
);

-- Retention per coorte (calcolata nightly)
CREATE TABLE admin_cohort_retention (
    cohort_week    DATE NOT NULL,       -- Lunedi della settimana di registrazione
    days_after     INTEGER NOT NULL,    -- 1, 7, 14, 30, 60, 90
    cohort_size    INTEGER NOT NULL,
    retained_users INTEGER NOT NULL,
    retention_pct  DECIMAL(5,2) NOT NULL,
    computed_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cohort_week, days_after)
);
```

**Cron Jobs (BullMQ su Upstash Redis):**

| Cron | Schedule | Funzione |
|------|----------|----------|
| `metrics-hourly` | Ogni ora | Calcola `admin_hourly_metrics` per l'ora corrente |
| `metrics-daily` | 01:00 UTC | Calcola `admin_daily_metrics` per il giorno precedente |
| `cohort-nightly` | 03:00 UTC | Ricalcola `admin_cohort_retention` |
| `alerts-check` | Ogni 5 minuti | Controlla soglie alert e invia notifiche |
| `moderation-sla` | Ogni 15 minuti | Verifica SLA code moderazione |
| `redis-cache-warm` | Ogni 5 minuti | Pre-calcola e salva KPI in Redis |

### 6.3 Export Reports

**Formati supportati:**

| Formato | Libreria | Uso |
|---------|----------|-----|
| CSV | Generato server-side, stream dal server Fly.io | Export liste (utenti, cani, segnalazioni) |
| Excel (XLSX) | SheetJS (`xlsx`) client-side | Report con formattazione (dashboard export) |
| PDF | jsPDF + autoTable client-side | Report formali (audit, GDPR) |

**Export grandi volumi:** Per export con > 10.000 righe, il server genera il file in background e lo salva su R2, inviando una notifica al client (via WebSocket o polling) quando pronto. L'admin scarica il file da R2 tramite signed URL.

### 6.4 Scheduled Reports via Email

Configurazione per report automatici (Fase 2):

| Report | Frequenza | Destinatari | Contenuto |
|--------|-----------|-------------|-----------|
| Daily Operations | Ogni giorno 08:00 | Super Admin, Moderatori | KPI giornalieri, coda moderazione, SLA status |
| Weekly Business | Ogni lunedi 09:00 | Super Admin, Analyst | Trend settimanali, revenue, retention, funnel |
| Monthly Executive | 1o del mese | Super Admin | Report completo con grafici, MoM comparison |
| SLA Breach Alert | Real-time | Moderatori, Super Admin | Alert immediato quando SLA superato |

I report email sono generati da un cron job BullMQ che compone l'email con i dati aggregati e la invia tramite un servizio transazionale (es. Resend, Postmark).

---

## 7. RBAC - Role-Based Access Control

### 7.1 Modello Permessi

Il sistema RBAC usa un modello a permessi granulari organizzati per risorsa e azione:

```typescript
// lib/permissions.ts

type Permission = `${Resource}:${Action}`;

type Resource =
  | 'dashboard'
  | 'moderation'
  | 'moderation.photos'
  | 'moderation.reports'
  | 'moderation.chat_reports'
  | 'moderation.actions'      // warn, suspend, ban
  | 'users'
  | 'users.impersonate'
  | 'users.gdpr'
  | 'dogs'
  | 'analytics'
  | 'analytics.revenue'
  | 'content'
  | 'content.push'
  | 'content.events'
  | 'content.badges'
  | 'system'
  | 'system.feature_flags'
  | 'system.matching_config'
  | 'system.breeds'
  | 'admin_management'
  | 'audit_log';

type Action = 'list' | 'show' | 'create' | 'edit' | 'delete' | 'export';
```

### 7.2 Matrice Ruoli x Permessi

| Risorsa | Azione | Super Admin | Moderatore | Support | Analyst |
|---------|--------|:-----------:|:----------:|:-------:|:-------:|
| **dashboard** | list, show | X | X | X | X |
| **moderation.photos** | list, show | X | X | - | - |
| **moderation.photos** | edit (approve/reject) | X | X | - | - |
| **moderation.reports** | list, show | X | X | X (read-only) | - |
| **moderation.reports** | edit (resolve) | X | X | - | - |
| **moderation.chat_reports** | list, show, edit | X | X | - | - |
| **moderation.actions** | warn | X | X | - | - |
| **moderation.actions** | suspend | X | X | - | - |
| **moderation.actions** | ban | X | - | - | - |
| **users** | list, show | X | X | X | - |
| **users** | edit (activate/deactivate) | X | - | X | - |
| **users** | reset password | X | - | X | - |
| **users.impersonate** | create | X | - | - | - |
| **users.gdpr** | export | X | - | X | - |
| **users.gdpr** | delete | X | - | - | - |
| **dogs** | list, show | X | X | X | - |
| **dogs** | edit (flag) | X | X | - | - |
| **analytics** | list, show | X | - | - | X |
| **analytics.revenue** | list, show | X | - | - | X |
| **content.push** | create | X | - | X | - |
| **content.events** | list, show, edit | X | X | X | - |
| **content.badges** | list, show, create, edit, delete | X | - | - | - |
| **system.feature_flags** | list, show, edit | X | - | - | - |
| **system.matching_config** | list, show, edit | X | - | - | - |
| **system.breeds** | list, show | X | - | X | - |
| **system.breeds** | create, edit, delete | X | - | - | - |
| **admin_management** | list, show, create, edit, delete | X | - | - | - |
| **audit_log** | list, show | X | - | - | - |

### 7.3 Implementazione RBAC: Middleware Next.js + Hook React

#### Definizione Permessi per Ruolo

```typescript
// lib/permissions.ts

const rolePermissions: Record<AdminRole, Permission[]> = {
  super_admin: ['*:*'],  // accesso totale
  moderator: [
    'dashboard:list', 'dashboard:show',
    'moderation.photos:list', 'moderation.photos:show', 'moderation.photos:edit',
    'moderation.reports:list', 'moderation.reports:show', 'moderation.reports:edit',
    'moderation.chat_reports:list', 'moderation.chat_reports:show', 'moderation.chat_reports:edit',
    'moderation.actions:warn', 'moderation.actions:suspend',
    'users:list', 'users:show',
    'dogs:list', 'dogs:show', 'dogs:edit',
    'content.events:list', 'content.events:show', 'content.events:edit',
  ],
  support: [
    'dashboard:list', 'dashboard:show',
    'moderation.reports:list', 'moderation.reports:show',
    'users:list', 'users:show', 'users:edit',
    'users.gdpr:export',
    'dogs:list', 'dogs:show',
    'content.push:create',
    'content.events:list', 'content.events:show',
    'system.breeds:list', 'system.breeds:show',
  ],
  analyst: [
    'dashboard:list', 'dashboard:show',
    'analytics:list', 'analytics:show',
    'analytics.revenue:list', 'analytics.revenue:show',
  ],
};

export function hasPermission(role: AdminRole, resource: Resource, action: Action): boolean {
  const permissions = rolePermissions[role];
  return (
    permissions.includes('*:*') ||
    permissions.includes(`${resource}:${action}`) ||
    permissions.includes(`${resource}:*`)
  );
}
```

#### Middleware Next.js per Protezione Route

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

// Mappa route → risorsa + azione richiesta
const routePermissions: Record<string, { resource: Resource; action: Action }> = {
  '/moderation/photos': { resource: 'moderation.photos', action: 'list' },
  '/moderation/reports': { resource: 'moderation.reports', action: 'list' },
  '/users': { resource: 'users', action: 'list' },
  '/analytics': { resource: 'analytics', action: 'list' },
  '/settings/admins': { resource: 'admin_management', action: 'list' },
  '/settings/audit-log': { resource: 'audit_log', action: 'list' },
  // ... altre route
};

export async function middleware(request: NextRequest) {
  const admin = await verifyAdminToken(request);

  // Redirect a login se non autenticato
  if (!admin) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verifica permessi per la route
  const routeConfig = routePermissions[request.nextUrl.pathname];
  if (routeConfig && !hasPermission(admin.role, routeConfig.resource, routeConfig.action)) {
    return NextResponse.redirect(new URL('/', request.url)); // redirect a dashboard
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/(dashboard)/:path*'],
};
```

#### Hook `usePermission` per Controllo UI

```typescript
// hooks/use-permission.ts
'use client';

import { useAdminSession } from '@/lib/auth';
import { hasPermission, type Resource, type Action } from '@/lib/permissions';

export function usePermission() {
  const { admin } = useAdminSession();

  return {
    can: (action: Action, resource: Resource): boolean => {
      if (!admin) return false;
      return hasPermission(admin.role, resource, action);
    },
    role: admin?.role ?? null,
  };
}
```

### 7.4 Protezione UI

I componenti del backoffice nascondono automaticamente elementi non accessibili:

```tsx
// Esempio: il pulsante "Ban" appare solo per super_admin
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';

function UserActions({ userId }: { userId: string }) {
  const { can } = usePermission();

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => handleWarn(userId)}>
        Warning
      </Button>
      <Button variant="outline" onClick={() => handleSuspend(userId)}>
        Sospendi 7gg
      </Button>
      {can('ban', 'moderation.actions') && (
        <Button variant="destructive" onClick={() => handleBan(userId)}>
          Ban Permanente
        </Button>
      )}
    </div>
  );
}
```

**Componente `<Can>` wrapper (opzionale):**

```tsx
// Componente dichiarativo per nascondere elementi UI in base ai permessi
function Can({ action, resource, children }: {
  action: Action;
  resource: Resource;
  children: React.ReactNode;
}) {
  const { can } = usePermission();
  if (!can(action, resource)) return null;
  return <>{children}</>;
}

// Uso:
<Can action="delete" resource="users.gdpr">
  <DeleteAccountButton userId={userId} />
</Can>
```

La protezione e anche server-side: il middleware API verifica i permessi del ruolo prima di eseguire qualsiasi operazione.

### 7.5 UI Gestione Ruoli (Super Admin)

La pagina `settings/roles` permette al Super Admin di:

- Visualizzare la matrice ruoli x permessi
- Creare nuovi account admin con invito via email
- Modificare il ruolo di un admin esistente
- Disattivare account admin (soft delete)
- Visualizzare l'ultima attivita di ogni admin

In Fase 2, si potra estendere con ruoli custom (oltre ai 4 predefiniti) tramite una UI di composizione permessi.

---

## 8. Audit e Compliance

### 8.1 Audit Log

**Tabella:**

```sql
CREATE TABLE admin_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES admin_users(id),
    action          VARCHAR(100) NOT NULL,       -- 'PATCH /admin/v1/users/123/status'
    resource_type   VARCHAR(50) NOT NULL,        -- 'user', 'dog', 'photo', 'report'
    resource_id     VARCHAR(100),                -- ID della risorsa
    changes         JSONB,                       -- { before: {...}, after: {...} }
    reason          TEXT,                         -- Motivazione (obbligatoria per ban/suspend)
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indici per ricerca veloce
CREATE INDEX idx_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_date ON admin_audit_log(created_at);
CREATE INDEX idx_audit_action ON admin_audit_log(action);
```

**Cosa viene loggato:**

| Azione | Dettaglio Salvato |
|--------|-------------------|
| Login admin | IP, user agent, successo/fallimento |
| Approva/rifiuta foto | photo_id, dog_id, owner_id, decisione, AI score |
| Warn/Suspend/Ban utente | user_id, motivo, durata sospensione |
| Disattiva/riattiva utente | user_id, stato precedente, nuovo stato |
| Reset password utente | user_id |
| Impersonate utente | user_id, durata sessione |
| Export GDPR | user_id, tipo export |
| Cancellazione GDPR | user_id, dati cancellati |
| Modifica feature flag | flag_key, valore precedente, nuovo valore |
| Modifica parametri matching | parametro, valore precedente, nuovo valore |
| Creazione/modifica admin | admin_id target, ruolo assegnato |
| Invio push notification | audience, testo, n. destinatari |

**Retention audit log:** 36 mesi. Dopo 36 mesi i log vengono archiviati su R2 in formato compresso e rimossi dal database.

### 8.2 Visualizzazione Audit Log nel Backoffice

La pagina `settings/audit-log` mostra:

- Lista cronologica con filtri per: admin, risorsa, azione, periodo (usando `<DataTable>` generico)
- Dettaglio con diff (before/after) per modifiche dati (in shadcn Dialog)
- Export in CSV per audit esterni
- Ricerca full-text sul campo `reason`
- Vista aggregata: "azioni per admin" nell'ultimo periodo (per monitorare attivita)

### 8.3 GDPR Tools

#### 8.3.1 Export Dati Utente (Diritto di Accesso)

Endpoint: `GET /admin/v1/users/:id/export`

L'export genera un file JSON contenente tutti i dati dell'utente:

```json
{
  "export_date": "2026-03-09T10:30:00Z",
  "user": {
    "id": "...",
    "email": "...",
    "display_name": "...",
    "created_at": "...",
    "last_login_at": "..."
  },
  "dogs": [
    {
      "name": "Luna",
      "breed": "Labrador",
      "photos": ["signed_url_1", "signed_url_2"],
      "...": "..."
    }
  ],
  "matches": [...],
  "messages_sent": [...],
  "reports_made": [...],
  "reports_received": [...],
  "subscription_history": [...],
  "consent_history": [...],
  "login_history": [...]
}
```

L'export viene generato in background (puo richiedere alcuni secondi per utenti con molto storico). Il file viene salvato su R2 con signed URL (scadenza 24h) e l'admin riceve il link per il download.

**Workflow:** L'utente puo anche richiedere l'export self-service dall'app. In quel caso l'export viene generato automaticamente e inviato all'email dell'utente senza intervento admin.

#### 8.3.2 Cancellazione Account (Diritto all'Oblio)

Endpoint: `DELETE /admin/v1/users/:id`

La cancellazione e un processo in piu fasi:

1. **Conferma admin:** L'admin deve confermare inserendo il proprio password e un motivo (tramite shadcn AlertDialog con form React Hook Form + Zod)
2. **Soft delete immediato:** L'account viene disattivato e tutti i profili nascosti
3. **Hard delete programmato:** Dopo 30 giorni (periodo di grazia per ripensamento), un Cron job BullMQ esegue la cancellazione definitiva:
   - Cancella tutti i dati personali da `users`
   - Cancella profili cane e foto da DB e R2
   - Cancella messaggi chat
   - Anonimizza (non cancella) i dati in tabelle aggregate (per non alterare le statistiche)
   - Mantiene record anonimizzato nell'audit log: "utente [DELETED-{hash}] cancellato per GDPR"
4. **Conferma:** Email di conferma all'utente che i dati sono stati cancellati

**Dati NON cancellati (anonimizzati):**

- Righe in `admin_daily_metrics` (contatori aggregati, nessun dato personale)
- Righe in `admin_cohort_retention` (dati aggregati)
- Record audit log (anonimizzati: user_id sostituito con hash)

#### 8.3.3 Consent Management

Il backoffice mostra lo storico dei consensi dell'utente:

| Consenso | Data | Versione T&C | Stato |
|----------|------|-------------|-------|
| T&C | 2026-01-15 | v1.0 | Accettato |
| Privacy Policy | 2026-01-15 | v1.0 | Accettato |
| Marketing | 2026-01-15 | - | Rifiutato |
| Marketing | 2026-02-20 | - | Accettato (modificato) |
| Analisi comportamentale | 2026-01-15 | - | Accettato |

### 8.4 Data Retention Policies

| Tipo Dato | Retention | Azione alla Scadenza |
|-----------|-----------|---------------------|
| Dati account utente | Fino a cancellazione | Cancellazione su richiesta |
| Messaggi chat | 6 mesi dopo eliminazione match | Cancellazione automatica |
| Log attivita utente | 12 mesi | Cancellazione automatica |
| Foto rifiutate | 30 giorni dal rifiuto | Cancellazione da R2 |
| Segnalazioni risolte | 24 mesi | Anonimizzazione |
| Audit log admin | 36 mesi | Archiviazione su R2 + rimozione da DB |
| Metriche aggregate | Indefinite | N/A (dati anonimi) |
| Backup database | 30 giorni | Rotazione automatica |

La pagina `DataRetention` nel backoffice (accessibile solo a Super Admin) mostra:

- Dashboard dello stato retention per ogni categoria
- Conteggio dati in scadenza nei prossimi 30 giorni
- Log delle cancellazioni automatiche eseguite
- Possibilita di triggerare manualmente un ciclo di pulizia

---

## Appendice A: Priorita di Implementazione

### MVP (Pre-lancio, obbligatorio)

| Modulo | Componenti | Sforzo Stimato |
|--------|-----------|---------------|
| Setup progetto Next.js + shadcn/ui | Scaffold, layout, sidebar, auth flow | 2 giorni |
| `<DataTable>` generico + `useServerTable` | Componente riutilizzabile + hook | 3 giorni |
| RBAC (middleware + hook + `<Can>`) | 4 ruoli, ~10 risorse, middleware | 2 giorni |
| Auth admin | Login page, JWT, MFA base | 3 giorni |
| Moderazione foto | Coda foto, approve/reject, bulk, shortcuts | 5 giorni |
| Moderazione segnalazioni | Coda report, dettaglio, warn/suspend | 4 giorni |
| Gestione utenti | Lista (DataTable), dettaglio, disattiva/riattiva | 3 giorni |
| Dashboard base | KPI cards, contatori code (Recharts) | 3 giorni |
| Audit log base | Logging azioni, visualizzazione (DataTable) | 2 giorni |
| **Totale MVP** | | **~27 giorni** |

### Fase 2 (Post-lancio, settimane 2-8)

| Modulo | Componenti | Sforzo Stimato |
|--------|-----------|---------------|
| Dashboard completa | Grafici trend, heat map, alert | 5 giorni |
| Analytics | Funnel, cohort, matching, revenue | 8 giorni |
| Gestione cani | Lista, dettaglio, flag sospetti | 2 giorni |
| GDPR tools | Export, cancellazione, consent | 4 giorni |
| Impersonate | Login as user | 2 giorni |
| Gestione contenuti | Push, eventi, badge | 5 giorni |
| Configurazione sistema | Feature flags, matching config, razze | 4 giorni |
| Report schedulati | Email automatiche | 3 giorni |
| **Totale Fase 2** | | **~33 giorni** |

---

## Appendice B: Schema Database Admin (Tabelle Aggiuntive)

```sql
-- Utenti admin
CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'moderator', 'support', 'analyst')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    mfa_secret      VARCHAR(255),
    mfa_enabled     BOOLEAN NOT NULL DEFAULT false,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES admin_users(id)
);

-- Azioni di moderazione
CREATE TABLE moderation_actions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES admin_users(id),
    target_user_id  UUID NOT NULL REFERENCES users(id),
    action_type     VARCHAR(20) NOT NULL CHECK (action_type IN ('warn', 'suspend', 'ban', 'unban', 'unsuspend')),
    reason          TEXT NOT NULL,
    related_report_id UUID REFERENCES user_reports(id),
    suspension_days INTEGER,            -- NULL per warn e ban
    expires_at      TIMESTAMP,          -- NULL per warn e ban permanente
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modaction_user ON moderation_actions(target_user_id);
CREATE INDEX idx_modaction_admin ON moderation_actions(admin_id);

-- Feature flags
CREATE TABLE feature_flags (
    key             VARCHAR(100) PRIMARY KEY,
    value           BOOLEAN NOT NULL DEFAULT false,
    description     TEXT,
    updated_by      UUID REFERENCES admin_users(id),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Configurazione matching (key-value)
CREATE TABLE matching_config (
    key             VARCHAR(100) PRIMARY KEY,
    value           JSONB NOT NULL,
    description     TEXT,
    updated_by      UUID REFERENCES admin_users(id),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Razze canine
CREATE TABLE dog_breeds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    fci_group       VARCHAR(100),
    size_typical    VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

> **Documento redatto per il team DogWalk.**
> **Prossima revisione:** Dopo completamento Sprint 3 (integrazione moderazione nel backoffice).
