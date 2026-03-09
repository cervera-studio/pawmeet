# DogWalk - Architettura Backoffice / Admin Panel

> **Versione:** 1.0
> **Data:** 9 marzo 2026
> **Tipo documento:** Architettura tecnica backoffice
> **Stato:** Draft

---

## Indice

1. [Tech Stack e Scelta del Framework](#1-tech-stack-e-scelta-del-framework)
2. [Struttura nel Monorepo](#2-struttura-nel-monorepo)
3. [API Admin](#3-api-admin)
4. [Integrazione Cloudflare](#4-integrazione-cloudflare)
5. [Moderazione Workflow](#5-moderazione-workflow)
6. [Dashboard e Reporting](#6-dashboard-e-reporting)
7. [RBAC - Role-Based Access Control](#7-rbac---role-based-access-control)
8. [Audit e Compliance](#8-audit-e-compliance)

---

## 1. Tech Stack e Scelta del Framework

### 1.1 Valutazione Framework Admin

| Criterio | Refine | React Admin | Custom (Next.js + shadcn/ui) |
|----------|:------:|:-----------:|:----------------------------:|
| Flessibilita UI | 5/5 (headless) | 3/5 (opinionated) | 5/5 (totale) |
| Time-to-MVP | 4/5 | 5/5 | 2/5 |
| Curva di apprendimento | 3/5 | 4/5 | 4/5 |
| Compatibilita Cloudflare Pages | 5/5 (SPA pura) | 5/5 (SPA pura) | 3/5 (richiede adattamento SSR) |
| Supporto Tanstack Table/Query | 5/5 (nativo) | 2/5 (proprio sistema) | 5/5 |
| Customizzazione workflow moderazione | 5/5 | 3/5 | 5/5 |
| Manutenzione lungo termine | 4/5 | 4/5 | 3/5 |
| Community e plugin | 4/5 | 5/5 | N/A |
| Integrazione con design system Ant Design | 5/5 | 3/5 (Material UI nativo) | 4/5 (via shadcn) |

### 1.2 Scelta: Refine con Ant Design

**Motivazione:**

1. **Headless by design**: Refine non impone componenti UI, ma offre hook e provider per data fetching, autenticazione, routing, notifiche e RBAC. Questo permette di usare Ant Design per le schermate CRUD standard (utenti, cani, liste) e componenti custom per workflow specializzati (moderazione foto, dashboard).

2. **Tanstack Query nativo**: Refine usa `@tanstack/react-query` internamente, il che significa caching, invalidazione e stato server gestiti nativamente. Ogni lista con paginazione, filtri e sorting funziona out-of-the-box senza boilerplate.

3. **Deploy su Cloudflare Pages**: Refine produce una SPA React pura (Vite), perfettamente compatibile con Cloudflare Pages senza configurazioni SSR. React Admin ha la stessa compatibilita, ma Refine offre maggiore flessibilita nel design dei workflow custom.

4. **RBAC integrato**: Il modulo `@refinedev/casbin` o l'`accessControlProvider` nativo gestiscono permessi granulari per risorsa e azione, esattamente cio che serve per i 4 ruoli admin definiti.

5. **Data provider custom**: Refine astrae la comunicazione API tramite data provider. Scriveremo un provider custom per le API Hono del backend, riutilizzabile su tutti i moduli.

6. **Non React Admin perche**: React Admin e piu maturo ma fortemente opinionated sulla UI (Material UI). La moderazione foto richiede layout custom (griglia foto, preview fullscreen, keyboard shortcuts, bulk actions) che in React Admin richiedono override pesanti. Inoltre React Admin usa un proprio sistema di stato (`ra-core`) invece di Tanstack Query, creando un lock-in piu rigido.

7. **Non custom perche**: Un backoffice custom con Next.js + shadcn richiederebbe 3-4 settimane aggiuntive solo per implementare paginazione server-side, filtri, sorting, auth flow, RBAC e notifiche -- tutto gia incluso in Refine. Il backoffice deve essere operativo al lancio per la moderazione foto, quindi il time-to-MVP e critico.

### 1.3 Stack Completo

| Layer | Tecnologia | Versione | Motivazione |
|-------|-----------|----------|-------------|
| **Framework** | Refine | 4.x | Headless admin framework |
| **UI Library** | Ant Design | 5.x | Componenti enterprise-grade, tabelle potenti, form builder |
| **Build Tool** | Vite | 6.x | Fast HMR, compatibile Cloudflare Pages |
| **Routing** | React Router v7 | 7.x | Supportato nativamente da Refine |
| **State Server** | Tanstack Query | 5.x | Integrato in Refine |
| **Tabelle** | Tanstack Table + `@refinedev/antd` | 8.x | Per tabelle custom (moderazione), Ant Table per CRUD standard |
| **Charting** | Recharts | 2.x | Leggero, composable, ben tipizzato, ottima integrazione React |
| **Mappe** | Mapbox GL JS | 3.x | Heat map utenti, piu flessibile di Google Maps per visualizzazioni custom |
| **Form** | Ant Design Form + `@refinedev/antd` useForm | - | Form validation integrata con Refine data provider |
| **Date** | dayjs | 1.x | Gia usato da Ant Design, leggero |
| **Export** | xlsx (SheetJS) + jsPDF | - | Export CSV/Excel e PDF per report |
| **Real-time** | WebSocket (Cloudflare Durable Objects) | - | Alert dashboard, coda moderazione live |
| **Testing** | Vitest + Testing Library | - | Unit e integration test |
| **Linting** | ESLint + Prettier | - | Condiviso dal monorepo |
| **TypeScript** | TypeScript | 5.x | Strict mode, shared types dal package `@dogwalk/types` |

### 1.4 Perche Recharts e non Tremor

Tremor e un'ottima libreria per dashboard, ma e costruita sopra Tailwind CSS. Poiche il backoffice usa Ant Design (CSS-in-JS con `@ant-design/cssinjs`), introdurre Tailwind creerebbe conflitti di stile e aumenterebbe la complessita del build. Recharts e framework-agnostic, composable, e si integra perfettamente dentro i componenti Card di Ant Design.

---

## 2. Struttura nel Monorepo

### 2.1 Posizione nel Monorepo Turborepo

```
dogwalk-app/
├── apps/
│   ├── mobile/                → App React Native (Expo)
│   ├── web/                   → Landing page / webapp
│   ├── admin/                 → Backoffice (questo documento)
│   └── api/                   → Backend Hono su Cloudflare Workers
├── packages/
│   ├── types/                 → @dogwalk/types - tipi condivisi
│   ├── validation/            → @dogwalk/validation - Zod schemas condivisi
│   ├── utils/                 → @dogwalk/utils - utility condivise
│   ├── api-client/            → @dogwalk/api-client - client tRPC condiviso
│   ├── db/                    → @dogwalk/db - Drizzle schema + migrations
│   ├── config/                → @dogwalk/config - costanti, enum, config
│   └── ui/                    → @dogwalk/ui - componenti condivisi (se necessario)
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
│   ├── App.tsx                          → Root: Refine provider, router, auth, access control
│   ├── main.tsx                         → Entry point Vite
│   ├── vite-env.d.ts
│   │
│   ├── config/
│   │   ├── index.ts                     → Export centralizzato
│   │   ├── env.ts                       → Variabili d'ambiente tipizzate
│   │   ├── routes.ts                    → Definizione rotte admin
│   │   ├── resources.ts                 → Definizione risorse Refine
│   │   └── constants.ts                 → Costanti admin-specific
│   │
│   ├── providers/
│   │   ├── auth-provider.ts             → authProvider Refine (JWT admin)
│   │   ├── data-provider.ts             → dataProvider Refine per API Hono
│   │   ├── access-control-provider.ts   → accessControlProvider (RBAC)
│   │   ├── notification-provider.ts     → Notifiche in-app (Ant message/notification)
│   │   └── live-provider.ts             → WebSocket per real-time updates
│   │
│   ├── modules/
│   │   ├── dashboard/
│   │   │   ├── index.tsx                → Dashboard page
│   │   │   ├── components/
│   │   │   │   ├── KpiCards.tsx          → MAU, DAU, registrazioni, revenue
│   │   │   │   ├── TrendCharts.tsx      → Grafici utenti, match, retention
│   │   │   │   ├── AlertsPanel.tsx      → Alert automatici
│   │   │   │   ├── HeatMap.tsx          → Mappa heat utenti per citta
│   │   │   │   └── RevenueChart.tsx     → Revenue, MRR, churn
│   │   │   └── hooks/
│   │   │       ├── useDashboardKpis.ts  → Fetch KPI aggregati
│   │   │       └── useDashboardAlerts.ts
│   │   │
│   │   ├── moderation/
│   │   │   ├── index.tsx                → Layout modulo moderazione
│   │   │   ├── pages/
│   │   │   │   ├── PhotoQueue.tsx       → Coda moderazione foto
│   │   │   │   ├── ReportQueue.tsx      → Coda segnalazioni utenti
│   │   │   │   ├── ChatReportQueue.tsx  → Coda segnalazioni chat
│   │   │   │   └── ModerationLog.tsx    → Storico azioni moderazione
│   │   │   ├── components/
│   │   │   │   ├── PhotoReviewCard.tsx  → Card foto con AI score, azioni approve/reject
│   │   │   │   ├── PhotoGrid.tsx        → Griglia foto per bulk review
│   │   │   │   ├── ReportDetail.tsx     → Dettaglio segnalazione con storico utente
│   │   │   │   ├── ChatMessagePreview.tsx → Preview messaggio segnalato con contesto
│   │   │   │   ├── UserActionModal.tsx  → Modale warn/suspend/ban
│   │   │   │   ├── BulkActionBar.tsx    → Barra azioni bulk (approva/rifiuta selezionati)
│   │   │   │   └── ModerationStats.tsx  → Statistiche coda (pending, SLA)
│   │   │   └── hooks/
│   │   │       ├── usePhotoQueue.ts     → Fetch + mutazioni coda foto
│   │   │       ├── useReportQueue.ts    → Fetch + mutazioni segnalazioni
│   │   │       ├── useModerationAction.ts → Azioni warn/suspend/ban
│   │   │       └── useKeyboardShortcuts.ts → Shortcuts per moderazione veloce
│   │   │
│   │   ├── users/
│   │   │   ├── pages/
│   │   │   │   ├── UserList.tsx         → Lista utenti con filtri e ricerca
│   │   │   │   ├── UserDetail.tsx       → Dettaglio completo utente
│   │   │   │   └── UserImpersonate.tsx  → Vista impersonate (debug)
│   │   │   ├── components/
│   │   │   │   ├── UserFilters.tsx      → Filtri citta, stato, premium, data
│   │   │   │   ├── UserProfileCard.tsx  → Card riepilogo profilo
│   │   │   │   ├── UserDogsTab.tsx      → Tab cani dell'utente
│   │   │   │   ├── UserMatchesTab.tsx   → Tab match dell'utente
│   │   │   │   ├── UserChatsTab.tsx     → Tab chat dell'utente
│   │   │   │   ├── UserReportsTab.tsx   → Tab segnalazioni
│   │   │   │   ├── UserPaymentsTab.tsx  → Tab pagamenti e subscription
│   │   │   │   ├── UserActionsDropdown.tsx → Azioni: disattiva, reset pwd, export, delete
│   │   │   │   └── GdprExportModal.tsx  → Modale export dati GDPR
│   │   │   └── hooks/
│   │   │       ├── useUserDetail.ts
│   │   │       └── useUserActions.ts
│   │   │
│   │   ├── dogs/
│   │   │   ├── pages/
│   │   │   │   ├── DogList.tsx          → Lista profili cane
│   │   │   │   └── DogDetail.tsx        → Dettaglio profilo cane
│   │   │   ├── components/
│   │   │   │   ├── DogFilters.tsx       → Filtri razza, taglia, stato
│   │   │   │   ├── DogPhotoGallery.tsx  → Galleria foto con stato moderazione
│   │   │   │   └── DogSuspiciousFlag.tsx → Flag profili sospetti
│   │   │   └── hooks/
│   │   │       └── useDogDetail.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── pages/
│   │   │   │   ├── OnboardingFunnel.tsx → Funnel onboarding
│   │   │   │   ├── CohortAnalysis.tsx   → Retention per coorte
│   │   │   │   ├── MatchingAnalytics.tsx → Score distribution, success rate
│   │   │   │   ├── RevenueAnalytics.tsx → MRR, churn, ARPU
│   │   │   │   └── AbTestDashboard.tsx  → A/B test results
│   │   │   ├── components/
│   │   │   │   ├── FunnelChart.tsx
│   │   │   │   ├── CohortGrid.tsx
│   │   │   │   ├── RetentionCurve.tsx
│   │   │   │   └── RevenueMetrics.tsx
│   │   │   └── hooks/
│   │   │       ├── useFunnelData.ts
│   │   │       └── useCohortData.ts
│   │   │
│   │   ├── content/
│   │   │   ├── pages/
│   │   │   │   ├── PushNotifications.tsx → Gestione notifiche push
│   │   │   │   ├── EventsList.tsx        → Lista eventi community
│   │   │   │   ├── EventDetail.tsx       → Dettaglio/moderazione evento
│   │   │   │   └── BadgeManager.tsx      → Gestione badge e gamification
│   │   │   └── components/
│   │   │       ├── PushComposer.tsx      → Composer notifica (broadcast/segmentata)
│   │   │       ├── AudienceSelector.tsx  → Selezione audience per notifiche
│   │   │       └── BadgeEditor.tsx
│   │   │
│   │   ├── system/
│   │   │   ├── pages/
│   │   │   │   ├── FeatureFlags.tsx      → Feature flags CRUD
│   │   │   │   ├── MatchingConfig.tsx    → Parametri algoritmo matching
│   │   │   │   ├── RateLimiting.tsx      → Configurazione rate limits
│   │   │   │   └── BreedsManager.tsx     → CRUD razze canine
│   │   │   └── components/
│   │   │       ├── MatchingWeightsEditor.tsx → Editor pesi algoritmo
│   │   │       └── BreedForm.tsx
│   │   │
│   │   └── admin-management/
│   │       ├── pages/
│   │       │   ├── AdminList.tsx          → Lista utenti admin
│   │       │   ├── RoleManager.tsx        → Gestione ruoli
│   │       │   └── AuditLog.tsx           → Audit log completo
│   │       └── components/
│   │           ├── AdminForm.tsx
│   │           ├── RolePermissionMatrix.tsx → Matrice ruoli x permessi
│   │           └── AuditLogFilters.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx          → Layout principale (sidebar + header + content)
│   │   │   ├── Sidebar.tsx              → Menu navigazione con badge contatori
│   │   │   ├── Header.tsx               → Header con user info, notifiche, search
│   │   │   └── Breadcrumbs.tsx
│   │   ├── common/
│   │   │   ├── StatusBadge.tsx          → Badge stato (active, suspended, banned)
│   │   │   ├── UserAvatar.tsx           → Avatar con stato online/offline
│   │   │   ├── ConfirmModal.tsx         → Modale conferma azioni distruttive
│   │   │   ├── DateRangePicker.tsx      → Selettore range date per filtri
│   │   │   ├── ExportButton.tsx         → Pulsante export CSV/PDF
│   │   │   ├── EmptyState.tsx           → Stato vuoto generico
│   │   │   └── ErrorBoundary.tsx
│   │   └── media/
│   │       ├── ImageViewer.tsx          → Viewer foto fullscreen con zoom
│   │       ├── ImageGrid.tsx            → Griglia immagini con selezione multipla
│   │       └── AiScoreBadge.tsx         → Badge score AI moderazione
│   │
│   ├── hooks/
│   │   ├── usePermission.ts            → Hook RBAC per condizionare UI
│   │   ├── useExport.ts                → Hook export dati CSV/PDF
│   │   ├── useWebSocket.ts             → Hook WebSocket per real-time
│   │   └── useDebounce.ts              → Debounce per ricerca
│   │
│   ├── utils/
│   │   ├── api-client.ts               → Client HTTP configurato (fetch + auth headers)
│   │   ├── format.ts                   → Formatters date, numeri, valuta
│   │   ├── filters.ts                  → Helper per costruzione query filtri
│   │   └── keyboard-shortcuts.ts       → Registry shortcuts globali
│   │
│   ├── types/
│   │   └── admin.ts                    → Tipi admin-specific (estendono @dogwalk/types)
│   │
│   └── styles/
│       ├── theme.ts                    → Override tema Ant Design
│       └── global.css                  → Stili globali minimi
│
├── index.html                           → Entry HTML per Vite
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
└── package.json
```

### 2.3 Dipendenze dal Monorepo

Il backoffice importa dai packages condivisi:

```typescript
// Tipi condivisi con mobile, web e API
import type { User, DogProfile, Match, ModerationStatus } from '@dogwalk/types';

// Validatori Zod condivisi (es. per form editing profilo cane)
import { dogProfileSchema, userSchema } from '@dogwalk/validation';

// Costanti condivise (enum razze, taglie, livelli energia)
import { DOG_SIZES, ENERGY_LEVELS, BEHAVIOR_LEVELS } from '@dogwalk/config';
```

Questo garantisce che i tipi usati nel backoffice siano sempre allineati con quelli dell'API e dell'app mobile.

---

## 3. API Admin

### 3.1 Principi di Design

Le API admin sono **endpoint separati** dal backend utente, protetti da autenticazione admin dedicata. Risiedono nello stesso Cloudflare Worker (`apps/api`) ma sotto un prefisso distinto.

```
API utente:  /api/v1/users, /api/v1/matches, /api/v1/chat
API admin:   /api/admin/v1/users, /api/admin/v1/moderation, /api/admin/v1/dashboard
```

**Perche stesso Worker e non separato:**

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

Il data provider Refine mappa automaticamente questo formato con la configurazione:

```typescript
// providers/data-provider.ts
const dataProvider = createDataProvider({
  apiUrl: env.ADMIN_API_URL,
  mapPagination: (pagination) => ({
    page: pagination.current,
    pageSize: pagination.pageSize,
  }),
  mapSorters: (sorters) => ({
    sort: sorters[0]?.field,
    order: sorters[0]?.order,
  }),
  mapFilters: (filters) =>
    filters.reduce((acc, f) => ({
      ...acc,
      [`filter[${f.field}]`]: f.value,
    }), {}),
});
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

Il rate limiting e implementato tramite Cloudflare KV, con chiave `rate:{admin_id}:{endpoint_group}:{window}`.

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

## 4. Integrazione Cloudflare

### 4.1 Architettura di Deployment

```
                    ┌─────────────────────────────────────────────┐
                    │            Cloudflare Network               │
                    │                                             │
  Admin browser ────┤  ┌──────────────────┐                      │
                    │  │ Cloudflare Pages  │  SPA React (Refine)  │
                    │  │ admin.dogwalk.app │  Static assets       │
                    │  └────────┬─────────┘                      │
                    │           │ fetch('/api/admin/v1/...')      │
                    │  ┌────────▼─────────┐                      │
                    │  │ Cloudflare Worker │  Hono API            │
                    │  │ api.dogwalk.app   │  Admin + User APIs   │
                    │  └──┬───┬───┬───┬───┘                      │
                    │     │   │   │   │                           │
                    │  ┌──▼┐ ┌▼──┐│┌──▼──┐                       │
                    │  │KV │ │R2 │││ D.O. │                      │
                    │  └───┘ └───┘│└──────┘                      │
                    │             │                               │
                    └─────────────┼───────────────────────────────┘
                                  │
                         ┌────────▼────────┐
                         │   PostgreSQL    │
                         │ (Neon) │
                         │   + PostGIS     │
                         └─────────────────┘
```

### 4.2 Cloudflare Pages - Admin SPA

**Dominio:** `admin.dogwalk.app`

**Configurazione:**

```toml
# wrangler.toml (sezione Pages)
[site]
  bucket = "apps/admin/dist"

# Headers di sicurezza
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://api.dogwalk.app wss://api.dogwalk.app; img-src 'self' https://*.r2.dev https://api.mapbox.com; style-src 'self' 'unsafe-inline'; script-src 'self'"
    Referrer-Policy = "strict-origin-when-cross-origin"

# SPA fallback
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Accesso ristretto:** Cloudflare Access (Zero Trust) protegge `admin.dogwalk.app` con un policy che richiede autenticazione aziendale (email domain `@dogwalk.app`) prima ancora di servire la SPA. Questo aggiunge un layer di sicurezza prima dell'autenticazione applicativa.

### 4.3 Cloudflare Workers - API Admin

Stesso Worker dell'API utente, con routing separato:

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
4. Nessun proxy tramite Worker → performance ottimale
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

### 4.5 Cloudflare KV - Caching Dashboard

I dati della dashboard sono costosi da calcolare (aggregazioni su tabelle grandi). KV serve come cache layer:

| Chiave KV | Contenuto | TTL | Strategia di Invalidazione |
|-----------|-----------|-----|---------------------------|
| `dashboard:kpis:daily` | KPI giornalieri aggregati | 5 minuti | Ricalcolo automatico |
| `dashboard:kpis:hourly` | KPI orari (DAU real-time) | 1 minuto | Ricalcolo automatico |
| `dashboard:trends:{period}` | Serie temporali per grafici | 15 minuti | Ricalcolo automatico |
| `dashboard:heatmap` | Dati mappa heat | 1 ora | Ricalcolo su cron |
| `dashboard:alerts` | Alert attivi | 30 secondi | Invalidazione su evento |
| `moderation:stats` | Contatori coda moderazione | 30 secondi | Invalidazione su azione |
| `moderation:photo_count` | Contatore foto pending | 10 secondi | Invalidazione su azione |

### 4.6 Cloudflare Durable Objects - Real-time

Per aggiornamenti real-time nella dashboard e nelle code di moderazione, si utilizzano Durable Objects come WebSocket server:

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
                 │  o Cloudflare   │
                 │  Images AI)     │
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

Gli SLA sono monitorati dal pannello `ModerationStats` nella sidebar e nella dashboard. Alert via email/Slack quando gli SLA vengono superati.

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
| DAU (oggi) | Real-time | 1 min | KV counter, incrementato da middleware API |
| Registrazioni (oggi) | Real-time | 1 min | KV counter |
| Foto in coda | Real-time | 10 sec | KV counter, WebSocket push |
| Segnalazioni aperte | Real-time | 30 sec | KV counter, WebSocket push |
| MAU | Batch | 1 ora | Cron Worker, query su DB |
| Revenue / MRR | Batch | 1 ora | Cron Worker, query su payment provider |
| Retention (D7/D30) | Batch | 24 ore | Cron Worker notturno |
| Cohort analysis | Batch | 24 ore | Cron Worker notturno |
| Funnel onboarding | Batch | 6 ore | Cron Worker |
| Matching score distribution | Batch | 12 ore | Cron Worker |
| Heatmap utenti | Batch | 1 ora | Cron Worker, aggregazione PostGIS |

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

**Cron Workers (Cloudflare Cron Triggers):**

| Cron | Schedule | Funzione |
|------|----------|----------|
| `metrics-hourly` | Ogni ora | Calcola `admin_hourly_metrics` per l'ora corrente |
| `metrics-daily` | 01:00 UTC | Calcola `admin_daily_metrics` per il giorno precedente |
| `cohort-nightly` | 03:00 UTC | Ricalcola `admin_cohort_retention` |
| `alerts-check` | Ogni 5 minuti | Controlla soglie alert e invia notifiche |
| `moderation-sla` | Ogni 15 minuti | Verifica SLA code moderazione |
| `kv-cache-warm` | Ogni 5 minuti | Pre-calcola e salva KPI in KV |

### 6.3 Export Reports

**Formati supportati:**

| Formato | Libreria | Uso |
|---------|----------|-----|
| CSV | Generato server-side, stream dal Worker | Export liste (utenti, cani, segnalazioni) |
| Excel (XLSX) | SheetJS (`xlsx`) client-side | Report con formattazione (dashboard export) |
| PDF | jsPDF + autoTable client-side | Report formali (audit, GDPR) |

**Export grandi volumi:** Per export con > 10.000 righe, il Worker genera il file in background e lo salva su R2, inviando una notifica al client (via WebSocket o polling) quando pronto. L'admin scarica il file da R2 tramite signed URL.

### 6.4 Scheduled Reports via Email

Configurazione per report automatici (Fase 2):

| Report | Frequenza | Destinatari | Contenuto |
|--------|-----------|-------------|-----------|
| Daily Operations | Ogni giorno 08:00 | Super Admin, Moderatori | KPI giornalieri, coda moderazione, SLA status |
| Weekly Business | Ogni lunedi 09:00 | Super Admin, Analyst | Trend settimanali, revenue, retention, funnel |
| Monthly Executive | 1o del mese | Super Admin | Report completo con grafici, MoM comparison |
| SLA Breach Alert | Real-time | Moderatori, Super Admin | Alert immediato quando SLA superato |

I report email sono generati da un Cron Worker che compone l'email con i dati aggregati e la invia tramite Cloudflare Email Workers o un servizio transazionale (es. Resend, Postmark).

---

## 7. RBAC - Role-Based Access Control

### 7.1 Modello Permessi

Il sistema RBAC usa un modello a permessi granulari organizzati per risorsa e azione:

```typescript
// Struttura permesso
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

### 7.3 Implementazione nel Frontend (Refine)

```typescript
// providers/access-control-provider.ts
import type { AccessControlProvider } from '@refinedev/core';

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

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const user = getCurrentAdmin();
    if (!user) return { can: false };

    const permissions = rolePermissions[user.role];
    const hasPermission =
      permissions.includes('*:*') ||
      permissions.includes(`${resource}:${action}`) ||
      permissions.includes(`${resource}:*`);

    return { can: hasPermission };
  },
};
```

### 7.4 Protezione UI

I componenti del backoffice nascondono automaticamente elementi non accessibili:

```typescript
// Esempio: il pulsante "Ban" appare solo per super_admin
import { useCan } from '@refinedev/core';

function UserActions({ userId }: { userId: string }) {
  const { data: canBan } = useCan({
    resource: 'moderation.actions',
    action: 'ban',
  });

  return (
    <Space>
      <Button onClick={() => handleWarn(userId)}>Warning</Button>
      <Button onClick={() => handleSuspend(userId)}>Sospendi 7gg</Button>
      {canBan?.can && (
        <Button danger onClick={() => handleBan(userId)}>Ban Permanente</Button>
      )}
    </Space>
  );
}
```

La protezione e anche server-side: il middleware API verifica i permessi del ruolo prima di eseguire qualsiasi operazione.

### 7.5 UI Gestione Ruoli (Super Admin)

La pagina `RoleManager` permette al Super Admin di:

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

La pagina `AuditLog` mostra:

- Lista cronologica con filtri per: admin, risorsa, azione, periodo
- Dettaglio con diff (before/after) per modifiche dati
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

1. **Conferma admin:** L'admin deve confermare inserendo il proprio password e un motivo
2. **Soft delete immediato:** L'account viene disattivato e tutti i profili nascosti
3. **Hard delete programmato:** Dopo 30 giorni (periodo di grazia per ripensamento), un Cron Worker esegue la cancellazione definitiva:
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
| Auth admin | Login, JWT, MFA base | 3 giorni |
| Moderazione foto | Coda foto, approve/reject, bulk, shortcuts | 5 giorni |
| Moderazione segnalazioni | Coda report, dettaglio, warn/suspend | 4 giorni |
| Gestione utenti | Lista, dettaglio, disattiva/riattiva | 3 giorni |
| Dashboard base | KPI cards, contatori code | 3 giorni |
| RBAC base | 4 ruoli, matrice permessi | 2 giorni |
| Audit log base | Logging azioni, visualizzazione | 2 giorni |
| **Totale MVP** | | **~22 giorni** |

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

# DogWalk - Architettura Backoffice / Admin Panel

> **Versione:** 1.0
> **Data:** 9 marzo 2026
> **Tipo documento:** Architettura tecnica backoffice
> **Stato:** Draft

---

## Indice

1. [Tech Stack e Scelta del Framework](#1-tech-stack-e-scelta-del-framework)
2. [Struttura nel Monorepo](#2-struttura-nel-monorepo)
3. [API Admin](#3-api-admin)
4. [Integrazione Cloudflare](#4-integrazione-cloudflare)
5. [Moderazione Workflow](#5-moderazione-workflow)
6. [Dashboard e Reporting](#6-dashboard-e-reporting)
7. [RBAC - Role-Based Access Control](#7-rbac---role-based-access-control)
8. [Audit e Compliance](#8-audit-e-compliance)

---

## 1. Tech Stack e Scelta del Framework

### 1.1 Valutazione Framework Admin

| Criterio | Refine | React Admin | Custom (Next.js + shadcn/ui) |
|----------|:------:|:-----------:|:----------------------------:|
| Flessibilita UI | 5/5 (headless) | 3/5 (opinionated) | 5/5 (totale) |
| Time-to-MVP | 4/5 | 5/5 | 2/5 |
| Curva di apprendimento | 3/5 | 4/5 | 4/5 |
| Compatibilita Cloudflare Pages | 5/5 (SPA pura) | 5/5 (SPA pura) | 3/5 (richiede adattamento SSR) |
| Supporto Tanstack Table/Query | 5/5 (nativo) | 2/5 (proprio sistema) | 5/5 |
| Customizzazione workflow moderazione | 5/5 | 3/5 | 5/5 |
| Manutenzione lungo termine | 4/5 | 4/5 | 3/5 |
| Community e plugin | 4/5 | 5/5 | N/A |
| Integrazione con design system Ant Design | 5/5 | 3/5 (Material UI nativo) | 4/5 (via shadcn) |

### 1.2 Scelta: Refine con Ant Design

**Motivazione:**

1. **Headless by design**: Refine non impone componenti UI, ma offre hook e provider per data fetching, autenticazione, routing, notifiche e RBAC. Questo permette di usare Ant Design per le schermate CRUD standard (utenti, cani, liste) e componenti custom per workflow specializzati (moderazione foto, dashboard).

2. **Tanstack Query nativo**: Refine usa `@tanstack/react-query` internamente, il che significa caching, invalidazione e stato server gestiti nativamente. Ogni lista con paginazione, filtri e sorting funziona out-of-the-box senza boilerplate.

3. **Deploy su Cloudflare Pages**: Refine produce una SPA React pura (Vite), perfettamente compatibile con Cloudflare Pages senza configurazioni SSR. React Admin ha la stessa compatibilita, ma Refine offre maggiore flessibilita nel design dei workflow custom.

4. **RBAC integrato**: Il modulo `@refinedev/casbin` o l'`accessControlProvider` nativo gestiscono permessi granulari per risorsa e azione, esattamente cio che serve per i 4 ruoli admin definiti.

5. **Data provider custom**: Refine astrae la comunicazione API tramite data provider. Scriveremo un provider custom per le API Hono del backend, riutilizzabile su tutti i moduli.

6. **Non React Admin perche**: React Admin e piu maturo ma fortemente opinionated sulla UI (Material UI). La moderazione foto richiede layout custom (griglia foto, preview fullscreen, keyboard shortcuts, bulk actions) che in React Admin richiedono override pesanti. Inoltre React Admin usa un proprio sistema di stato (`ra-core`) invece di Tanstack Query, creando un lock-in piu rigido.

7. **Non custom perche**: Un backoffice custom con Next.js + shadcn richiederebbe 3-4 settimane aggiuntive solo per implementare paginazione server-side, filtri, sorting, auth flow, RBAC e notifiche -- tutto gia incluso in Refine. Il backoffice deve essere operativo al lancio per la moderazione foto, quindi il time-to-MVP e critico.

### 1.3 Stack Completo

| Layer | Tecnologia | Versione | Motivazione |
|-------|-----------|----------|-------------|
| **Framework** | Refine | 4.x | Headless admin framework |
| **UI Library** | Ant Design | 5.x | Componenti enterprise-grade, tabelle potenti, form builder |
| **Build Tool** | Vite | 6.x | Fast HMR, compatibile Cloudflare Pages |
| **Routing** | React Router v7 | 7.x | Supportato nativamente da Refine |
| **State Server** | Tanstack Query | 5.x | Integrato in Refine |
| **Tabelle** | Tanstack Table + `@refinedev/antd` | 8.x | Per tabelle custom (moderazione), Ant Table per CRUD standard |
| **Charting** | Recharts | 2.x | Leggero, composable, ben tipizzato, ottima integrazione React |
| **Mappe** | Mapbox GL JS | 3.x | Heat map utenti, piu flessibile di Google Maps per visualizzazioni custom |
| **Form** | Ant Design Form + `@refinedev/antd` useForm | - | Form validation integrata con Refine data provider |
| **Date** | dayjs | 1.x | Gia usato da Ant Design, leggero |
| **Export** | xlsx (SheetJS) + jsPDF | - | Export CSV/Excel e PDF per report |
| **Real-time** | WebSocket (Cloudflare Durable Objects) | - | Alert dashboard, coda moderazione live |
| **Testing** | Vitest + Testing Library | - | Unit e integration test |
| **Linting** | ESLint + Prettier | - | Condiviso dal monorepo |
| **TypeScript** | TypeScript | 5.x | Strict mode, shared types dal package `@dogwalk/types` |

### 1.4 Perche Recharts e non Tremor

Tremor e un'ottima libreria per dashboard, ma e costruita sopra Tailwind CSS. Poiche il backoffice usa Ant Design (CSS-in-JS con `@ant-design/cssinjs`), introdurre Tailwind creerebbe conflitti di stile e aumenterebbe la complessita del build. Recharts e framework-agnostic, composable, e si integra perfettamente dentro i componenti Card di Ant Design.

---

## 2. Struttura nel Monorepo

### 2.1 Posizione nel Monorepo Turborepo

```
dogwalk-app/
├── apps/
│   ├── mobile/                → App React Native (Expo)
│   ├── web/                   → Landing page / webapp
│   ├── admin/                 → Backoffice (questo documento)
│   └── api/                   → Backend Hono su Cloudflare Workers
├── packages/
│   ├── types/                 → @dogwalk/types - tipi condivisi
│   ├── validation/            → @dogwalk/validation - Zod schemas condivisi
│   ├── utils/                 → @dogwalk/utils - utility condivise
│   ├── api-client/            → @dogwalk/api-client - client tRPC condiviso
│   ├── db/                    → @dogwalk/db - Drizzle schema + migrations
│   ├── config/                → @dogwalk/config - costanti, enum, config
│   └── ui/                    → @dogwalk/ui - componenti condivisi (se necessario)
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
│   ├── App.tsx                          → Root: Refine provider, router, auth, access control
│   ├── main.tsx                         → Entry point Vite
│   ├── vite-env.d.ts
│   │
│   ├── config/
│   │   ├── index.ts                     → Export centralizzato
│   │   ├── env.ts                       → Variabili d'ambiente tipizzate
│   │   ├── routes.ts                    → Definizione rotte admin
│   │   ├── resources.ts                 → Definizione risorse Refine
│   │   └── constants.ts                 → Costanti admin-specific
│   │
│   ├── providers/
│   │   ├── auth-provider.ts             → authProvider Refine (JWT admin)
│   │   ├── data-provider.ts             → dataProvider Refine per API Hono
│   │   ├── access-control-provider.ts   → accessControlProvider (RBAC)
│   │   ├── notification-provider.ts     → Notifiche in-app (Ant message/notification)
│   │   └── live-provider.ts             → WebSocket per real-time updates
│   │
│   ├── modules/
│   │   ├── dashboard/
│   │   │   ├── index.tsx                → Dashboard page
│   │   │   ├── components/
│   │   │   │   ├── KpiCards.tsx          → MAU, DAU, registrazioni, revenue
│   │   │   │   ├── TrendCharts.tsx      → Grafici utenti, match, retention
│   │   │   │   ├── AlertsPanel.tsx      → Alert automatici
│   │   │   │   ├── HeatMap.tsx          → Mappa heat utenti per citta
│   │   │   │   └── RevenueChart.tsx     → Revenue, MRR, churn
│   │   │   └── hooks/
│   │   │       ├── useDashboardKpis.ts  → Fetch KPI aggregati
│   │   │       └── useDashboardAlerts.ts
│   │   │
│   │   ├── moderation/
│   │   │   ├── index.tsx                → Layout modulo moderazione
│   │   │   ├── pages/
│   │   │   │   ├── PhotoQueue.tsx       → Coda moderazione foto
│   │   │   │   ├── ReportQueue.tsx      → Coda segnalazioni utenti
│   │   │   │   ├── ChatReportQueue.tsx  → Coda segnalazioni chat
│   │   │   │   └── ModerationLog.tsx    → Storico azioni moderazione
│   │   │   ├── components/
│   │   │   │   ├── PhotoReviewCard.tsx  → Card foto con AI score, azioni approve/reject
│   │   │   │   ├── PhotoGrid.tsx        → Griglia foto per bulk review
│   │   │   │   ├── ReportDetail.tsx     → Dettaglio segnalazione con storico utente
│   │   │   │   ├── ChatMessagePreview.tsx → Preview messaggio segnalato con contesto
│   │   │   │   ├── UserActionModal.tsx  → Modale warn/suspend/ban
│   │   │   │   ├── BulkActionBar.tsx    → Barra azioni bulk (approva/rifiuta selezionati)
│   │   │   │   └── ModerationStats.tsx  → Statistiche coda (pending, SLA)
│   │   │   └── hooks/
│   │   │       ├── usePhotoQueue.ts     → Fetch + mutazioni coda foto
│   │   │       ├── useReportQueue.ts    → Fetch + mutazioni segnalazioni
│   │   │       ├── useModerationAction.ts → Azioni warn/suspend/ban
│   │   │       └── useKeyboardShortcuts.ts → Shortcuts per moderazione veloce
│   │   │
│   │   ├── users/
│   │   │   ├── pages/
│   │   │   │   ├── UserList.tsx         → Lista utenti con filtri e ricerca
│   │   │   │   ├── UserDetail.tsx       → Dettaglio completo utente
│   │   │   │   └── UserImpersonate.tsx  → Vista impersonate (debug)
│   │   │   ├── components/
│   │   │   │   ├── UserFilters.tsx      → Filtri citta, stato, premium, data
│   │   │   │   ├── UserProfileCard.tsx  → Card riepilogo profilo
│   │   │   │   ├── UserDogsTab.tsx      → Tab cani dell'utente
│   │   │   │   ├── UserMatchesTab.tsx   → Tab match dell'utente
│   │   │   │   ├── UserChatsTab.tsx     → Tab chat dell'utente
│   │   │   │   ├── UserReportsTab.tsx   → Tab segnalazioni
│   │   │   │   ├── UserPaymentsTab.tsx  → Tab pagamenti e subscription
│   │   │   │   ├── UserActionsDropdown.tsx → Azioni: disattiva, reset pwd, export, delete
│   │   │   │   └── GdprExportModal.tsx  → Modale export dati GDPR
│   │   │   └── hooks/
│   │   │       ├── useUserDetail.ts
│   │   │       └── useUserActions.ts
│   │   │
│   │   ├── dogs/
│   │   │   ├── pages/
│   │   │   │   ├── DogList.tsx          → Lista profili cane
│   │   │   │   └── DogDetail.tsx        → Dettaglio profilo cane
│   │   │   ├── components/
│   │   │   │   ├── DogFilters.tsx       → Filtri razza, taglia, stato
│   │   │   │   ├── DogPhotoGallery.tsx  → Galleria foto con stato moderazione
│   │   │   │   └── DogSuspiciousFlag.tsx → Flag profili sospetti
│   │   │   └── hooks/
│   │   │       └── useDogDetail.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── pages/
│   │   │   │   ├── OnboardingFunnel.tsx → Funnel onboarding
│   │   │   │   ├── CohortAnalysis.tsx   → Retention per coorte
│   │   │   │   ├── MatchingAnalytics.tsx → Score distribution, success rate
│   │   │   │   ├── RevenueAnalytics.tsx → MRR, churn, ARPU
│   │   │   │   └── AbTestDashboard.tsx  → A/B test results
│   │   │   ├── components/
│   │   │   │   ├── FunnelChart.tsx
│   │   │   │   ├── CohortGrid.tsx
│   │   │   │   ├── RetentionCurve.tsx
│   │   │   │   └── RevenueMetrics.tsx
│   │   │   └── hooks/
│   │   │       ├── useFunnelData.ts
│   │   │       └── useCohortData.ts
│   │   │
│   │   ├── content/
│   │   │   ├── pages/
│   │   │   │   ├── PushNotifications.tsx → Gestione notifiche push
│   │   │   │   ├── EventsList.tsx        → Lista eventi community
│   │   │   │   ├── EventDetail.tsx       → Dettaglio/moderazione evento
│   │   │   │   └── BadgeManager.tsx      → Gestione badge e gamification
│   │   │   └── components/
│   │   │       ├── PushComposer.tsx      → Composer notifica (broadcast/segmentata)
│   │   │       ├── AudienceSelector.tsx  → Selezione audience per notifiche
│   │   │       └── BadgeEditor.tsx
│   │   │
│   │   ├── system/
│   │   │   ├── pages/
│   │   │   │   ├── FeatureFlags.tsx      → Feature flags CRUD
│   │   │   │   ├── MatchingConfig.tsx    → Parametri algoritmo matching
│   │   │   │   ├── RateLimiting.tsx      → Configurazione rate limits
│   │   │   │   └── BreedsManager.tsx     → CRUD razze canine
│   │   │   └── components/
│   │   │       ├── MatchingWeightsEditor.tsx → Editor pesi algoritmo
│   │   │       └── BreedForm.tsx
│   │   │
│   │   └── admin-management/
│   │       ├── pages/
│   │       │   ├── AdminList.tsx          → Lista utenti admin
│   │       │   ├── RoleManager.tsx        → Gestione ruoli
│   │       │   └── AuditLog.tsx           → Audit log completo
│   │       └── components/
│   │           ├── AdminForm.tsx
│   │           ├── RolePermissionMatrix.tsx → Matrice ruoli x permessi
│   │           └── AuditLogFilters.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx          → Layout principale (sidebar + header + content)
│   │   │   ├── Sidebar.tsx              → Menu navigazione con badge contatori
│   │   │   ├── Header.tsx               → Header con user info, notifiche, search
│   │   │   └── Breadcrumbs.tsx
│   │   ├── common/
│   │   │   ├── StatusBadge.tsx          → Badge stato (active, suspended, banned)
│   │   │   ├── UserAvatar.tsx           → Avatar con stato online/offline
│   │   │   ├── ConfirmModal.tsx         → Modale conferma azioni distruttive
│   │   │   ├── DateRangePicker.tsx      → Selettore range date per filtri
│   │   │   ├── ExportButton.tsx         → Pulsante export CSV/PDF
│   │   │   ├── EmptyState.tsx           → Stato vuoto generico
│   │   │   └── ErrorBoundary.tsx
│   │   └── media/
│   │       ├── ImageViewer.tsx          → Viewer foto fullscreen con zoom
│   │       ├── ImageGrid.tsx            → Griglia immagini con selezione multipla
│   │       └── AiScoreBadge.tsx         → Badge score AI moderazione
│   │
│   ├── hooks/
│   │   ├── usePermission.ts            → Hook RBAC per condizionare UI
│   │   ├── useExport.ts                → Hook export dati CSV/PDF
│   │   ├── useWebSocket.ts             → Hook WebSocket per real-time
│   │   └── useDebounce.ts              → Debounce per ricerca
│   │
│   ├── utils/
│   │   ├── api-client.ts               → Client HTTP configurato (fetch + auth headers)
│   │   ├── format.ts                   → Formatters date, numeri, valuta
│   │   ├── filters.ts                  → Helper per costruzione query filtri
│   │   └── keyboard-shortcuts.ts       → Registry shortcuts globali
│   │
│   ├── types/
│   │   └── admin.ts                    → Tipi admin-specific (estendono @dogwalk/types)
│   │
│   └── styles/
│       ├── theme.ts                    → Override tema Ant Design
│       └── global.css                  → Stili globali minimi
│
├── index.html                           → Entry HTML per Vite
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
└── package.json
```

### 2.3 Dipendenze dal Monorepo

Il backoffice importa dai packages condivisi:

```typescript
// Tipi condivisi con mobile, web e API
import type { User, DogProfile, Match, ModerationStatus } from '@dogwalk/types';

// Validatori Zod condivisi (es. per form editing profilo cane)
import { dogProfileSchema, userSchema } from '@dogwalk/validation';

// Costanti condivise (enum razze, taglie, livelli energia)
import { DOG_SIZES, ENERGY_LEVELS, BEHAVIOR_LEVELS } from '@dogwalk/config';
```

Questo garantisce che i tipi usati nel backoffice siano sempre allineati con quelli dell'API e dell'app mobile.

---

## 3. API Admin

### 3.1 Principi di Design

Le API admin sono **endpoint separati** dal backend utente, protetti da autenticazione admin dedicata. Risiedono nello stesso Cloudflare Worker (`apps/api`) ma sotto un prefisso distinto.

```
API utente:  /api/v1/users, /api/v1/matches, /api/v1/chat
API admin:   /api/admin/v1/users, /api/admin/v1/moderation, /api/admin/v1/dashboard
```

**Perche stesso Worker e non separato:**

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
  "data": [],
  "meta": {
    "total": 15234,
    "page": 1,
    "pageSize": 25,
    "totalPages": 610
  }
}
```

Il data provider Refine mappa automaticamente questo formato con la configurazione:

```typescript
// providers/data-provider.ts
const dataProvider = createDataProvider({
  apiUrl: env.ADMIN_API_URL,
  mapPagination: (pagination) => ({
    page: pagination.current,
    pageSize: pagination.pageSize,
  }),
  mapSorters: (sorters) => ({
    sort: sorters[0]?.field,
    order: sorters[0]?.order,
  }),
  mapFilters: (filters) =>
    filters.reduce((acc, f) => ({
      ...acc,
      [`filter[${f.field}]`]: f.value,
    }), {}),
});
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

Il rate limiting e implementato tramite Cloudflare KV, con chiave `rate:{admin_id}:{endpoint_group}:{window}`.

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
      changes: c.get('auditChanges') ?? null,
      ip_address: c.req.header('CF-Connecting-IP'),
      user_agent: c.req.header('User-Agent'),
      timestamp: new Date().toISOString(),
    });
  }
});
```

---

## 4. Integrazione Cloudflare

### 4.1 Architettura di Deployment

```
                    ┌─────────────────────────────────────────────┐
                    │            Cloudflare Network               │
                    │                                             │
  Admin browser ────┤  ┌──────────────────┐                      │
                    │  │ Cloudflare Pages  │  SPA React (Refine)  │
                    │  │ admin.dogwalk.app │  Static assets       │
                    │  └────────┬─────────┘                      │
                    │           │ fetch('/api/admin/v1/...')      │
                    │  ┌────────▼─────────┐                      │
                    │  │ Cloudflare Worker │  Hono API            │
                    │  │ api.dogwalk.app   │  Admin + User APIs   │
                    │  └──┬───┬───┬───┬───┘                      │
                    │     │   │   │   │                           │
                    │  ┌──▼┐ ┌▼──┐│┌──▼──┐                       │
                    │  │KV │ │R2 │││ D.O. │                      │
                    │  └───┘ └───┘│└──────┘                      │
                    │             │                               │
                    └─────────────┼───────────────────────────────┘
                                  │
                         ┌────────▼────────┐
                         │   PostgreSQL    │
                         │ (Neon) │
                         │   + PostGIS     │
                         └─────────────────┘
```

### 4.2 Cloudflare Pages - Admin SPA

**Dominio:** `admin.dogwalk.app`

**Configurazione:**

```toml
# wrangler.toml (sezione Pages)
[site]
  bucket = "apps/admin/dist"

# Headers di sicurezza
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://api.dogwalk.app wss://api.dogwalk.app; img-src 'self' https://*.r2.dev https://api.mapbox.com; style-src 'self' 'unsafe-inline'; script-src 'self'"
    Referrer-Policy = "strict-origin-when-cross-origin"

# SPA fallback
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Accesso ristretto:** Cloudflare Access (Zero Trust) protegge `admin.dogwalk.app` con un policy che richiede autenticazione aziendale (email domain `@dogwalk.app`) prima ancora di servire la SPA. Questo aggiunge un layer di sicurezza prima dell'autenticazione applicativa.

### 4.3 Cloudflare Workers - API Admin

Stesso Worker dell'API utente, con routing separato:

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
4. Nessun proxy tramite Worker → performance ottimale
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

### 4.5 Cloudflare KV - Caching Dashboard

I dati della dashboard sono costosi da calcolare (aggregazioni su tabelle grandi). KV serve come cache layer:

| Chiave KV | Contenuto | TTL | Strategia di Invalidazione |
|-----------|-----------|-----|---------------------------|
| `dashboard:kpis:daily` | KPI giornalieri aggregati | 5 minuti | Ricalcolo automatico |
| `dashboard:kpis:hourly` | KPI orari (DAU real-time) | 1 minuto | Ricalcolo automatico |
| `dashboard:trends:{period}` | Serie temporali per grafici | 15 minuti | Ricalcolo automatico |
| `dashboard:heatmap` | Dati mappa heat | 1 ora | Ricalcolo su cron |
| `dashboard:alerts` | Alert attivi | 30 secondi | Invalidazione su evento |
| `moderation:stats` | Contatori coda moderazione | 30 secondi | Invalidazione su azione |
| `moderation:photo_count` | Contatore foto pending | 10 secondi | Invalidazione su azione |

### 4.6 Cloudflare Durable Objects - Real-time

Per aggiornamenti real-time nella dashboard e nelle code di moderazione, si utilizzano Durable Objects come WebSocket server:

**Casi d'uso real-time:**

- Nuova foto in coda moderazione: aggiornamento badge sidebar
- Un altro moderatore approva/rifiuta una foto: rimozione dalla coda di tutti i moderatori
- Alert critico (spike segnalazioni): notifica immediata sulla dashboard
- Aggiornamento KPI dashboard: refresh automatico card

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
                 │  o Cloudflare   │
                 │  Images AI)     │
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
2. AI score (piu alto = piu sospetto, prima in coda)
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

Gli SLA sono monitorati dal pannello `ModerationStats` nella sidebar e nella dashboard. Alert via email/Slack quando gli SLA vengono superati.

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
| DAU (oggi) | Real-time | 1 min | KV counter, incrementato da middleware API |
| Registrazioni (oggi) | Real-time | 1 min | KV counter |
| Foto in coda | Real-time | 10 sec | KV counter, WebSocket push |
| Segnalazioni aperte | Real-time | 30 sec | KV counter, WebSocket push |
| MAU | Batch | 1 ora | Cron Worker, query su DB |
| Revenue / MRR | Batch | 1 ora | Cron Worker, query su payment provider |
| Retention (D7/D30) | Batch | 24 ore | Cron Worker notturno |
| Cohort analysis | Batch | 24 ore | Cron Worker notturno |
| Funnel onboarding | Batch | 6 ore | Cron Worker |
| Matching score distribution | Batch | 12 ore | Cron Worker |
| Heatmap utenti | Batch | 1 ora | Cron Worker, aggregazione PostGIS |

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

**Cron Workers (Cloudflare Cron Triggers):**

| Cron | Schedule | Funzione |
|------|----------|----------|
| `metrics-hourly` | Ogni ora | Calcola `admin_hourly_metrics` per l'ora corrente |
| `metrics-daily` | 01:00 UTC | Calcola `admin_daily_metrics` per il giorno precedente |
| `cohort-nightly` | 03:00 UTC | Ricalcola `admin_cohort_retention` |
| `alerts-check` | Ogni 5 minuti | Controlla soglie alert e invia notifiche |
| `moderation-sla` | Ogni 15 minuti | Verifica SLA code moderazione |
| `kv-cache-warm` | Ogni 5 minuti | Pre-calcola e salva KPI in KV |

### 6.3 Export Reports

**Formati supportati:**

| Formato | Libreria | Uso |
|---------|----------|-----|
| CSV | Generato server-side, stream dal Worker | Export liste (utenti, cani, segnalazioni) |
| Excel (XLSX) | SheetJS (`xlsx`) client-side | Report con formattazione (dashboard export) |
| PDF | jsPDF + autoTable client-side | Report formali (audit, GDPR) |

**Export grandi volumi:** Per export con > 10.000 righe, il Worker genera il file in background e lo salva su R2, inviando una notifica al client (via WebSocket o polling) quando pronto. L'admin scarica il file da R2 tramite signed URL.

### 6.4 Scheduled Reports via Email

Configurazione per report automatici (Fase 2):

| Report | Frequenza | Destinatari | Contenuto |
|--------|-----------|-------------|-----------|
| Daily Operations | Ogni giorno 08:00 | Super Admin, Moderatori | KPI giornalieri, coda moderazione, SLA status |
| Weekly Business | Ogni lunedi 09:00 | Super Admin, Analyst | Trend settimanali, revenue, retention, funnel |
| Monthly Executive | 1o del mese | Super Admin | Report completo con grafici, MoM comparison |
| SLA Breach Alert | Real-time | Moderatori, Super Admin | Alert immediato quando SLA superato |

I report email sono generati da un Cron Worker che compone l'email con i dati aggregati e la invia tramite Cloudflare Email Workers o un servizio transazionale (es. Resend, Postmark).

---

## 7. RBAC - Role-Based Access Control

### 7.1 Modello Permessi

Il sistema RBAC usa un modello a permessi granulari organizzati per risorsa e azione:

```typescript
// Struttura permesso
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

### 7.3 Implementazione nel Frontend (Refine)

```typescript
// providers/access-control-provider.ts
import type { AccessControlProvider } from '@refinedev/core';

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

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const user = getCurrentAdmin();
    if (!user) return { can: false };

    const permissions = rolePermissions[user.role];
    const hasPermission =
      permissions.includes('*:*') ||
      permissions.includes(`${resource}:${action}`) ||
      permissions.includes(`${resource}:*`);

    return { can: hasPermission };
  },
};
```

### 7.4 Protezione UI

I componenti del backoffice nascondono automaticamente elementi non accessibili:

```typescript
// Esempio: il pulsante "Ban" appare solo per super_admin
import { useCan } from '@refinedev/core';

function UserActions({ userId }: { userId: string }) {
  const { data: canBan } = useCan({
    resource: 'moderation.actions',
    action: 'ban',
  });

  return (
    <Space>
      <Button onClick={() => handleWarn(userId)}>Warning</Button>
      <Button onClick={() => handleSuspend(userId)}>Sospendi 7gg</Button>
      {canBan?.can && (
        <Button danger onClick={() => handleBan(userId)}>Ban Permanente</Button>
      )}
    </Space>
  );
}
```

La protezione e anche server-side: il middleware API verifica i permessi del ruolo prima di eseguire qualsiasi operazione.

### 7.5 UI Gestione Ruoli (Super Admin)

La pagina `RoleManager` permette al Super Admin di:

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

La pagina `AuditLog` mostra:

- Lista cronologica con filtri per: admin, risorsa, azione, periodo
- Dettaglio con diff (before/after) per modifiche dati
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
      "photos": ["signed_url_1", "signed_url_2"]
    }
  ],
  "matches": [],
  "messages_sent": [],
  "reports_made": [],
  "reports_received": [],
  "subscription_history": [],
  "consent_history": [],
  "login_history": []
}
```

L'export viene generato in background (puo richiedere alcuni secondi per utenti con molto storico). Il file viene salvato su R2 con signed URL (scadenza 24h) e l'admin riceve il link per il download.

**Workflow:** L'utente puo anche richiedere l'export self-service dall'app. In quel caso l'export viene generato automaticamente e inviato all'email dell'utente senza intervento admin.

#### 8.3.2 Cancellazione Account (Diritto all'Oblio)

Endpoint: `DELETE /admin/v1/users/:id`

La cancellazione e un processo in piu fasi:

1. **Conferma admin:** L'admin deve confermare inserendo il proprio password e un motivo
2. **Soft delete immediato:** L'account viene disattivato e tutti i profili nascosti
3. **Hard delete programmato:** Dopo 30 giorni (periodo di grazia per ripensamento), un Cron Worker esegue la cancellazione definitiva:
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
| Auth admin | Login, JWT, MFA base | 3 giorni |
| Moderazione foto | Coda foto, approve/reject, bulk, shortcuts | 5 giorni |
| Moderazione segnalazioni | Coda report, dettaglio, warn/suspend | 4 giorni |
| Gestione utenti | Lista, dettaglio, disattiva/riattiva | 3 giorni |
| Dashboard base | KPI cards, contatori code | 3 giorni |
| RBAC base | 4 ruoli, matrice permessi | 2 giorni |
| Audit log base | Logging azioni, visualizzazione | 2 giorni |
| **Totale MVP** | | **~22 giorni** |

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
    suspension_days INTEGER,
    expires_at      TIMESTAMP,
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

NOT FOUND
