# DogWalk — Best Practices & Architecture Guide

> Reference document for all developers. Describes the target architecture, current gaps, and concrete patterns to follow.

## Table of Contents

1. [Architecture Audit — Current State](#1-architecture-audit--current-state)
2. [Target Architecture](#2-target-architecture)
3. [API Layer Patterns](#3-api-layer-patterns)
4. [Domain Layer Patterns](#4-domain-layer-patterns)
5. [Infrastructure Layer Patterns](#5-infrastructure-layer-patterns)
6. [Mobile App Patterns](#6-mobile-app-patterns)
7. [Shared Packages Patterns](#7-shared-packages-patterns)
8. [Testing Patterns](#8-testing-patterns)
9. [SOLID Checklist](#9-solid-checklist)
10. [Migration Roadmap](#10-migration-roadmap)
11. [Security Checklist](#11-security-checklist)

---

## 1. Architecture Audit — Current State

### What works well

| Area | Status | Notes |
|------|--------|-------|
| `packages/utils/matching.ts` | Pure domain logic, no infra deps | Model to follow |
| `packages/validation/` | Shared Zod schemas across apps | Good boundary enforcement |
| `packages/types/` | Shared interfaces | Clean contract layer |
| `lib/jwt.ts`, `lib/password.ts` | Single-responsibility modules | Good separation |
| `middleware/auth.ts` | Thin middleware, delegates to jwt lib | Clean |
| `ws/chat.ts` | `as const` pattern for events | Per conventions |
| Mobile `ApiClient` | Encapsulates HTTP + token refresh | Good abstraction |
| Mobile Zustand stores | Minimal, focused state slices | Clean |

### Problems found

#### P1 — No layered architecture in API (Clean Architecture violation)

Route handlers directly contain business logic + DB queries + response formatting:

```typescript
// CURRENT: auth.ts — route handler does EVERYTHING
.post('/register', zValidator('json', registerSchema), async (c) => {
  // 1. DB query (infrastructure)
  const existing = await db.select(...).from(users).where(...);
  // 2. Business rule (domain)
  if (existing.length > 0) return c.json({ error: '...' }, 409);
  // 3. Password hashing (infrastructure)
  const passwordHash = await hashPassword(password);
  // 4. DB insert (infrastructure)
  const rows = await db.insert(users).values({...}).returning();
  // 5. Token generation (infrastructure)
  const token = generateToken();
  // 6. Email sending (infrastructure)
  sendVerificationEmail(email, token);
  // 7. JWT generation (infrastructure)
  const { accessToken, refreshToken } = await generateTokenPair(user.id);
  // 8. DB insert refresh token (infrastructure)
  await db.insert(refreshTokens).values({...});
  // 9. Response formatting (adapter)
  return c.json({ user: sanitizeUser(user), accessToken, refreshToken }, 201);
});
```

**Impact**: untestable business logic, impossible to reuse logic (e.g., admin creates user), high coupling.

#### P2 — No repository pattern (Dependency Inversion violation)

Routes import `db` directly and build Drizzle queries inline. Changing the DB or adding caching requires editing every route.

```typescript
// CURRENT: dogs.ts — Drizzle queries scattered across 15+ locations
const dogs = await db.select().from(dogProfiles).where(...);
```

#### P3 — No dependency injection

All dependencies are imported as singletons. Makes testing require mocking entire modules.

```typescript
// CURRENT: hardcoded imports, no injection
import { db } from '../lib/db.js';
import { generateTokenPair } from '../lib/jwt.js';
```

#### P4 — Business rules hidden in route handlers

Rules like "max N dogs per user", "user must own the dog", "token must not be expired" are embedded in route handlers instead of being explicit domain operations.

#### P5 — Duplicated logic

- `hashRefreshToken` in `auth.ts` duplicates `hashToken` in `email.ts` (same SHA-256 logic)
- `sanitizeUser` defined locally instead of being a shared utility
- Token expiry `7 * 24 * 60 * 60 * 1000` hardcoded in 3 places

#### P6 — Mobile hooks mix API calls with state management

```typescript
// CURRENT: useMatching.ts — fetch, state, and business logic all in one hook
const swipeRight = useCallback(async (dogId: string) => {
  const result = await api.post<MatchResponse>('/matches/like', { dogId });
  if (result.matched) setNewMatch(result);
  advanceCard();
}, [advanceCard]);
```

---

## 2. Target Architecture

```
Route handler (adapter)       →  thin: validate, call use case, format response
    ↓
Use case (application)        →  orchestrates domain + infra, contains business flow
    ↓
Domain (entities/value objects) →  pure logic, no deps on infra
    ↓
Repository / Service (ports)  →  interfaces only
    ↓
Repository impl (infra)       →  Drizzle, Resend, S3, etc.
```

Dependencies always point **inward**: routes → use cases → domain. Never domain → routes.

---

## 3. API Layer Patterns

### 3.1 Route handlers — thin adapters

Route handlers should ONLY: parse input, call a use case, format the response.

```typescript
// TARGET: routes/auth.ts
export function authRoutes(deps: AuthDeps) {
  return new Hono()
    .post('/register', zValidator('json', registerSchema), async (c) => {
      const input = c.req.valid('json');
      const result = await deps.registerUser(input);

      if (!result.ok) {
        return c.json({ error: result.error }, result.status);
      }

      return c.json(result.data, 201);
    });
}
```

### 3.2 Use cases — application logic

One file per use case. Receives dependencies via constructor/factory. Returns a result, never throws for business errors.

```typescript
// TARGET: use-cases/register-user.ts
import type { UserRepository } from '../ports/user-repository.js';
import type { EmailService } from '../ports/email-service.js';
import type { TokenService } from '../ports/token-service.js';

interface RegisterUserDeps {
  userRepo: UserRepository;
  emailService: EmailService;
  tokenService: TokenService;
}

export function createRegisterUser(deps: RegisterUserDeps) {
  return async (input: RegisterInput): Promise<Result<RegisterOutput>> => {
    const existing = await deps.userRepo.findByEmail(input.email);
    if (existing) {
      return fail(new AppError('AUTH_EMAIL_TAKEN', 'Email già registrata', 409));
    }

    const user = await deps.userRepo.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash: await deps.tokenService.hashPassword(input.password),
    });

    await deps.emailService.sendVerification(user.email);
    const tokens = await deps.tokenService.generatePair(user.id);

    return succeed({ user: sanitizeUser(user), ...tokens });
  };
}
```

### 3.3 Result type — no throwing for business errors

```typescript
// packages/types/src/result.ts
import { AppError } from './result';

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

// Helper constructors
export function succeed<T>(data: T): Result<T>;
export function fail<T = never>(error: AppError): Result<T>;

// Type guards
export function isSuccess<T>(result: Result<T>): result is { success: true; data: T };
export function isFailure<T>(result: Result<T>): result is { success: false; error: AppError };
```

### 3.4 Ports — interfaces for infrastructure

```typescript
// TARGET: ports/user-repository.ts
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  softDelete(id: string): Promise<void>;
}
```

### 3.5 Dependency wiring — at app startup

```typescript
// TARGET: index.ts (composition root)
const userRepo = new DrizzleUserRepository(db);
const emailService = new ResendEmailService();
const tokenService = new JwtTokenService();

const registerUser = createRegisterUser({ userRepo, emailService, tokenService });
const app = new Hono()
  .route('/auth', authRoutes({ registerUser, loginUser, ... }))
  .route('/dogs', dogRoutes({ ... }));
```

---

## 4. Domain Layer Patterns

### 4.1 Domain logic lives in `packages/utils/`

`matching.ts` is the model to follow: pure functions, no imports from infrastructure, fully testable.

```typescript
// GOOD — packages/utils/src/matching.ts
export function calculateSizeScore(a: DogSize, b: DogSize): number {
  return SIZE_MATRIX[a][b];
}
```

### 4.2 Business rules as explicit functions

Extract rules from route handlers into named, testable functions.

```typescript
// packages/utils/src/rules.ts
export function canAddDog(currentCount: number, maxAllowed: number): boolean {
  return currentCount < maxAllowed;
}

export function isTokenValid(token: { expiresAt: Date; usedAt: Date | null }): boolean {
  return token.usedAt === null && token.expiresAt > new Date();
}
```

### 4.3 Constants — single source of truth

```typescript
// packages/config/src/auth.ts
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ACCESS_TOKEN_EXPIRY = '15m';
```

Never hardcode magic numbers in route handlers.

### 4.4 Const objects over enums (existing convention)

```typescript
// GOOD — already followed in ws/chat.ts
export const WS_EVENT = {
  NEW_MESSAGE: 'new_message',
  TYPING_START: 'typing_start',
} as const;

export type WsEvent = (typeof WS_EVENT)[keyof typeof WS_EVENT];
```

---

## 5. Infrastructure Layer Patterns

### 5.1 Repository implementations

```typescript
// TARGET: infra/drizzle-user-repository.ts
import type { UserRepository } from '../ports/user-repository.js';

export class DrizzleUserRepository implements UserRepository {
  constructor(private db: DrizzleDB) {}

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async create(input: CreateUserInput) {
    const [user] = await this.db.insert(users).values(input).returning();
    return user!;
  }
}
```

### 5.2 External service wrappers

Each external service (Resend, R2, etc.) gets an interface (port) and an implementation.

```typescript
// ports/email-service.ts
export interface EmailService {
  sendVerification(email: string): Promise<void>;
  sendPasswordReset(email: string, token: string): Promise<void>;
}

// infra/resend-email-service.ts
export class ResendEmailService implements EmailService { ... }
```

### 5.3 Avoid lazy singletons for testability

Current pattern:
```typescript
// AVOID: hard to test, hidden state
let _resend: Resend | null = null;
function getResend(): Resend { ... }
```

Target pattern:
```typescript
// PREFER: explicit construction, injectable
export class ResendEmailService implements EmailService {
  constructor(private client: Resend) {}
}
```

---

## 6. Mobile App Patterns

### 6.1 Stores — pure state, no API calls

Zustand stores should only hold state and synchronous mutations. Already mostly correct.

```typescript
// GOOD — stores/auth.ts (current)
login: (user, token, refreshToken) => set({ user, token, refreshToken, isAuthenticated: true });
```

### 6.2 Repository pattern — abstract data access

Hooks/view-models **never** call tRPC or REST directly. All data access goes through repository interfaces provided via React Context.

```typescript
// repositories/interfaces/dog-repository.ts — depends ONLY on @pawmeet/types
import type { DogProfile } from '@pawmeet/types';
import type { Serialized } from '@pawmeet/types';

export interface DogRepository {
  listByOwner(userId: string): Promise<Serialized<DogProfile>[]>;
  getById(id: string): Promise<Serialized<DogProfile>>;
}

// repositories/remote/trpc-dog-repository.ts — the ONLY place that knows tRPC
export function createTrpcDogRepository(api: TrpcClient): DogRepository {
  return {
    listByOwner: (userId) => api.dogs.listByOwner.query({ userId }),
    getById: (id) => api.dogs.getDog.query({ id }),
  };
}

// hooks/useDogs.ts — depends on interface, NOT on transport
export function useDogs(dogRepo: DogRepository) {
  // calls dogRepo.listByOwner(), never api.dogs.*
}
```

**Why**: enables offline-first (swap remote → composite implementation), testability (mock repository), and transport independence (swap tRPC → REST without touching hooks).

### 6.3 Hooks — separate data fetching from state logic

For complex flows, split into:
- **Repository** (interface): data access, injected via Context
- **Hook/ViewModel**: orchestrate repository + store + navigation

```typescript
// hooks/useAuth.ts — orchestration, uses repository
export function useAuth(authRepo: AuthRepository) {
  const store = useAuthStore();
  const login = async (email: string, password: string) => {
    const result = await authRepo.login({ email, password });
    store.setUser(result.user);
  };
}
```

### 6.4 Error handling — never silently swallow

```typescript
// AVOID
} catch {
  // Silently fail
}

// PREFER
} catch (error) {
  console.error('[useMatching] swipeRight failed:', error);
  // Optionally: show toast, report to Sentry
}
```

### 6.5 Types — use shared types from `@pawmeet/types`

Don't redefine interfaces locally when they exist in the shared package. Use `Serialized<T>` for types that go through API serialization (Date → string).

```typescript
// AVOID: duplicating types in hooks
export interface MatchSuggestion { id: string; ... }

// AVOID: depending on RouterOutput in hooks/view-models
import type { RouterOutput } from '@pawmeet/api-client';

// PREFER: import from shared package + Serialized utility
import type { MatchSuggestion } from '@pawmeet/types';
import type { Serialized } from '@pawmeet/types';
type SerializedMatch = Serialized<MatchSuggestion>;
```

---

## 7. Shared Packages Patterns

### 7.1 Package responsibilities

| Package | Contains | Must NOT contain |
|---------|----------|-----------------|
| `types` | Interfaces, type unions, const objects | Logic, imports from other packages |
| `validation` | Zod schemas | Business logic, DB references |
| `utils` | Pure functions (matching, geo, formatters) | Infrastructure, side effects |
| `config` | Constants, limits, feature flags | Logic |
| `db` | Drizzle schema, migrations | Business logic, HTTP concepts |

### 7.2 Dependency direction

```
types ← validation ← utils ← config
  ↑                     ↑
  db                  api/mobile
```

`types` has zero internal dependencies. Other packages can depend on `types` but never the reverse.

---

## 8. Testing Patterns

### 8.1 Builder pattern for test data (existing convention)

```typescript
// GOOD — already documented in CLAUDE.md
function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr_1',
    email: 'test@example.com',
    displayName: 'Test User',
    ...overrides,
  };
}
```

### 8.2 Test use cases in isolation

With the use case pattern, testing becomes trivial — inject fakes:

```typescript
it('should reject duplicate emails', async () => {
  const userRepo = { findByEmail: async () => buildUser() } as UserRepository;
  const register = createRegisterUser({ userRepo, emailService: fakeEmail, tokenService: fakeToken });

  const result = await register({ email: 'existing@test.com', ... });

  expect(result.ok).toBe(false);
  expect(result.error).toBe('Email già registrata');
});
```

### 8.3 Test domain logic directly

```typescript
// GOOD — already done in packages/utils
it('should return 0 for toy-gigante pairing', () => {
  expect(calculateSizeScore('toy', 'gigante')).toBe(0);
});
```

### 8.4 Don't test framework glue

Route handlers that just call a use case and format the response don't need extensive tests. Test the use case instead. Only test routes for integration (HTTP status codes, headers, auth).

---

## 9. SOLID Checklist

Use this checklist before merging new code:

### Single Responsibility
- [ ] Each file/module has ONE reason to change
- [ ] Route handlers only parse input, call use case, format response
- [ ] Use cases only orchestrate domain + infrastructure calls
- [ ] No file exceeds ~150 lines (split if larger)

### Open/Closed
- [ ] New features added via new use cases/modules, not by modifying existing ones
- [ ] Matching algorithm weights configurable without code changes
- [ ] Auth providers added via strategy pattern, not `if/else` chains

### Liskov Substitution
- [ ] All implementations honor their interface contract
- [ ] Swapping `DrizzleUserRepository` for `InMemoryUserRepository` changes nothing for the use case

### Interface Segregation
- [ ] Interfaces are small and focused (e.g., `UserReader` vs `UserWriter` if needed)
- [ ] Consumers don't depend on methods they don't use

### Dependency Inversion
- [ ] High-level modules (use cases) depend on abstractions (ports), not concrete implementations
- [ ] Infrastructure is injected, never imported directly in use cases
- [ ] `db`, `Resend`, `S3` client never appear in use case files

---

## 10. Migration Roadmap

Refactor incrementally. Each step is independently shippable.

### Phase 1 — Quick wins (no architecture change)
1. Extract `hashRefreshToken` duplication → reuse `hashToken` from `email.ts`
2. Extract `sanitizeUser` to `packages/utils`
3. Move magic numbers (token expiry, etc.) to `packages/config`
4. Add error logging in mobile `catch` blocks

### Phase 2 — Repository layer
1. Define port interfaces in `apps/api/src/ports/`
2. Create Drizzle implementations in `apps/api/src/infra/`
3. Migrate routes one-by-one to use repositories instead of direct `db` calls

### Phase 3 — Use case layer
1. Extract use cases from route handlers into `apps/api/src/use-cases/`
2. Wire dependencies in composition root (`index.ts`)
3. Add unit tests for use cases with fake repositories

### Phase 4 — Mobile layer separation
1. Create `hooks/api/` directory for pure data-fetching hooks
2. Refactor orchestration hooks to use API hooks
3. Deduplicate types with `@pawmeet/types`

---

---

## 11. Security Checklist

> These rules exist because we found real vulnerabilities in audits. Every rule maps to a past incident. **Do not skip them.**

### 11.1 Secrets & Environment Variables

- **NEVER** commit `.env` files. Use `.env.example` with empty values only.
- **NEVER** use fallback defaults for secrets: `process.env.SECRET || 'dev-secret'` is a critical vulnerability. Use `requireEnv()` or throw.
- Use lazy initialization for secret-dependent modules so tests don't crash at import time:

```typescript
// GOOD — lazy init, crashes at first use, not at import
let _secret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (!_secret) _secret = requireEnv('JWT_SECRET');
  return _secret;
}

// BAD — crashes at import, breaks all tests that import this module
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');
```

- Rotate secrets immediately if exposed. Use `git filter-repo` to remove from history.

### 11.2 Authentication & Authorization

- **Always use `ctx.userId`** in tRPC procedures. Never trust a `userId` from client input:

```typescript
// BAD — IDOR vulnerability, client can pass any userId
.query(async ({ input }) => deps.listAchievements(input.userId))

// GOOD — userId comes from the verified JWT
.query(async ({ ctx }) => deps.listAchievements(ctx.userId))
```

- **Admin auth must require `ADMIN_EMAILS`** — throw `INTERNAL_SERVER_ERROR` if env var is missing, never fall through with an empty list.
- **Unified error messages** for auth — always return `"Credenziali non valide"` regardless of whether the account exists, is inactive, or the password is wrong. This prevents email enumeration.
- **Refresh token rotation** — always revoke old token before issuing new pair.

### 11.3 Rate Limiting

Every endpoint category must have rate limiting:

| Category | Limit | Middleware |
|----------|-------|-----------|
| Auth (login, register, forgot-password) | 10 req / 15 min | `authRateLimitMiddleware` |
| General API (`/api/*`, `/trpc/*`) | 100 req / 1 min | `rateLimitMiddleware` |
| Sensitive ops (uploads, messages) | 30 req / 1 min | `sensitiveRateLimitMiddleware` |
| WebSocket messages | 60 msg / 1 min | In-memory per-user bucket |

New endpoints must declare their rate limit tier. When adding a new route:
1. Decide: is it auth, general, or sensitive?
2. Apply the corresponding middleware.

### 11.4 Input Validation & Sanitization

- **All routes** must use `zValidator` (REST) or `.input(zodSchema)` (tRPC). No `c.req.json<T>()` without validation.
- **Strip HTML from user-generated text** (messages, bios, comments) before storage:

```typescript
function sanitizeContent(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}
```

- **Validate coordinate bounds** for geolocation input: lat `[-90, 90]`, lng `[-180, 180]`.
- **Anti-teleport check**: compute haversine distance and reject updates exceeding 500 km/h.

### 11.5 WebSocket Security

- **Never pass tokens as query parameters**. Use `Sec-WebSocket-Protocol` header:

```typescript
// Client (mobile)
const ws = new WebSocket(url, [`access_token.${token}`]);

// Server extracts from Sec-WebSocket-Protocol header
const tokenProtocol = protocols.find(p => p.startsWith('access_token.'));
```

- **Rate limit WebSocket messages** per user (in-memory bucket, 60 msg/min).
- **Enforce WSS** in production — never allow `ws://` in production configs.

### 11.6 CORS & Headers

- **Environment-aware CORS**: localhost origins only in development, production domains only in production.
- **Never include staging/preview URLs** (e.g., `*.vercel.app`) in production CORS.
- **Security headers** on all responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security` (production only)

### 11.7 Error Handling

- **Never expose internal error details** to clients. Return generic messages with a correlation `errorId`:

```typescript
// GOOD
return c.json({ error: 'Dati non validi', errorId }, 400);

// BAD — reveals schema structure to attacker
return c.json({ error: 'Dati non validi', details: err.message }, 400);
```

- Log full error details server-side with the `errorId` for debugging.

### 11.8 Data Access & IDOR Prevention

- **Ownership checks** on every mutation that modifies a resource: verify `resource.ownerId === ctx.userId` or equivalent.
- **Soft-delete checks** must be consistent: if `findByOwner()` filters by `isActive`, then `findById()` should too.
- **Limit query results**: use pagination with max page sizes (e.g., `.max(100)`).
- **Race conditions**: use DB transactions or constraints for limits (e.g., max dogs per user). A count-then-insert pattern is vulnerable to concurrent requests.

### 11.9 Mobile Client Security

- **Token storage**: refresh tokens in `SecureStore` (encrypted), never in MMKV or plain AsyncStorage.
- **Cache TTL**: cached data (conversations, messages) must expire. Clear sensitive caches on logout.
- **Certificate pinning**: required before production launch.
- **Enforce HTTPS/WSS**: validate URLs at startup, reject insecure schemes in production.

### 11.10 Pre-merge Security Checklist

Use this before merging any PR:

- [ ] No hardcoded secrets, API keys, or tokens in code
- [ ] All user input validated with Zod (server-side, at minimum)
- [ ] User-generated text sanitized (HTML stripped)
- [ ] Ownership/authorization checks on all mutations
- [ ] `ctx.userId` used instead of client-provided `userId`
- [ ] Rate limiting applied to new endpoints
- [ ] Error responses don't leak internal details
- [ ] New WebSocket handlers have rate limiting
- [ ] No `.env` files or secrets in the diff

---

> This document should be updated as the architecture evolves. When in doubt, look at `packages/utils/matching.ts` — it's the gold standard for clean, testable, dependency-free domain logic.
