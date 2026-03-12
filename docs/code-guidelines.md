# PawMeet Code Guidelines & Review Standards

Authoritative reference for writing and reviewing code in the PawMeet monorepo. All contributors must follow these standards.

---

## 1. Code Style

### TypeScript

- **Strict mode** everywhere. No `// @ts-ignore` or `// @ts-expect-error` without a linked issue.
- Use `type` keyword for type-only imports (enforced by Biome `useImportType: error`).
- Prefer `as const` objects + derived union types over `enum` (see [Section 10](#10-common-anti-patterns)).
- Avoid `any` — use `unknown` and narrow with type guards. Biome warns on `noExplicitAny`.
- Minimize non-null assertions (`!`). Biome warns on `noNonNullAssertion`.

### Naming

| Element | Convention | Example |
|---|---|---|
| Files (components) | `kebab-case.tsx` | `dog-card.tsx` |
| Files (utils/logic) | `kebab-case.ts` | `match-algorithm.ts` |
| Files (tests) | `*.test.ts` / `*.test.tsx` | `dog-card.test.tsx` |
| Variables & functions | `camelCase` | `calculateMatchScore` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_WALK_DISTANCE` |
| Types & interfaces | `PascalCase` | `WalkSession`, `DogProfile` |
| React components | `PascalCase` | `DogCard`, `WalkMapView` |
| Const objects (replacing enums) | `PascalCase` | `UserRole`, `WalkStatus` |

### Import Ordering

Biome handles import organization automatically (`organizeImports: on`). The expected order:

1. Built-in/Node modules (`node:fs`, `node:path`)
2. External packages (`react`, `hono`, `drizzle-orm`)
3. Internal packages (`@pawmeet/types`, `@pawmeet/validation`)
4. Relative imports (`./components`, `../hooks`)

```typescript
import { useState } from 'react';
import { z } from 'zod';
import type { DogProfile } from '@pawmeet/types';
import { spacing } from '@pawmeet/design-tokens';
import { DogCard } from './dog-card';
```

### Type-Only Imports

Always separate type imports from value imports. This is enforced at `error` level.

```typescript
// Correct
import type { DogProfile, WalkSession } from '@pawmeet/types';
import { formatDistance } from '@pawmeet/utils';

// Wrong — will fail lint
import { DogProfile, formatDistance } from '@pawmeet/types';
```

---

## 2. Architecture

### Clean Architecture Layers

```
domain/          → Entities, value objects, domain logic (no dependencies)
  use-cases/     → Application logic, orchestrates domain objects
adapters/        → API routes, DB repositories, external services
  routes/        → tRPC routers, Hono routes
  repositories/  → Drizzle queries implementing repository interfaces
  services/      → External integrations (Resend, R2, Sentry)
```

**Dependency rule**: dependencies point inward only. Domain never imports from adapters. Use-cases never import from routes.

### Repository Pattern (Frontend)

Hooks and view-models never call tRPC/REST directly. All data access goes through repository interfaces injected via React Context.

```typescript
// Define the interface (domain layer)
interface DogRepository {
  getById(id: string): Promise<DogProfile>;
  getByOwner(ownerId: string): Promise<DogProfile[]>;
  save(dog: DogProfile): Promise<void>;
}

// Implementations
repositories/
  remote/       → tRPC calls
  local/        → SQLite (mobile offline)
  composite/    → Offline-first (reads local, syncs remote)
```

### SOLID

- **Single Responsibility**: one module, one reason to change. A tRPC router handles HTTP; a use-case handles business logic; a repository handles data access.
- **Open/Closed**: extend behavior through composition, not modification.
- **Liskov Substitution**: any repository implementation must be swappable without breaking consumers.
- **Interface Segregation**: keep interfaces small and focused (`WalkRepository` and `DogRepository`, not `AppRepository`).
- **Dependency Inversion**: depend on abstractions (interfaces), not concretions (tRPC client).

---

## 3. Component Guidelines

### Structure

```typescript
// 1. Imports (types first)
import type { DogProfile } from '@pawmeet/types';
import { View, Text } from 'react-native';
import { spacing, lightColors } from '@pawmeet/design-tokens';

// 2. Props interface — named <ComponentName>Props
interface DogCardProps {
  dog: DogProfile;
  onPress: (id: string) => void;
  variant?: 'compact' | 'full';
}

// 3. Component — named export (no default exports)
export function DogCard({ dog, onPress, variant = 'full' }: DogCardProps) {
  // hooks first
  // derived state
  // handlers
  // render
}
```

### Rules

- **Named exports only**. No `export default`.
- Props interface is always named `<ComponentName>Props` and declared above the component.
- Destructure props in the function signature.
- Extract complex logic into custom hooks (`use-*.ts`).
- Keep components under ~150 lines. Split into subcomponents if larger.
- UI text is in **Italian** (`it-IT`). Code, comments, and variable names are in **English**.

### Hooks

- Custom hooks live in a `hooks/` directory or colocated with their component.
- File naming: `use-dog-profile.ts` (kebab-case with `use-` prefix).
- Always return a well-typed object or tuple. Avoid returning raw query results.

---

## 4. Design Tokens

All visual values come from `@pawmeet/design-tokens`. Never hardcode colors, spacing, typography, radii, or shadows.

### Available Tokens

| Token | Import | Values |
|---|---|---|
| Colors | `lightColors`, `darkColors`, `primitiveColors` | Semantic tokens (`primary`, `textPrimary`, `surfaceCard`, etc.) |
| Spacing | `spacing` | `xxs` (2), `xs` (4), `sm` (8), `md` (12), `base` (16), `lg` (20), `xl` (24), `2xl`-`5xl` |
| Typography | `typography` | `displayLarge`, `headingMedium`, `bodyMedium`, `labelSmall`, etc. |
| Radius | `radius` | Border radius tokens |
| Shadows | `lightShadows`, `darkShadows` | Elevation tokens (+ CSS variants for web) |

### Usage

```typescript
import { spacing, lightColors, typography } from '@pawmeet/design-tokens';

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,           // 16
    backgroundColor: lightColors.surfaceCard,
    borderRadius: radius.md,
  },
  title: {
    ...typography.headingSmall,       // fontSize, lineHeight, fontWeight, letterSpacing
    color: lightColors.textPrimary,
  },
});
```

### Accessibility (a11y) Rules for Colors

- **Text on light backgrounds**: use `textPrimary` (#1A1A2E), `textSecondary` (#4A4A5A), or `secondaryText` (#8B6914, AA 4.86:1). Never use `secondary` (#C9A84C) for text on light backgrounds.
- **Accent green** (#10B981): only on dark backgrounds or as a background color — not as text on white.
- All color pairings must meet **WCAG AA** contrast ratio (4.5:1 for normal text, 3:1 for large text).
- Use semantic tokens (`lightColors.textPrimary`) not primitive tokens (`primitiveColors.neutral[900]`) in application code.

---

## 5. Testing

### Frameworks

| Scope | Framework | Config |
|---|---|---|
| API, Web, Admin, Packages | **Vitest** | Extends `tooling/vitest/` (`node` or `react` preset) |
| Mobile (Expo) | **Jest** | Expo default runner |

### File Location

Tests are **colocated** next to their source files:

```
src/
  use-cases/
    create-walk.ts
    create-walk.test.ts
  components/
    dog-card.tsx
    dog-card.test.tsx
```

### Builder Pattern for Test Data

Use builder functions instead of raw object literals. Keeps tests readable, avoids duplication, makes defaults explicit.

```typescript
// test-builders/dog.ts
function buildDog(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-1',
    name: 'Luna',
    breed: 'Labrador',
    size: 'large',
    energyLevel: 'high',
    ownerId: 'user-1',
    ...overrides,
  };
}

// In tests
const shyDog = buildDog({ energyLevel: 'low', name: 'Milo' });
```

### What to Test

- **Use-cases**: business logic, edge cases, error paths
- **Repositories**: query correctness against a real test database (not mocked DB)
- **Components**: rendering, user interactions, conditional UI
- **Utils/helpers**: pure function inputs/outputs
- **tRPC routers**: integration tests through the router, not mocking use-cases

### Running Tests

```bash
pnpm test                           # All tests
pnpm --filter @pawmeet/api test     # Single package
```

---

## 6. Git Workflow

### Branch Naming

```
feat/walk-scheduling
fix/match-score-calculation
refactor/repository-pattern
chore/upgrade-expo-sdk
docs/api-endpoints
```

### Conventional Commits

```
feat: add walk scheduling flow
fix: correct match score when energy levels differ
refactor: extract walk repository interface
chore: upgrade drizzle-orm to 0.35
test: add integration tests for match algorithm
docs: document tRPC router conventions
```

- **Subject line**: imperative mood, lowercase, no period, max ~72 characters.
- **Body** (optional): explain *why*, not *what*.
- **No `Co-Authored-By`** lines in commits.

### Pull Request Process

1. Create a feature branch from `main`.
2. Keep PRs focused — one feature or fix per PR.
3. Ensure `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass locally (Lefthook enforces this).
4. Write a clear PR description: what changed, why, and how to test it.
5. Request review from at least one team member.
6. Squash-merge into `main`.

### Lefthook Hooks

| Hook | Jobs | What runs |
|---|---|---|
| `pre-commit` | lint, typecheck | `biome check --write` on staged files + `pnpm typecheck` |
| `pre-push` | test | `pnpm test` |

---

## 7. Code Review Checklist

Reviewers should verify each of these before approving:

### Correctness
- [ ] Logic is correct and handles edge cases
- [ ] Error states are handled (loading, empty, error)
- [ ] Types are accurate (no `any`, no unsafe casts)

### Architecture
- [ ] Dependencies point inward (domain has no infra imports)
- [ ] Data access goes through repository interfaces, not direct tRPC calls
- [ ] Business logic lives in use-cases, not in routes or components

### Design Tokens
- [ ] No hardcoded colors, spacing, typography, radii, or shadows
- [ ] Uses semantic tokens (`lightColors.textPrimary`), not primitives
- [ ] Color contrast meets WCAG AA

### Testing
- [ ] New logic has tests
- [ ] Tests use builder pattern, not raw object literals
- [ ] No mocked database — use a real test DB for repository tests

### Performance
- [ ] No unnecessary re-renders (memoization where needed)
- [ ] Lists use proper keys and virtualization
- [ ] Heavy computations are debounced or offloaded

### Security
- [ ] No secrets or credentials in code
- [ ] User input is validated with Zod schemas from `@pawmeet/validation`
- [ ] API endpoints verify authentication and authorization

### Accessibility
- [ ] Interactive elements have accessible labels
- [ ] Color is not the only means of conveying information
- [ ] Touch targets meet minimum size (44x44 on mobile)

### Analytics
- [ ] New user actions have tracking events (see [Section 8](#8-analytics))
- [ ] No PII in event properties

### Style
- [ ] Follows naming conventions
- [ ] No unused imports or variables (Biome warns)
- [ ] UI text is in Italian, code/comments in English

---

## 8. Analytics

Every new feature must consider event tracking. Follow this process:

1. **Identify events**: which user actions are worth tracking? Check `AnalyticsEventMap` in `packages/types/src/analytics.ts`.
2. **Classify source**:
   - **Server-authoritative** (confirmed actions: match created, message sent) — track at the tRPC router level AFTER `unwrapResult()` using `trackEvent()` from `apps/api/src/lib/track-event.ts`.
   - **Client-exclusive** (UI interactions: view durations, scroll depth) — track via `AnalyticsService.track()` resolved from DI (`ANALYTICS_SERVICE` token).
3. **Keep domain pure**: never track analytics inside use-cases.
4. **Add to taxonomy**: if the event is new, add it to `AnalyticsEventMap` and update `docs/13-analytics-strategy.md` Section 2.
5. **PII rules**: NEVER include email, display name, GPS coordinates, chat content, dog name, photos, or push tokens in event properties.

---

## 9. Biome (Linting & Formatting)

Biome replaces ESLint + Prettier in this project. Configuration lives in `/biome.json`.

### Formatting Rules

| Rule | Value |
|---|---|
| Semicolons | `always` |
| Quote style | `single` |
| Trailing commas | `all` (every position) |
| Indent style | `space` (2 spaces) |
| Line width | `100` characters |

### Key Lint Rules

| Rule | Level | Note |
|---|---|---|
| `useImportType` | `error` | Type-only imports must use `import type` |
| `noUnusedVariables` | `warn` | Remove dead code |
| `noUnusedImports` | `warn` | Remove unused imports |
| `noExplicitAny` | `warn` | Use `unknown` instead |
| `noNonNullAssertion` | `warn` | Prefer proper null checks |
| Recommended rules | all | Biome's full recommended set is enabled |

### Import Organization

Biome auto-sorts imports on save/commit (`organizeImports: on`). Do not manually reorder.

### Commands

```bash
pnpm lint             # Check all files
pnpm lint:fix         # Check + auto-fix
pnpm format           # Format all files
pnpm format:check     # Check formatting without writing
```

---

## 10. Common Anti-patterns

### Do Not Use TypeScript Enums

Enums have runtime overhead and poor tree-shaking. Use `as const` objects with derived union types.

```typescript
// Wrong
enum UserRole {
  Admin = 'admin',
  User = 'user',
  Moderator = 'moderator',
}

// Correct
const UserRole = {
  Admin: 'admin',
  User: 'user',
  Moderator: 'moderator',
} as const;

type UserRole = (typeof UserRole)[keyof typeof UserRole];
// => 'admin' | 'user' | 'moderator'
```

### Do Not Hardcode Visual Values

```typescript
// Wrong
<View style={{ padding: 16, backgroundColor: '#065F46' }} />

// Correct
<View style={{ padding: spacing.base, backgroundColor: lightColors.primary }} />
```

### Do Not Mock the Database in Tests

Repository tests should run against a real test database, not an in-memory mock. Mocking hides real query bugs.

```typescript
// Wrong
const mockDb = { select: vi.fn().mockResolvedValue([...]) };

// Correct — use a test database with proper setup/teardown
beforeAll(async () => { await migrate(testDb); });
afterAll(async () => { await testDb.close(); });
```

### Do Not Call tRPC Directly from Components

All data access goes through repository interfaces.

```typescript
// Wrong — tight coupling to transport
function DogList() {
  const dogs = trpc.dog.list.useQuery();
}

// Correct — uses repository via context
function DogList() {
  const dogRepo = useDogRepository();
  const dogs = useQuery({ queryFn: () => dogRepo.getAll() });
}
```

### Do Not Track Analytics in Domain/Use-Case Layer

Keeps the domain pure. Track in routers (server) or components (client).

### Do Not Use Default Exports

Named exports improve refactoring, auto-imports, and grep-ability.

```typescript
// Wrong
export default function DogCard() { ... }

// Correct
export function DogCard() { ... }
```

### Do Not Skip Validation

All external input (API requests, form data) must be validated with Zod schemas from `@pawmeet/validation`. Never trust raw input.

### Do Not Include PII in Analytics

No email, display name, GPS coordinates, chat content, dog name, photos, or push tokens in event properties. Use anonymized IDs only.
