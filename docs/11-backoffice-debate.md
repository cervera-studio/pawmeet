# PawMeet - Dibattito Architetturale: Framework Backoffice / Admin Panel

> **Versione:** 1.0
> **Data:** 9 marzo 2026
> **Formato:** Dibattito strutturato con verdetto finale
> **Classificazione:** Documento interno - Confidenziale
> **Contesto:** Il fondatore ha sollevato dubbi sulla scelta di Refine + Ant Design per il backoffice (doc 08), chiedendo se non sia meglio uniformare lo stack usando Next.js + shadcn/ui come la web app

---

## Premessa

Il doc 08 sceglie **Refine + Ant Design** come framework per il backoffice admin. Il fondatore ha espresso preoccupazione: Refine e Ant Design sono tecnologie aggiuntive che il team deve imparare e mantenere. Lo stack del progetto usa gia React (Expo, Next.js), Tailwind CSS, TanStack Query, React Hook Form + Zod, shadcn/ui. Aggiungere Refine + Ant Design significa due design system, due paradigmi di data fetching, e maggiore frammentazione.

### Le opzioni sul tavolo

| | Opzione A: Refine + Ant Design | Opzione B: Next.js + shadcn/ui + TanStack Table |
|---|---|---|
| **Framework** | Refine 4.x (headless admin framework) | Next.js (stesso della web app) |
| **UI Components** | Ant Design 5.x | shadcn/ui + Tailwind (stesso del resto) |
| **Data Fetching** | TanStack Query (via Refine) | TanStack Query (diretto, gia usato nel mobile) |
| **Tabelle** | `@refinedev/antd` + Ant Table | TanStack Table + shadcn DataTable |
| **Form** | Ant Design Form + Refine useForm | React Hook Form + Zod (gia usato ovunque) |
| **RBAC** | `accessControlProvider` di Refine | Custom middleware + hook (da scrivere) |
| **Routing** | React Router v7 (diverso da Next.js) | Next.js App Router (stesso della web app) |
| **Deploy** | Vite SPA su Cloudflare Pages | Next.js su Cloudflare Pages (o Vercel) |
| **Styling** | CSS-in-JS (Ant Design `@ant-design/cssinjs`) | Tailwind CSS (stesso del resto) |
| **Nuove dipendenze** | ~8 pacchetti Refine + Ant Design | 0 nuove tecnologie |
| **CRUD boilerplate** | Quasi zero (Refine genera tutto) | Da scrivere (pattern riutilizzabili) |

---

## 1. Marco - Cloud Architect

**Specializzazione:** Infrastruttura cloud, deploy, performance, scalabilita.

### Posizione: Opzione B (Next.js + shadcn/ui)

### Argomenti

**1. Un unico deploy pipeline e meglio di due.**
Con l'Opzione A il backoffice e una SPA Vite separata su Cloudflare Pages, mentre la web app e un'app Next.js. Due pipeline di build, due configurazioni di deploy, due set di environment variables. Con l'Opzione B, `apps/admin` e `apps/web` sono entrambi Next.js: stessa configurazione Turborepo, stesso `next.config.js` pattern, stesso deploy su Cloudflare Pages con `@cloudflare/next-on-pages`. Un dev che sa deployare la web app sa deployare il backoffice. Zero sorprese.

**2. Il backoffice ha 10-50 utenti: non serve ottimizzazione infrastrutturale.**
Refine viene pubblicizzato per la sua efficienza nel gestire CRUD massicci. Ma il backoffice PawMeet avra 10-50 utenti concorrenti, tutti interni. Non c'e un problema di performance frontend. Le tabelle piu grandi (utenti, segnalazioni) avranno paginazione server-side in entrambi i casi. Con 50 utenti, anche un'implementazione "naive" in Next.js sara piu che sufficiente.

**3. SSR/ISR per le dashboard e un vantaggio concreto.**
Le dashboard KPI del backoffice (utenti attivi, retention, revenue) possono beneficiare del rendering server-side: i dati vengono pre-calcolati nel server Next.js, riducendo il bundle JS del client e velocizzando il first paint. Con una SPA Vite, tutto il rendering e client-side. Per un backoffice interno non e critico, ma e un vantaggio gratis se usi gia Next.js.

---

## 2. Elena - Backend Architect

**Specializzazione:** API design, data modeling, integrazione frontend-backend.

### Posizione: Opzione B (Next.js + shadcn/ui)

### Argomenti

**1. Il data provider custom di Refine e un layer di astrazione che non serve.**
Il doc 08 dice: "Scriveremo un provider custom per le API Hono del backend". Questo significa: mappare ogni endpoint Hono a un'interfaccia `dataProvider` di Refine (`getList`, `getOne`, `create`, `update`, `delete`), gestire errori, filtri, sorting, paginazione nel formato che Refine si aspetta. E un adattatore che va scritto, testato e mantenuto. Con l'Opzione B, TanStack Query chiama direttamente il client API (gia scritto per il mobile in `@pawmeet/api-client`). Zero layer aggiuntivi, zero mapping, e lo stesso codice che il mobile usa per parlare col backend.

**2. I workflow custom (moderazione) romperanno il paradigma Refine.**
La moderazione foto e il cuore del backoffice: griglia foto, preview fullscreen, keyboard shortcuts, bulk approve/reject, queue con priorita, annotazioni, escalation. Questo NON e un CRUD. In Refine, le pagine custom escono dal pattern del framework e diventano "React puro con hook Refine occasionali". A quel punto stai pagando la complessita di Refine senza beneficiarne. Con l'Opzione B, la moderazione e semplicemente una pagina Next.js con componenti React -- lo stesso paradigma di tutto il resto dell'app.

**3. Condivisione tipi e validazione e nativa con l'Opzione B.**
Il monorepo ha gia `@pawmeet/types`, `@pawmeet/validation` (Zod schemas), e `@pawmeet/api-client`. Con Next.js + React Hook Form + Zod, i form del backoffice possono usare gli stessi schema Zod del mobile e del backend (end-to-end type safety). Con Refine + Ant Design Form, devi adattare la validazione Zod al sistema di validazione di Ant Design, che usa il proprio pattern (`rules` array). E un'altra traduzione non necessaria.

---

## 3. Luca - DevOps/SRE

**Specializzazione:** CI/CD, monitoraggio, affidabilita, developer experience.

### Posizione: Opzione B (Next.js + shadcn/ui)

### Argomenti

**1. Una sola matrice di dipendenze da monitorare.**
Ogni dipendenza aggiuntiva e un rischio di supply chain e un costo di manutenzione. Refine ha 8+ pacchetti (`@refinedev/core`, `@refinedev/antd`, `@refinedev/react-router-v6`, `@refinedev/cli`, ecc.). Ant Design ne aggiunge altri 5+ (`antd`, `@ant-design/icons`, `@ant-design/cssinjs`, `dayjs`, ecc.). Sono ~15 dipendenze extra con le loro breaking change, CVE, e cicli di aggiornamento. Con l'Opzione B, le uniche dipendenze sono quelle che il team gia gestisce: Next.js, shadcn/ui (che sono file copiati, non dipendenze npm), TanStack Table, TanStack Query. Zero nuove supply chain da monitorare.

**2. Un solo framework = un solo set di strumenti di debug.**
Con Refine, quando qualcosa non funziona nella paginazione server-side o nei filtri, devi debuggare attraverso il layer di astrazione di Refine (dataProvider, hooks, state interno). I React DevTools mostrano una gerarchia di componenti Refine wrapper che oscurano il tuo codice. Con l'Opzione B, il percorso dal click del bottone alla fetch e lineare: componente shadcn -> React Hook Form -> TanStack Query -> fetch. Nessun layer intermedio da attraversare.

**3. Onboarding di nuovi dev: zero ramp-up.**
Il fondatore assume dev React senior. Con l'Opzione B, un nuovo dev apre `apps/admin` e vede: Next.js, Tailwind, shadcn/ui, TanStack Query, React Hook Form. Cose che conosce gia. Tempo per la prima PR: 1-2 giorni. Con l'Opzione A, lo stesso dev deve imparare: come funziona Refine (resource, dataProvider, accessControlProvider, hooks custom), come funziona Ant Design (Form, Table, Layout, theme), come si integrano insieme. Tempo per la prima PR: 1-2 settimane. Per una startup con 10-50 utenti nel backoffice, questo overhead non si giustifica.

---

## 4. Sara - Mobile/Frontend Architect

**Specializzazione:** React, React Native, design system, component architecture.

### Posizione: Opzione B (Next.js + shadcn/ui)

### Argomenti

**1. Un design system unificato e un moltiplicatore di produttivita.**
Il progetto usa Tailwind CSS e shadcn/ui per mobile (NativeWind) e web. Se il backoffice usa Ant Design, abbiamo DUE design system completamente diversi: variabili CSS diverse, pattern di personalizzazione diversi, breakpoint diversi, palette diversa. Ogni modifica al brand (colori, font, spacing) va applicata in due posti con due sintassi diverse. Con l'Opzione B, `packages/ui` puo esportare componenti shadcn condivisi tra web e admin. Un cambio nel token `--primary` si propaga ovunque.

**2. I componenti admin specifici si costruiscono una volta e si riusano per sempre.**
Servono: DataTable con sorting/filtri/paginazione, form CRUD generici, layout con sidebar, page header con breadcrumb, stat cards. Con shadcn/ui + TanStack Table, questi componenti si scrivono una volta (~2-3 giorni di lavoro), si mettono in `packages/ui-admin/`, e si riusano in tutte le 15-20 pagine del backoffice. Non e vero che "si scrive tutto da zero": shadcn/ui fornisce gia Table, Form, Input, Select, Dialog, Sheet, Tabs, Badge, Card. TanStack Table fornisce sorting, filtri, paginazione. Il "collante" e 200-300 righe di codice per un componente `<DataTable>` riutilizzabile.

**3. La competenza React del team e il vero asset.**
Il team scrive React da anni. Conosce i pattern: custom hook per la logica, composizione di componenti, TanStack Query per lo stato server, Zod per la validazione. Questi pattern funzionano identicamente nel backoffice. Refine aggiunge un layer di astrazione sopra React che, per quanto ben fatto, richiede di imparare "il modo Refine" di fare le cose. E un overhead cognitivo che non si ammortizza su un backoffice con 15-20 pagine usato da 50 persone.

---

## 5. Paolo - CTO Startup

**Specializzazione:** Decisioni strategiche, trade-off costi/benefici, velocita di esecuzione.

### Posizione: Opzione B (Next.js + shadcn/ui)

### Argomenti

**1. Il time-to-MVP non e cosi diverso come sembra.**
Il doc 08 stima "3-4 settimane aggiuntive" per un backoffice custom rispetto a Refine. Questa stima e gonfiata. Le pagine CRUD (utenti, cani, segnalazioni) con un componente `<DataTable>` generico + un pattern `<CrudPage>` richiedono 1-2 giorni ciascuna. La moderazione foto e le dashboard richiedono lo stesso tempo in entrambi gli approcci (sono custom in ogni caso). La differenza reale e 1-2 settimane, non 3-4. E queste 1-2 settimane si recuperano in manutenzione ridotta nei mesi successivi.

**2. Il costo totale di ownership favorisce l'uniformita.**
Tra 6 mesi, il backoffice avra bisogno di nuove feature: analytics avanzate, gestione abbonamenti, CRM walker, strumenti di customer support. Ogni nuova feature in Refine + Ant Design richiede: capire come si fa "alla Refine", adattare Ant Design al caso d'uso, testare l'integrazione. Con Next.js + shadcn, ogni nuova feature e "solo React": il team la costruisce con gli stessi pattern del mobile e della web app. Il costo marginale di ogni nuova feature e piu basso.

**3. Il fondatore ha ragione: meno tecnologie = meno rischio.**
Come CTO, devo pensare allo scenario peggiore. Se Refine viene abbandonato (e un progetto open source con funding limitato), dobbiamo riscrivere il backoffice. Se Ant Design fa una breaking change major (e successo con Ant Design 4 -> 5), dobbiamo fare un upgrade costoso. Con l'Opzione B, le dipendenze critiche sono Next.js (Vercel, azienda solida), TanStack (Matt Lintz/Tanner Linsley, community enorme), e shadcn/ui (file copiati nel progetto, zero dipendenza runtime). Il rischio di lock-in tecnologico e minimo.

---

## Verdetto del Panel

### Voto

| Architetto | Voto | Certezza |
|-----------|------|----------|
| Marco (Cloud) | **B** | Alta |
| Elena (Backend) | **B** | Alta |
| Luca (DevOps) | **B** | Alta |
| Sara (Frontend) | **B** | Alta |
| Paolo (CTO) | **B** | Alta |

### Risultato: Unanimita per Opzione B (Next.js + shadcn/ui + TanStack Table)

**5-0 per l'Opzione B.**

Il panel e unanime. Per un progetto come PawMeet -- team React senior, backoffice con 10-50 utenti interni, gia Next.js + Tailwind + TanStack nello stack -- aggiungere Refine + Ant Design introduce complessita non giustificata dal valore che porta.

### Motivazione sintetica

1. **Uniformita dello stack**: Zero nuove tecnologie, zero nuovi design system, zero nuovi paradigmi. Ogni dev che lavora sul mobile o sulla web app puo lavorare sul backoffice senza ramp-up.
2. **Costo di manutenzione**: ~15 dipendenze in meno da aggiornare, monitorare, e debuggare. Un solo design system da mantenere allineato al brand.
3. **Il backoffice non e un prodotto admin generico**: Ha workflow custom (moderazione foto, dashboard analytics, audit log) che in Refine richiederebbero comunque codice custom. Il vantaggio di Refine (CRUD automatizzato) si applica solo alle pagine piu semplici.
4. **Il time-to-MVP reale e accettabile**: 1-2 settimane in piu rispetto a Refine, recuperate in manutenzione e onboarding nei mesi successivi.

---

## Pattern Consigliati: CRUD senza Refine

Poiche l'Opzione B richiede di implementare i pattern CRUD manualmente, ecco l'architettura raccomandata dal panel.

### 1. Componente `<DataTable>` generico

Un singolo componente riutilizzabile basato su TanStack Table + shadcn Table:

```tsx
// packages/ui-admin/src/components/data-table.tsx

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

### 2. Hook `useServerTable` per paginazione server-side

```tsx
// packages/ui-admin/src/hooks/use-server-table.ts

function useServerTable<TData>(options: {
  queryKey: string[]
  queryFn: (params: TableParams) => Promise<PaginatedResponse<TData>>
  defaultSort?: SortingState
  defaultPageSize?: number
}) {
  // Combina TanStack Table state + TanStack Query
  // Sincronizza sorting/filtri/paginazione con URL search params
  // Restituisce: data, columns state, pagination state, isLoading
}
```

Questo hook e il "sostituto" del dataProvider di Refine: collega lo stato della tabella (pagina, ordinamento, filtri) a una query TanStack Query che chiama l'API con i parametri corretti. Sincronizza lo stato con i query params dell'URL per permettere il bookmark e la condivisione dei link filtrati.

### 3. Pattern `<CrudPage>` per pagine standard

```tsx
// Pattern per pagine CRUD (utenti, cani, segnalazioni)

// apps/admin/src/app/(dashboard)/users/page.tsx
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

### 4. RBAC con middleware Next.js + hook React

```tsx
// Middleware Next.js per protezione route
// apps/admin/src/middleware.ts
// Verifica ruolo utente (super_admin, admin, moderator, viewer)
// e blocca l'accesso a route non autorizzate

// Hook per controllo permessi nei componenti
// packages/ui-admin/src/hooks/use-permissions.ts
function usePermissions() {
  return {
    can: (action: Action, resource: Resource) => boolean
    role: UserRole
  }
}

// Componente wrapper per nascondere elementi UI
// <Can action="delete" resource="users">
//   <DeleteButton />
// </Can>
```

### 5. Stima effort per l'implementazione

| Modulo | Effort | Note |
|--------|--------|------|
| `<DataTable>` generico | 2 giorni | Una volta, riusato ovunque |
| `useServerTable` hook | 1 giorno | TanStack Query + Table + URL sync |
| `<PageLayout>` + navigation | 1 giorno | Sidebar, breadcrumb, header |
| RBAC (middleware + hook + `<Can>`) | 2 giorni | 4 ruoli, ~10 risorse |
| Pagine CRUD (utenti, cani, segnalazioni, walker) | 4 giorni | ~1 giorno per entita con il pattern sopra |
| Dashboard KPI | 3 giorni | Recharts + stat cards (custom in ogni caso) |
| Moderazione foto | 5 giorni | Custom in ogni caso, non cambia tra A e B |
| Audit log viewer | 1 giorno | DataTable con filtri |
| **Totale** | **~19 giorni** | vs ~12 giorni stimati con Refine |

La differenza di **7 giorni lavorativi** (~1.5 settimane) si recupera in:
- Zero ramp-up su Refine + Ant Design per il team (~1 settimana risparmiata)
- Manutenzione ridotta nei mesi successivi (stimata ~2 giorni/mese risparmiati)
- Onboarding nuovi dev: zero tempo di apprendimento framework specifici

---

## Aggiornamento al Doc 08

Il doc 08 (Backoffice Architecture) deve essere aggiornato per riflettere questa decisione:

| Aspetto | Doc 08 attuale | Nuova decisione |
|---------|---------------|-----------------|
| Framework | Refine 4.x | Next.js (App Router) |
| UI Library | Ant Design 5.x | shadcn/ui + Tailwind CSS |
| Build Tool | Vite | Next.js built-in (Turbopack) |
| Routing | React Router v7 | Next.js App Router |
| Form | Ant Design Form + Refine useForm | React Hook Form + Zod |
| Tabelle | `@refinedev/antd` + Ant Table | TanStack Table + shadcn DataTable |
| Charting | Recharts | Recharts (invariato) |
| RBAC | `accessControlProvider` Refine | Custom middleware + hook |
| Deploy | Vite SPA su Cloudflare Pages | Next.js su Cloudflare Pages (`@cloudflare/next-on-pages`) |
| Design System | Ant Design (separato) | Tailwind + shadcn/ui (unificato con web app) |

### Stack Backoffice Definitivo

| Layer | Tecnologia | Motivazione |
|-------|-----------|-------------|
| **Framework** | Next.js 15.x (App Router) | Stesso della web app |
| **UI** | shadcn/ui + Tailwind CSS | Stesso design system di web e mobile |
| **Data Fetching** | TanStack Query 5.x | Gia usato nel mobile e nella web app |
| **Tabelle** | TanStack Table 8.x | Headless, composable, type-safe |
| **Form** | React Hook Form + Zod | Gia usato ovunque nel monorepo |
| **Charting** | Recharts 2.x | Leggero, composable, React-native |
| **Mappe** | Mapbox GL JS 3.x | Invariato |
| **RBAC** | Custom (middleware + hook) | ~200 righe di codice, zero dipendenze |
| **Export** | xlsx + jsPDF | Invariato |
| **Real-time** | WebSocket nativo | Invariato |
| **Deploy** | Cloudflare Pages | `@cloudflare/next-on-pages` |
| **Testing** | Vitest + Testing Library | Invariato |

---

> **Nota finale del panel:** L'Opzione A (Refine + Ant Design) non e una cattiva scelta in assoluto. E un framework eccellente per team che costruiscono molti admin panel diversi, o per agenzie che devono produrre backoffice rapidamente per clienti diversi. Ma per una startup con un singolo prodotto, un team React senior, e lo stack gia definito, l'uniformita vince sulla velocita iniziale. Il fondatore ha ragione.
