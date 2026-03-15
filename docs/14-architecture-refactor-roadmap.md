# Architecture Refactor Roadmap

> Generated from architectural review — 2026-03-15
> 28 findings: 5 critical, 10 important, 13 minor

---

## Phase 1 — Critical (Weeks 1–3)

### 1.1 Extract Admin Router into Repository Pattern

**Problem:** `apps/api/src/trpc/routers/admin.ts` queries Drizzle directly (~400 lines of `db.select/update/delete`), bypassing the repository pattern used by 120+ use cases.

**Tasks:**

- [x] Create `ports/admin-data-repository.ts` with interface (565 lines, 50+ methods)
- [x] Create `infra/drizzle-admin-data-repository.ts` implementing the interface (1478 lines)
- [x] Move all direct DB queries from `admin.ts` router into repository methods
- [x] Wire `AdminDataRepository` in `container.ts`
- [x] Update admin router to use repository through `adminDeps`
- [ ] Add unit tests for repository methods

**Files:** `admin.ts`, `container.ts`, new `ports/admin-repository.ts`, new `infra/drizzle-admin-repository.ts`
**Effort:** 3–4 days

---

### 1.2 Extract Inline Organization Use Cases

**Problem:** `container.ts` (lines 481–518) has 4 inline anonymous use cases mixing domain logic with DI wiring.

**Tasks:**

- [x] Create `use-cases/revoke-organization.ts`
- [x] Create `use-cases/get-organization.ts`
- [x] Create `use-cases/list-organizations.ts`
- [x] Create `use-cases/remove-organization-member.ts` (extract authorization logic)
- [x] Create `use-cases/list-organization-members.ts`
- [x] Wire all via factory pattern in `container.ts`
- [ ] Add unit tests for each use case

**Files:** `container.ts`, 4 new use case files
**Effort:** 1 day

---

### 1.3 Standardize View-Model Pattern (Admin)

**Problem:** Only `users/page.view-model.ts` uses the view-model pattern. All other tables have fetch/state logic inline in the component.

**Tasks:**

- [x] Create `hooks/use-debounced-value.ts` shared hook (replaces manual setTimeout in all tables)
- [x] Extract `organizations/page.view-model.ts`
- [x] Extract `breeds/page.view-model.ts`
- [x] Extract `group-events/page.view-model.ts`
- [x] Extract `account-deletions/page.view-model.ts`
- [x] Extract `audit-log/page.view-model.ts`
- [x] Extract `safety/contacts/page.view-model.ts`
- [x] Extract `safety/sos/page.view-model.ts`
- [x] Extract `settings/admins/page.view-model.ts`
- [x] Refactor all table components to consume view-models only

**Files:** All `*-table.tsx` components, new `page.view-model.ts` files
**Effort:** 3–4 days

---

### 1.4 Add Form Validation with Zod (Admin)

**Problem:** Forms accept any input — no client-side validation, no field-level errors. `create-official-event.tsx` doesn't validate coordinates, dates, or duration ranges. `settings-form.tsx` doesn't validate email format.

**Tasks:**

- [x] Add `react-hook-form` + `@hookform/resolvers/zod` to admin
- [x] Create Zod schemas (reuse from `packages/validation` where possible):
  - `createOfficialEventSchema` (title, coordinates, date, duration, maxParticipants)
  - `settingsSchema` (appName, supportEmail, match weights)
  - `createBreedSchema` (name, nameIt, group, size, avgWeight)
  - `adminUserSchema` (email, role)
  - `notificationSchema` (title, body, target)
- [x] Refactor forms to use `useForm()` + `zodResolver()`
- [x] Add field-level error display to all forms

**Files:** All form components, new `lib/schemas/` directory
**Effort:** 2–3 days

---

### 1.5 Break Down God Components (Admin)

**Problem:** `breeds-table.tsx` is 531 lines managing 12+ state variables, CRUD dialogs, form state, and rendering.

**Tasks:**

- [x] Extract `BreedCreateDialog` component
- [x] Extract `BreedEditDialog` component
- [x] Extract `BreedDeleteDialog` component
- [x] Slim `BreedsTable` to data display + dialog triggers only
- [x] `group-events-table.tsx` — already clean, no inline dialogs
- [x] `organizations-table.tsx` — already clean, no inline dialogs

**Files:** `breeds-table.tsx`, `group-events-table.tsx`, `organizations-table.tsx`, new dialog components
**Effort:** 2 days

---

## Phase 2 — Important (Weeks 4–6)

### 2.1 Standardize Error Handling (Backend)

**Problem:** `transition-event-statuses.ts` doesn't return `Result<T>` like all other 119 use cases.

**Tasks:**

- [ ] Update `transition-event-statuses.ts` to return `Result<T>`
- [ ] Audit all use cases for consistent `Result<T>` return type
- [ ] Document error handling convention in CLAUDE.md

**Effort:** 4 hours

---

### 2.2 Standardize Error Handling (Admin)

**Problem:** Mix of silent `console.error`, toast notifications, and inline state — no consistent strategy.

**Tasks:**

- [ ] Create `lib/error-handler.ts` with `createAppError()` utility
- [ ] Create `hooks/useErrorHandler.ts` hook
- [ ] Define strategy: toast for data-fetch errors, inline for form errors
- [ ] Refactor all table components to use consistent error feedback
- [ ] Refactor all form components to display errors to user (not just console)

**Effort:** 2 days

---

### 2.3 Split Repository Interfaces (Backend ISP)

**Problem:** `GroupEventRepository` has 15+ methods mixing CRUD, discovery, scheduling, participants, and recurrence.

**Tasks:**

- [ ] Split into focused interfaces:
  - `GroupEventRepository` — core CRUD
  - `GroupEventDiscoveryRepository` — findNearby, findByCreator, findFeatured
  - `GroupEventParticipationRepository` — participant management, waitlist
  - `GroupEventRecurrenceRepository` — templates, occurrences
  - `GroupEventTransitionQueries` — scheduler-specific queries
- [ ] Update `DrizzleGroupEventRepository` to implement all interfaces
- [ ] Update use case dependencies to inject only needed interfaces
- [ ] Update container wiring

**Files:** `ports/group-event-repository.ts`, `infra/drizzle-group-event-repository.ts`, `container.ts`, affected use cases
**Effort:** 2–3 days

---

### 2.4 Extract Authorization Service (Backend)

**Problem:** Authorization logic for organizations is hardcoded inline in `container.ts`.

**Tasks:**

- [ ] Create `domain/organization-authorizer.ts` with methods:
  - `canRemoveMember(actor)`, `canUpdateRole(actor, target)`, `canRevokeOrg(actor)`
- [ ] Inject authorizer into organization use cases
- [ ] Add unit tests for authorization rules

**Effort:** 1 day

---

### 2.5 Abstract Admin Notification Service (Backend)

**Problem:** `adminDeps` exports raw `emailService` — infrastructure leaking into admin layer.

**Tasks:**

- [ ] Create `ports/admin-notification-service.ts` interface
- [ ] Create `infra/email-admin-notification-service.ts` implementation
- [ ] Update admin auth routes to use abstraction
- [ ] Wire in container

**Effort:** 1 day

---

### 2.6 Create Reusable Form Components (Admin)

**Problem:** ~350 lines of dialog/form code duplicated across 3+ components.

**Tasks:**

- [ ] Create `components/form-field.tsx` — label + input + error display
- [ ] Create `components/dialog-form.tsx` — dialog wrapper with submit/cancel/loading
- [ ] Refactor `BreedCreateDialog`, `BreedEditDialog` to use `DialogForm`
- [ ] Refactor `CreateOfficialEventForm` to use `DialogForm`
- [ ] Refactor admin user creation to use `DialogForm`

**Effort:** 2 days

---

### 2.7 Improve DataTable API (Admin)

**Problem:** DataTable requires 12 separate props, consumers manually calculate `totalPages`, same wiring duplicated in 5+ files.

**Tasks:**

- [ ] Create `hooks/useDataTable.ts` hook encapsulating all table state
- [ ] Simplify `DataTable` props to accept hook return value
- [ ] Refactor all table consumers to use `useDataTable`
- [ ] Remove manual `totalPages` calculations

**Effort:** 1–2 days

---

### 2.8 Create Debounce Hook (Admin)

**Problem:** Manual `setTimeout` + timer stored in state, duplicated in 3+ components, no cleanup on unmount.

**Tasks:**

- [x] Create `hooks/useDebouncedValue.ts` (done in task 1.3)
- [x] Replace manual debounce in `organizations-table.tsx` (done in task 1.3)
- [x] Replace manual debounce in `breeds-table.tsx` (done in task 1.3)
- [x] Replace manual debounce in `group-events-table.tsx` (done in task 1.3)

**Effort:** 2 hours

---

## Phase 3 — Polish (Weeks 7–9)

### 3.1 Split DI Container by Domain (Backend)

**Problem:** `container.ts` is 715 lines — monolithic, hard to navigate.

**Tasks:**

- [ ] Create `container/` directory with domain-specific files:
  - `auth-container.ts`, `dog-container.ts`, `match-container.ts`
  - `walk-container.ts`, `chat-container.ts`, `feed-container.ts`
  - `gamification-container.ts`, `organization-container.ts`
  - `group-event-container.ts`, `admin-container.ts`
  - `services.ts` (shared repositories and services)
- [ ] Create `container/index.ts` re-exporting all deps
- [ ] Verify all imports still resolve

**Effort:** 2 days

---

### 3.2 Create AnalyticsRepository (Backend)

**Problem:** `delete-account.ts` injects raw `db: NeonHttpDatabase` to anonymize analytics events — should use a repository.

**Tasks:**

- [ ] Create `ports/analytics-repository.ts` with `anonymizeUserEvents(userId)`
- [ ] Create `infra/drizzle-analytics-repository.ts`
- [ ] Remove `db` dependency from `delete-account.ts`
- [ ] Wire in container

**Effort:** 4 hours

---

### 3.3 Add Structured Logging to Use Cases (Backend)

**Problem:** Most use cases lack logging — only `delete-account.ts` and `transition-event-statuses.ts` log.

**Tasks:**

- [ ] Define logging convention: `logger.info(UseCaseName, { key data })` on success, `logger.warn` on domain errors
- [ ] Add logging to high-impact use cases first:
  - `create-dog`, `propose-walk`, `send-message`, `discover-candidates`
  - `register-user`, `login-user`, `delete-account`
  - All moderation actions
- [ ] Ensure PII rules are followed (no email, GPS, chat content in logs)

**Effort:** 3–4 days

---

### 3.4 Improve Type Safety (Backend)

**Problem:** Nullable lat/lon not properly narrowed in `discover-candidates.ts`.

**Tasks:**

- [ ] Create type guard: `hasLocation(user): user is User & { latitude: number; longitude: number }`
- [ ] Apply to `discover-candidates.ts` and similar use cases
- [ ] Audit other nullable field narrowing across use cases

**Effort:** 4 hours

---

### 3.5 Extract Magic Numbers (Admin)

**Problem:** `DEFAULT_PAGE_SIZE = 20` in 5+ files, chart colors hardcoded, debounce delays scattered.

**Tasks:**

- [ ] Create `lib/constants.ts` with:
  - `PAGINATION` (DEFAULT_PAGE_SIZE, MIN, MAX)
  - `TIMING` (DEBOUNCE_DELAY_MS)
  - `CHART_COLORS` (GREEN_PRIMARY, GREEN_SECONDARY, GOLD)
  - `EVENT` (DURATION_MIN, DURATION_MAX)
- [ ] Replace all magic numbers with constants

**Effort:** 2 hours

---

### 3.6 Fix Loading States for Individual Operations (Admin)

**Problem:** `story-grid.tsx` disables ALL delete buttons when deleting one story.

**Tasks:**

- [ ] Track `deletingStoryId` instead of boolean `isDeleting`
- [ ] Apply same pattern to any component with per-row operations
- [ ] Show spinner/loading text only on the affected row

**Effort:** 1 hour

---

### 3.7 Complete i18n Coverage (Admin)

**Problem:** `error.tsx` has hardcoded Italian strings.

**Tasks:**

- [ ] Move all hardcoded strings in `error.tsx` to translation files
- [ ] Audit for other hardcoded strings across admin app
- [ ] Ensure all new components use `useTranslations()`

**Effort:** 2 hours

---

### 3.8 Add Analytics Tracking to Admin Actions

**Problem:** No analytics events for admin operations (user suspend/ban, report resolution, event creation, settings changes).

**Tasks:**

- [ ] Define admin analytics events in `AnalyticsEventMap`
- [ ] Add `trackEvent()` to server actions:
  - `suspendUser`, `banUser`, `reactivateUser`
  - `resolveReport`
  - `createOfficialEvent`
  - `updateSettings`
- [ ] Follow convention: track AFTER successful action, at router/action level

**Effort:** 4 hours

---

## Phase 4 — Domain Layer (Future, Optional)

> This phase introduces a proper domain layer. It's architecturally valuable but not blocking current development. Evaluate after Phases 1–3.

### 4.1 Introduce Value Objects

- [ ] `Email` value object (validation, normalization, domain comparison)
- [ ] `Coordinates` value object (lat/lon validation, distance calculation)
- [ ] `CompatibilityScore` value object (weighted calculation, breakdown)
- [ ] `MatchWeights` value object (sum-to-1 invariant)

### 4.2 Introduce Domain Entities

- [ ] `DogProfile` aggregate root (invariant protection, business rules)
- [ ] `GroupEvent` aggregate root (state machine, capacity rules)

### 4.3 Extract Domain Services

- [ ] `MatchingAlgorithm` — injectable strategy for compatibility scoring
- [ ] `OrganizationAuthorizer` → promote to domain service with richer rules

**Effort:** 5–7 days total

---

## Summary

| Phase | Focus | Effort | Impact |
|-------|-------|--------|--------|
| **1 — Critical** | Admin repo extraction, inline use cases, view-models, validation, god components | ~3 weeks | Fixes architectural violations, enables testing |
| **2 — Important** | Error handling, ISP, authorization, reusable forms, DataTable API | ~3 weeks | Reduces duplication, improves consistency |
| **3 — Polish** | Container split, logging, type safety, constants, i18n, analytics | ~2 weeks | Developer experience, observability |
| **4 — Domain** | Value objects, aggregates, domain services | ~1 week | Long-term maintainability, business rule clarity |

**Total estimated effort:** 9–10 weeks at moderate pace
