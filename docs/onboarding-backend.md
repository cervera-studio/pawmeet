# Backend Onboarding — PawMeet API

> Guida per chi arriva da .NET/REST e vuole essere operativo in fretta.

---

## 1. Setup ambiente

### Prerequisiti

```bash
# Node.js 22 (usa nvm o fnm)
nvm install 22
nvm use 22

# pnpm 10
corepack enable
corepack prepare pnpm@10.6.0 --activate

# Verifica
node -v   # v22.x
pnpm -v   # 10.6.x
```

### Clone e install

```bash
git clone git@github.com:<org>/pawmeet-app.git
cd pawmeet-app
pnpm install
```

### Variabili d'ambiente

```bash
cp apps/api/.env.example apps/api/.env
# Chiedi a Edson i valori per: DATABASE_URL, REDIS_*, JWT_SECRET, ecc.
```

### Avviare il dev server

```bash
pnpm dev              # Avvia tutto (API + web + admin)
pnpm --filter @pawmeet/api dev   # Solo API (porta 3000)
```

### Comandi utili

| Comando | Cosa fa |
|---------|---------|
| `pnpm dev` | Dev mode (tutti gli app) |
| `pnpm --filter @pawmeet/api dev` | Solo API |
| `pnpm --filter @pawmeet/api test` | Test API |
| `pnpm typecheck` | Type-check tutto |
| `pnpm lint:fix` | Lint + auto-fix (Biome) |
| `pnpm format` | Format (Biome) |

### Git hooks (Lefthook)

Sono già configurati. Al commit vengono eseguiti automaticamente:
- **pre-commit**: Biome lint+format sui file staged + typecheck
- **pre-push**: test

---

## 2. Mappa mentale: .NET → TypeScript/Hono

Se vieni da ASP.NET / C#, ecco le corrispondenze:

| Concetto .NET | Equivalente PawMeet | Dove lo trovi |
|---------------|---------------------|---------------|
| `Controller` | Route (Hono) o tRPC Router | `src/routes/` o `src/trpc/routers/` |
| `IService` / `IRepository` | Port (interface) | `src/ports/` |
| `ServiceImpl` / `RepositoryImpl` | Infra (class) | `src/infra/` |
| `Application Service` / `MediatR Handler` | Use Case (factory function) | `src/use-cases/` |
| `Program.cs` / `Startup.cs` | `src/index.ts` + `src/container.ts` | Entry point + DI |
| `DI Container` (Microsoft.Extensions.DI) | Container manuale (named exports) | `src/container.ts` |
| `Entity Framework` | Drizzle ORM | `packages/db/` |
| `SignalR` | WebSocket nativo (`ws`) | `src/ws/` |
| `Hangfire` / `Background Services` | BullMQ (job queue su Redis) | `src/jobs/` |
| `FluentValidation` | Zod schemas | `packages/validation/` |
| `ActionResult<T>` / `IActionResult` | `Result<T>` (success/fail) | `src/lib/result.ts` |
| `[Authorize]` attribute | `authMiddleware` / `protectedProcedure` | `src/middleware/auth.ts` |
| `appsettings.json` | `.env` + `packages/config/` | Env vars |
| NuGet packages | pnpm workspace packages | `packages/*` |

---

## 3. Architettura a strati

```
┌─────────────────────────────────────────────────┐
│  ROUTES / tRPC ROUTERS                          │  ← HTTP layer (Hono/tRPC)
│  Ricevono request, validano input, chiamano     │
│  use case, restituiscono response               │
├─────────────────────────────────────────────────┤
│  USE CASES                                      │  ← Business logic pura
│  Factory functions: createXxx(deps) => handler  │
│  Nessuna dipendenza da framework                │
│  Ritornano Result<T> (mai throw)                │
├─────────────────────────────────────────────────┤
│  PORTS (interfaces)                             │  ← Contratti
│  Repository interfaces, service interfaces      │
├─────────────────────────────────────────────────┤
│  INFRA (implementations)                        │  ← Dettagli tecnici
│  DrizzleXxxRepository, JwtAuthService, ecc.     │
│  BullMQ workers, Expo push, Resend email        │
└─────────────────────────────────────────────────┘
```

**Regola d'oro**: le dipendenze puntano solo verso l'interno. Uno use case non sa mai quale database usa — conosce solo l'interfaccia del repository.

---

## 4. Il flusso completo: dall'HTTP alla risposta

Prendiamo come esempio **"Segui un utente"**:

### 4.1 tRPC Router (`src/trpc/routers/follows.ts`)

```typescript
// Il router riceve la request, valida l'input con Zod, chiama lo use case
follow: protectedProcedure                          // ← come [Authorize]
  .input(followUserSchema)                          // ← come FluentValidation
  .mutation(async ({ ctx, input }) => {
    const result = await deps.followUser(ctx.userId, input.targetUserId);
    return unwrapResult(result);                    // ← Result<T> → data o TRPCError
  })
```

### 4.2 Use Case (`src/use-cases/follow-user.ts`)

```typescript
// Factory function che riceve le dipendenze (come constructor injection in .NET)
type Deps = {
  followRepo: FollowRepository;    // ← interfaccia, non implementazione
  userRepo: UserRepository;
  notificationService: NotificationService;
};

export function createFollowUser({ followRepo, userRepo, notificationService }: Deps) {
  return async (userId: string, targetUserId: string): Promise<Result<UserFollow>> => {
    // 1. Validazione business
    if (userId === targetUserId) {
      return fail(new AppError('SELF_FOLLOW', 'Non puoi seguire te stesso', 400));
    }

    // 2. Verifica che il target esista
    const target = await userRepo.findById(targetUserId);
    if (!target || !target.isActive) {
      return fail(new AppError('USER_NOT_FOUND', 'Utente non trovato', 404));
    }

    // 3. Verifica blocchi
    const blocked = await followRepo.isBlockedEitherWay(userId, targetUserId);
    if (blocked) {
      return fail(new AppError('USER_BLOCKED', 'Operazione non consentita', 403));
    }

    // 4. Idempotenza
    const alreadyFollowing = await followRepo.isFollowing(userId, targetUserId);
    if (alreadyFollowing) {
      return fail(new AppError('ALREADY_FOLLOWING', 'Stai già seguendo questo utente', 409));
    }

    // 5. Azione principale
    const follow = await followRepo.follow(userId, targetUserId);

    // 6. Side effects (fire-and-forget, non bloccanti)
    const follower = await userRepo.findById(userId);
    if (follower) {
      notificationService
        .send({ userId: targetUserId, title: 'Nuovo follower!', body: '...' })
        .catch((err) => logger.error('followUser', 'Notification failed', err));
    }

    return succeed(follow);
  };
}
```

### 4.3 Port / Interface (`src/ports/follow-repository.ts`)

```typescript
// Come un'interfaccia C# — definisce il contratto
export interface FollowRepository {
  follow(followerId: string, followingId: string): Promise<UserFollow>;
  unfollow(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  isBlockedEitherWay(userA: string, userB: string): Promise<boolean>;
  listFollowers(userId: string, query: PaginatedQuery): Promise<FollowSummary[]>;
  // ...
}
```

### 4.4 Infra / Implementation (`src/infra/drizzle-follow-repository.ts`)

```typescript
// Come un Repository EF Core — implementa l'interfaccia con Drizzle (il nostro "EF")
export class DrizzleFollowRepository implements FollowRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async follow(followerId: string, followingId: string): Promise<UserFollow> {
    const rows = await this.db.insert(userFollows)
      .values({ followerId, followingId })
      .returning();

    // Aggiorna contatori atomicamente
    await Promise.all([
      this.db.update(users)
        .set({ followingCount: sql`${users.followingCount} + 1` })
        .where(eq(users.id, followerId)),
      this.db.update(users)
        .set({ followersCount: sql`${users.followersCount} + 1` })
        .where(eq(users.id, followingId)),
    ]);

    return firstRow<UserFollow>(rows);
  }
}
```

### 4.5 DI Composition (`src/container.ts`)

```typescript
// Come Program.cs con builder.Services.AddScoped<IRepo, Repo>()
// Ma più esplicito: nessuna "magia" di reflection

const followRepo = new DrizzleFollowRepository(db);
const userRepo = new DrizzleUserRepository(db);
const notificationService = new BullMQNotificationService();

export const followDeps = {
  followUser: createFollowUser({ followRepo, userRepo, notificationService }),
  unfollowUser: createUnfollowUser({ followRepo }),
  listFollowers: createListFollowers({ followRepo }),
  // ...
};
```

---

## 5. Pattern chiave

### 5.1 Result<T> — mai throw

A differenza di .NET dove si usa spesso `throw new NotFoundException(...)`, qui ogni use case ritorna `Result<T>`:

```typescript
// Successo
return succeed(data);

// Errore
return fail(new AppError('CODE', 'Messaggio', httpStatus));
```

Il router converte il Result in response HTTP con `unwrapResult()` (tRPC) o `handleResult()` (REST).

**Perché?** Type safety — il compilatore ti obbliga a gestire entrambi i casi.

### 5.2 Factory function DI

In .NET faresti:

```csharp
public class FollowUserHandler {
    private readonly IFollowRepo _repo;
    public FollowUserHandler(IFollowRepo repo) => _repo = repo;
    public async Task<Result> Handle(Command cmd) { ... }
}
```

In PawMeet è uguale, ma con una funzione:

```typescript
export function createFollowUser({ followRepo }: Deps) {
  return async (userId: string, targetUserId: string): Promise<Result<UserFollow>> => {
    // ...
  };
}
```

Niente classi, niente decoratori, niente reflection. Stessi benefici (testabilità, inversione dipendenze), meno "magia".

### 5.3 Zod = FluentValidation

```typescript
// Definito in packages/validation/
export const followUserSchema = z.object({
  targetUserId: z.string().uuid(),
});

// Usato nel router (automatico con tRPC .input())
// O con @hono/zod-validator nelle REST routes
```

### 5.4 Drizzle ORM = Entity Framework (leggero)

```typescript
// SELECT * FROM users WHERE id = ?
await db.select().from(users).where(eq(users.id, userId));

// INSERT INTO users VALUES (...)
await db.insert(users).values({ name, email }).returning();

// UPDATE users SET name = ? WHERE id = ?
await db.update(users).set({ name }).where(eq(users.id, userId));

// JOIN
await db.select()
  .from(userFollows)
  .innerJoin(users, eq(userFollows.followerId, users.id))
  .where(eq(userFollows.followingId, userId));
```

Schema definito in `packages/db/src/schema/` (come le Entity classes di EF).

---

## 6. WebSocket (chat) — come SignalR, ma manuale

```
src/ws/
├── chat.ts      ← Setup WebSocket server (come MapHub<ChatHub>())
├── auth.ts      ← Verifica JWT durante upgrade
├── handlers.ts  ← Gestisce messaggi in arrivo
└── registry.ts  ← Connessioni attive, rooms, online status
```

Concetti familiari da SignalR:
- **Connection** → `addConnection(userId, ws)` / `removeConnection(userId, ws)`
- **Groups** → `joinRoom(userId, roomId)` / `sendToRoom(roomId, message)`
- **Clients.User(id)** → `sendToUser(userId, message)`
- **OnConnectedAsync** → `wss.on('connection', ...)`

---

## 7. BullMQ (job asincroni) — come Hangfire

```
src/jobs/
├── queue.ts               ← Definizione code + enqueue helpers
├── workers.ts             ← Avvio workers
├── send-notification.ts   ← Worker esempio (push notifications)
├── photo-moderation.ts    ← Moderazione foto
├── gdpr-export.ts         ← Export dati GDPR
└── ...
```

Pattern:
```typescript
// Accodare un job (come BackgroundJob.Enqueue in Hangfire)
await enqueueNotification({ userId, title, body });

// Worker che processa (come IJobHandler)
new Worker('notifications', async (job) => {
  // logica di processing
}, { connection: redis, concurrency: 10 });
```

Job schedulati con cron (come RecurringJob.AddOrUpdate):
```typescript
await queue.upsertJobScheduler('hourly-story-cleanup', { pattern: '0 * * * *' }, { name: 'cleanup' });
```

---

## 8. Struttura file API

```
apps/api/src/
├── index.ts          ← Entry point (come Program.cs)
├── container.ts      ← DI composition root (come ConfigureServices)
├── routes/           ← REST controllers (legacy, in dismissione)
├── trpc/
│   ├── root.ts       ← Router aggregator
│   ├── trpc.ts       ← Context, procedures, error mapping
│   └── routers/      ← Domain routers (il modo principale)
├── use-cases/        ← Business logic pura (~200 file)
├── ports/            ← Interfaces (contratti)
├── infra/            ← Implementations (DB, servizi esterni)
├── jobs/             ← BullMQ workers e code
├── ws/               ← WebSocket chat
├── middleware/        ← Auth, CORS, rate limit
├── lib/              ← Utilities (result, jwt, db client)
└── test-utils/       ← Builder functions per test
```

---

## 9. Testing

```bash
pnpm --filter @pawmeet/api test          # Tutti i test API
pnpm --filter @pawmeet/api test -- --watch  # Watch mode
```

- **Framework**: Vitest (simile a xUnit/NUnit, ma per TS)
- **File**: colocati accanto al source (`follow-user.test.ts`)
- **Test data**: builder pattern (come AutoFixture/Bogus)
- **Mock delle deps**: passi oggetti mock nel factory function, niente DI magic

```typescript
// Esempio test
import { createFollowUser } from './follow-user';

const mockFollowRepo = {
  isBlockedEitherWay: vi.fn().mockResolvedValue(false),
  isFollowing: vi.fn().mockResolvedValue(false),
  follow: vi.fn().mockResolvedValue({ id: '1', followerId: 'a', followingId: 'b' }),
};

const followUser = createFollowUser({
  followRepo: mockFollowRepo,
  userRepo: mockUserRepo,
  notificationService: mockNotificationService,
});

it('should follow a user', async () => {
  const result = await followUser('user-1', 'user-2');
  expect(result.ok).toBe(true);
});
```

---

## 10. Workflow quotidiano

1. **Prendi una User Story** (issue su GitHub)
2. **Crea branch**: `git checkout -b feat/nome-feature`
3. **Implementa** seguendo il flusso: Port → Infra → Use Case → Router
4. **Testa**: `pnpm --filter @pawmeet/api test`
5. **Commit**: conventional commits (`feat:`, `fix:`, `refactor:`)
6. **Push + PR**: il CI verifica lint, typecheck, test

### Primo task suggerito

Per prendere confidenza con lo stack, prova a:
1. Leggere `src/use-cases/follow-user.ts` (esempio completo)
2. Leggere `src/trpc/routers/follows.ts` (come viene esposto)
3. Leggere `src/infra/drizzle-follow-repository.ts` (come parla col DB)
4. Creare un piccolo use case nuovo o modificare uno esistente

---

## 11. Setup AI (Claude Code)

### Installazione

```bash
# macOS
brew install claude-code

# Oppure via npm
npm install -g @anthropic-ai/claude-code
```

### Primo avvio

```bash
cd pawmeet-app
claude
```

Al primo avvio ti chiederà di autenticarti con il tuo account Anthropic.

### Comandi utili

| Comando | Cosa fa |
|---------|---------|
| `claude` | Avvia sessione interattiva |
| `/help` | Mostra tutti i comandi |
| `/commit` | Crea un commit (analizza i cambiamenti) |
| `Esc` | Cancella input corrente |
| `Ctrl+C` | Interrompi operazione in corso |

### Come usarlo per il backend

- **Esplorare codice**: "Spiegami come funziona il flusso di autenticazione"
- **Implementare**: "Crea un nuovo use case per [feature] seguendo il pattern di follow-user.ts"
- **Debug**: "Questo test fallisce con [errore], aiutami a capire perché"
- **Review**: "Controlla il mio codice in src/use-cases/nuovo-feature.ts"

Claude ha già il contesto del progetto (CLAUDE.md) e conosce le convenzioni.

---

## 12. Team di agenti AI

Il progetto usa agenti AI specializzati che simulano un team reale. Ogni agente ha un ruolo, un background e una prospettiva specifica. Sono organizzati per categoria in `.claude/agents/` e puoi invocarli direttamente da Claude Code.

```
.claude/agents/
├── leadership/
│   └── cto.md                  ← Marco Ferretti — CTO
├── architects/
│   ├── backend.md              ← Luca Bianchi — Backend Architect
│   ├── frontend.md             ← Davide Russo — Frontend Architect
│   └── mobile.md               ← Sara Conti — Mobile Architect
├── management/
│   ├── pm.md                   ← Alessia Marchetti — Project Manager
│   ├── po.md                   ← Federico Galli — Product Owner
│   └── finance.md              ← Roberto Ferrara — Finance Advisor
├── creative/
│   ├── copywriter-app.md       ← Chiara Lombardi — UX Copy (in-app, italiano)
│   ├── copywriter-marketing.md ← Valentina Rizzo — Marketing Copy (landing, email, ASO)
│   └── copywriter-brand.md     ← Alessandro Ferretti — Brand Voice & Naming
├── design/
│   ├── product-designer.md     ← Martina Colombo — Product Designer (scuola Jony Ive)
│   ├── ui-engineer.md          ← Liam Chen — UI Engineer (scuola Evil Rabbit)
│   └── systems-designer.md     ← Giulia Neri — Design Systems Lead (scuola Dieter Rams)
├── marketing/
│   └── seo-specialist.md       ← Lorenzo Vitale — SEO & ASO
├── audit/
│   ├── data-engineer.md        ← Elena Ricci — Data Engineer
│   ├── data-privacy.md         ← Giulia Fontana — GDPR Specialist
│   └── data-security.md        ← Davide Moretti — Security Engineer
└── specialists/
    ├── analytics-engineer.md   ← Sara Conti — Analytics Engineer
    └── legal-advisor.md        ← Marco Bianchi — Legal Advisor
```

### Come funziona il workflow

```
1. User Story (issue GitHub)
2. Analisi da parte del team specialista (agenti in parallelo)
3. Plan mode (Claude crea un piano, tu approvi)
4. Implementazione (l'agente scrive codice)
5. Code review (un altro agente revisiona)
```

### Agenti rilevanti per il backend

Questi sono gli agenti che userai più spesso:

#### Luca Bianchi — Backend Architect (`architect-backend`)

Il tuo principale alleato. 10+ anni su sistemi distribuiti, Node.js, PostgreSQL, Redis, auth.

**Prospettiva**: security-first, API design purist, database-aware, observability-focused.

**Quando usarlo**:
- Review di nuovi use case, route, repository
- Decisioni su error handling, idempotenza, rate limiting
- Ottimizzazione query, indici, data modeling
- Scalabilità (code, cache, background job)

**Come invocarlo**:
```
claude --agent architects/backend

# Oppure da dentro una sessione Claude Code:
"Chiedi al backend architect di fare review di src/use-cases/nuovo-feature.ts"
```

#### Marco Ferretti — CTO (`cto`)

15+ anni di startup mobile-first. Pragmatico, budget-conscious.

**Quando usarlo**:
- Trade-off tecnici (build vs buy, complessità vs time-to-market)
- Quando due soluzioni sembrano equivalenti e serve un tie-breaker
- Valutazione impatto business di una scelta tecnica

#### Elena Ricci — Data Engineer (`audit-data-engineer`)

12+ anni in data platform, PostgreSQL, PostGIS, Drizzle ORM.

**Quando usarlo**:
- Review schema DB e migrazioni
- Ottimizzazione query (N+1, indici mancanti, full table scan)
- Pattern di caching e invalidazione
- Tutto ciò che riguarda PostGIS e dati geospaziali

#### Davide Moretti — Data Security (`audit-data-security`)

10+ anni in application security, OSCP/CISSP.

**Quando usarlo**:
- Audit sicurezza su nuove feature (JWT, input validation, rate limiting)
- Review di endpoint che gestiscono dati sensibili
- Verifica OWASP Top 10 su nuovo codice

#### Giulia Fontana — Data Privacy & GDPR (`audit-data-privacy`)

8+ anni in privacy engineering, CIPP/E.

**Quando usarlo**:
- Ogni volta che tocchi PII (email, nome, GPS, foto)
- Nuovi endpoint che espongono o raccolgono dati personali
- Verifica compliance GDPR su feature che processano dati utente

### Altri agenti (meno frequenti per il BE, ma utili)

| Agente | Ruolo | Quando |
|--------|-------|--------|
| `architects/frontend` (Davide Russo) | Frontend Architect | Se tocchi API che il frontend consuma |
| `architects/mobile` (Sara Conti) | Mobile Architect | Se tocchi API che il mobile consuma |
| `specialists/analytics-engineer` (Sara Conti) | Analytics Engineer | Quando aggiungi eventi analytics server-side |
| `specialists/legal-advisor` (Marco Bianchi) | Legal Advisor | Domande su GDPR, Codice del Consumo |

### Agent groups (audit in parallelo)

Per audit completi, lanciamo gruppi di agenti in parallelo. Il principale è:

**`audit-data`** — 4 agenti (Data Engineer + Data Security + Data Privacy + Data Architect) che analizzano tutto il data layer contemporaneamente. L'ultimo audit (2026-03-11) ha trovato 62 findings, report in `docs/audits/`.

I prompt completi degli agent group sono salvati in `.claude/projects/.../memory/agent-groups.md`.

### Esempi pratici

Ecco scenari reali che affronterai. Puoi copiare e incollare i prompt.

---

#### Scenario 1: "Non conosco questa parte del codice"

Sei davanti a un file e non capisci perché è stato scritto così.

```
claude

> Spiegami il flusso completo dell'autenticazione: dal login alla
> generazione del JWT, al refresh token, fino al middleware che protegge
> le route. Dimmi anche dove sono i file coinvolti.
```

```
claude

> Come funziona il matching tra cani? Parti dall'algoritmo in
> packages/utils/ e mostrami come viene chiamato dal use case
> fino alla route tRPC.
```

```
claude

> Spiegami il pattern Result<T> che usiamo negli use case.
> Vengo da .NET dove usavo throw + try/catch. Qual è la differenza
> e perché lo preferiamo?
```

---

#### Scenario 2: Implementare una nuova feature (end-to-end)

Ti viene assegnata la US: _"Come utente, voglio segnalare un profilo inappropriato"_.

**Step 1 — Chiedi al backend architect di progettare la soluzione:**
```
claude --agent architects/backend

> Devo implementare "Segnala profilo". L'utente può segnalare un altro
> utente con un motivo (spam, comportamento, foto inappropriata).
>
> Progettami la soluzione completa:
> - Schema DB (nuova tabella? quali campi?)
> - Port/Interface del repository
> - Use case con le regole business (es. non segnalare se stessi,
>   max 1 segnalazione per coppia, ecc.)
> - Route tRPC
> - Serve un job BullMQ per notificare gli admin?
>
> Segui i pattern esistenti (vedi follow-user.ts come riferimento).
```

**Step 2 — Implementa con Claude:**
```
claude

> Implementa la feature "Segnala profilo" secondo il piano del backend
> architect. Crea in ordine:
> 1. Schema Drizzle in packages/db/src/schema/
> 2. Zod schema in packages/validation/
> 3. Port in src/ports/report-repository.ts
> 4. Infra in src/infra/drizzle-report-repository.ts
> 5. Use case in src/use-cases/report-user.ts
> 6. Router tRPC in src/trpc/routers/reports.ts
> 7. Registra tutto in container.ts
> 8. Aggiungi i test
```

**Step 3 — Security review:**
```
claude --agent audit/data-security

> Review completa di src/use-cases/report-user.ts e
> src/trpc/routers/reports.ts.
> Controlla: rate limiting sulle segnalazioni, che il segnalante
> non possa vedere lo stato della segnalazione di altri utenti,
> che non ci siano data leak nella response.
```

**Step 4 — GDPR check (se tocchi dati personali):**
```
claude --agent audit/data-privacy

> Ho aggiunto una tabella user_reports con userId, reportedUserId,
> reason (testo libero), e timestamp. Il campo reason potrebbe
> contenere PII. Controlla compliance GDPR: retention, right to
> deletion, data minimization.
```

**Step 5 — Commit e PR:**
```
/commit
```

---

#### Scenario 3: Ottimizzare una query lenta

```
claude --agent audit/data-engineer

> La query listNearbyDogs in src/infra/drizzle-dog-repository.ts
> è lenta con molti utenti. Usa PostGIS ST_DWithin.
> Analizza: mancano indici GiST? La query è ottimale?
> Proponi miglioramenti con EXPLAIN ANALYZE in mente.
```

---

#### Scenario 4: Aggiungere un job asincrono

```
claude

> Devo creare un job BullMQ che ogni notte alle 02:00 cancella
> le segnalazioni risolte più vecchie di 90 giorni.
> Segui il pattern di src/jobs/send-notification.ts.
> Crea: queue, worker, scheduler cron, e registralo in workers.ts.
```

---

#### Scenario 5: Capire un errore

```
claude

> Questo test fallisce con "ALREADY_FOLLOWING" ma nel test non sto
> seguendo nessuno. Ecco l'errore:
> [incolla l'output del test]
> Aiutami a debuggare.
```

---

#### Scenario 6: Review del tuo codice prima della PR

```
claude --agent architects/backend

> Ho finito di implementare la feature report-user. Fai una review
> completa di questi file:
> - src/use-cases/report-user.ts
> - src/infra/drizzle-report-repository.ts
> - src/trpc/routers/reports.ts
>
> Controlla: pattern consistency, error handling, edge case,
> naming, e se ho dimenticato qualcosa.
```

---

#### Scenario 7: Lanciare un audit completo

Quando vuoi un'analisi profonda di tutto il data layer (come un pentest interno):

```
claude

> Lancia l'audit-data: fai partire in parallelo data-engineer,
> data-security e data-privacy su tutto il codebase dell'API.
> Salva il report in docs/audits/.
```

---

#### Scenario 8: Chiedere a più agenti la stessa cosa (team review)

Quando una decisione architetturale è importante, chiedi a più figure:

```
claude

> Devo decidere se usare WebSocket o Server-Sent Events per le
> notifiche real-time (non la chat, solo notifiche).
>
> Chiedi in parallelo al backend architect, al mobile architect,
> e al CTO. Ognuno dia la sua prospettiva basata sul suo ruolo.
> Poi sintetizza le risposte e dimmi la raccomandazione finale.
```

---

#### Scenario 9: Non sai da dove iniziare

Il prompt più potente quando sei persa:

```
claude

> Sono nuova sul progetto, vengo da .NET.
> Mi è stata assegnata questa issue: [incolla titolo + descrizione].
> Guidami step by step: quali file devo leggere per capire il
> contesto, quali pattern seguire, e in che ordine implementare.
```

---

### Regola d'oro

**Non devi ricordare tutto a memoria.** Gli agenti conoscono già:
- L'architettura del progetto (leggono CLAUDE.md)
- Le convenzioni (Result<T>, factory DI, Biome, ecc.)
- Lo storico delle decisioni (docs/)

Tu devi solo sapere **a chi chiedere** e **cosa chiedere**. Il resto lo fanno loro.

---

## Riferimenti rapidi

| Cosa cerchi | Dove guardare |
|-------------|---------------|
| Schema DB | `packages/db/src/schema/` |
| Tipi condivisi | `packages/types/src/` |
| Validazione Zod | `packages/validation/src/` |
| Costanti/limiti | `packages/config/src/` |
| Matching algorithm | `packages/utils/src/matching/` |
| Env vars necessarie | `apps/api/.env.example` |
| Docs architettura | `docs/09-consolidated-architecture.md` |
| Docs API dettagliate | `docs/03-architecture.md` |
