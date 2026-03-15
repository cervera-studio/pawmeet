# Refactor: Admin Backoffice Data Flow — Eliminate Direct tRPC Calls in Page Components

**Status:** Planned
**Date:** 2026-03-15
**Scope:** `apps/admin/src/app/(dashboard)/**/page.tsx`

---

## 1. Problem

Approximately 17 server page components call `getServerTrpcClient()` directly to fetch initial data. This violates the established architecture where `actions.ts` is the single entry point for all data access.

**Consequences:**

- **Code duplication** — the same tRPC call + response mapping logic exists in both the page and the corresponding action (or will need to when the action is created). The `PaginatedResult` transformation (`hasMore: page < totalPages`) is copy-pasted across pages.
- **Inconsistent abstraction layer** — some pages go through actions, others bypass them. Contributors cannot rely on a predictable pattern.
- **Harder to maintain** — if a tRPC procedure signature changes, fixes must be applied in two places (page + action) instead of one.
- **Breaks revalidation encapsulation** — mutations in actions call `revalidatePath()`, but the data they revalidate was fetched via a different code path.

## 2. Correct Pattern

### Before (violation)

```tsx
// page.tsx — WRONG: calls tRPC directly
import { getServerTrpcClient } from '@/lib/server-api';

export default async function SomePage() {
  const api = await getServerTrpcClient();
  const result = await api.admin.listThings.query({ page: 1, pageSize: 20 });
  const initialData = {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
  return <SomeTable initialData={initialData} />;
}
```

### After (correct)

```tsx
// actions.ts — single entry point for data access
'use server';

import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchThings(params: { page: number; pageSize: number }) {
  const api = await getServerTrpcClient();
  const result = await api.admin.listThings.query(params);
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}
```

```tsx
// page.tsx — calls action, never touches tRPC
import { fetchThings } from './actions';

export default async function SomePage() {
  const initialData = await fetchThings({ page: 1, pageSize: 20 });
  return <SomeTable initialData={initialData} />;
}
```

**Reference implementations (already fixed):**
- `organizations/page.tsx` + `organizations/actions.ts`
- `safety/sos/page.tsx` + `safety/actions.ts`
- `safety/contacts/page.tsx` + `safety/actions.ts`
- `notifications/page.tsx` + `notifications/actions.ts`

## 3. Pages Requiring Refactoring

### 3.1 Standard List Pages

These follow the typical pattern: fetch a paginated list, pass as `initialData` to a table component.

| # | Page file | actions.ts exists? | Fetch function exists? | Effort |
|---|-----------|-------------------|----------------------|--------|
| 1 | `users/page.tsx` | Yes | Yes (`fetchUsers`) | S |
| 2 | `dogs/page.tsx` | Yes | Yes (`fetchDogs`) | S |
| 3 | `group-events/page.tsx` | Yes | Yes (`fetchGroupEvents`) | S |
| 4 | `account-deletions/page.tsx` | Yes | Yes (`fetchPendingDeletions`) | S |
| 5 | `breeds/page.tsx` | Yes | Yes (`fetchBreeds`) | S |
| 6 | `audit-log/page.tsx` | Yes | Yes (`fetchAuditLog`) | S |
| 7 | `settings/admins/page.tsx` | Yes | Yes (`fetchAdminUsers`) | S |
| 8 | `moderation/reports/page.tsx` | Yes | Yes (`fetchReports`) | S |
| 9 | `moderation/stories/page.tsx` | Yes | Yes (`fetchStories`) | S |
| 10 | `moderation/content/page.tsx` | Yes | Yes (`fetchPendingContent`) | S |

**Effort S** = trivial. The fetch function already exists in actions.ts. The page just needs to: (1) remove the `getServerTrpcClient` import, (2) import the action, (3) replace inline tRPC call with action call. ~5 minutes each.

### 3.2 Pages with Multiple Queries

| # | Page file | actions.ts exists? | Fetch functions exist? | Notes | Effort |
|---|-----------|-------------------|----------------------|-------|--------|
| 11 | `moderation/feed/page.tsx` | Yes | Yes (`fetchFeedPosts`, `fetchFeedStats`) | Fetches both posts list and stats in parallel | S |

**Effort S** = both fetch functions already exist. Replace `api.admin.listFeedPosts.query(...)` with `fetchFeedPosts(...)` and `api.admin.getFeedStats.query()` with `fetchFeedStats()`.

### 3.3 Pages Needing a New Fetch Action

| # | Page file | actions.ts exists? | What's missing | Notes | Effort |
|---|-----------|-------------------|----------------|-------|--------|
| 12 | `moderation/photos/page.tsx` | Yes | `fetchPendingPhotos` | Actions only has approve/reject mutations. Need to add a `fetchPendingPhotos` query action | M |
| 13 | `settings/page.tsx` | Yes | `fetchSettings` | Actions only has `updateSettings` mutation. Need to add a `fetchSettings` query action | M |

**Effort M** = actions.ts exists but needs a new fetch function (~10 minutes each: write the action, update the page).

### 3.4 Detail Pages (Dynamic Routes)

| # | Page file | actions.ts exists? | What's missing | Notes | Effort |
|---|-----------|-------------------|----------------|-------|--------|
| 14 | `organizations/[id]/page.tsx` | Parent has actions.ts | `fetchOrganization(id)` | Has a local `fetchOrganization` helper that wraps tRPC + `notFound()`. Move to parent `actions.ts` | M |
| 15 | `group-events/[id]/page.tsx` | Parent has actions.ts | `fetchGroupEvent(id)` | Same pattern: local helper with `notFound()`. Move to parent `actions.ts` | M |
| 16 | `users/[id]/page.tsx` | Parent has actions.ts | `fetchUser(id)` | Calls `api.admin.getUser.query({ id })` inline with `.catch(() => notFound())`. Move to parent `actions.ts` | M |

**Effort M** = need to create a new fetch action in the parent `actions.ts` and handle the `notFound()` flow. The `notFound()` call from `next/navigation` works in server actions, so the action can throw it. Alternatively, the action returns `null` and the page calls `notFound()`. Either approach works; prefer returning `null` to keep `notFound()` in the rendering layer.

### 3.5 Dashboard (Aggregation Page)

| # | Page file | actions.ts exists? | What's missing | Notes | Effort |
|---|-----------|-------------------|----------------|-------|--------|
| 17 | `page.tsx` (dashboard root) | No | Entire `actions.ts` file | Fetches `getStats` + `getAnalyticsKpis` in parallel. Need to create `actions.ts` with `fetchDashboardStats` and `fetchAnalyticsKpis` (or a single `fetchDashboardData` that returns both) | L |

**Effort L** = need to create the actions file from scratch and define the fetch functions. The dashboard aggregates multiple unrelated queries, so decide whether to expose them as separate actions or a single combined action. Recommend separate actions for reusability (~15 minutes).

### 3.6 Pages Already Fixed (No Work Needed)

| Page file | Status |
|-----------|--------|
| `organizations/page.tsx` | Already uses `fetchOrganizations` from actions |
| `safety/sos/page.tsx` | Already uses `fetchSosAlerts` from actions |
| `safety/contacts/page.tsx` | Already uses `fetchEmergencyContacts` from actions |
| `notifications/page.tsx` | Already uses `fetchNotificationStats` from actions |
| `safety/page.tsx` | Redirect only, no data fetching |

## 4. Execution Order

Recommended order to minimize risk and build confidence:

1. **Batch 1 — Standard list pages (items 1-10, 11):** All fetch functions already exist. Pure wiring change. Can be done in a single PR.
2. **Batch 2 — Pages needing new fetch actions (items 12-13):** Add the missing fetch function to existing actions.ts, then update the page.
3. **Batch 3 — Detail pages (items 14-16):** Requires deciding on the `notFound()` pattern for actions. Do one first as a template, then apply to the rest.
4. **Batch 4 — Dashboard (item 17):** Create new actions.ts file. Most complex due to multiple queries and no existing actions file.

## 5. Acceptance Criteria

1. **No page.tsx imports `getServerTrpcClient`** — zero occurrences of `import { getServerTrpcClient }` or `import { ... getServerTrpcClient ... }` in any `page.tsx` under `(dashboard)/`.
2. **All data fetching goes through actions.ts** — every page's initial data comes from an imported server action.
3. **Existing behavior is preserved** — no regressions in data loading, pagination, search, or error handling (`notFound()` still works for detail pages).
4. **Client table components are unchanged** — the `-table.tsx` / `-list.tsx` / `-grid.tsx` components should already be calling actions for pagination; this refactor only touches initial data in `page.tsx`.
5. **Types are preserved** — no `as` casts introduced (fix any existing ones like the `as AdminUserListItem[]` in `users/page.tsx` by typing the action correctly).
6. **Tests pass** — `pnpm typecheck` and `pnpm test --filter @pawmeet/admin` pass.

## 6. Edge Cases and Notes

### `notFound()` in detail pages
The detail pages (`[id]/page.tsx`) use `notFound()` from `next/navigation` when the entity is not found. Two options:
- **Option A (recommended):** Action returns `T | null`, page calls `notFound()` if null. Keeps rendering concerns in the rendering layer.
- **Option B:** Action throws `notFound()` directly. Works in server actions but couples the action to Next.js navigation.

### Dashboard aggregation
The dashboard page fetches `getStats` and `getAnalyticsKpis` in parallel. These should be two separate actions (not one combined action) so they can be reused independently if needed.

### `moderation/reports/page.tsx` data transformation
This page transforms the response (casting `status` as `ReportStatus`, converting dates to strings). This transformation logic should move into the action function so the page receives clean, correctly-typed data.

### `settings/admins/page.tsx` response shape
This page passes the raw tRPC result as `initialData` without the standard `PaginatedResult` mapping. Verify the action (`fetchAdminUsers`) returns the same shape the table component expects.

### `moderation/photos/page.tsx` non-paginated query
This page calls `listPendingPhotos.query()` with no pagination params. The action should mirror this (no params or optional params).

### Login page
`(auth)/login/page.tsx` is outside the dashboard layout and does not fetch data via tRPC. Out of scope.

## 7. Effort Summary

| Category | Count | Effort per page | Total |
|----------|-------|----------------|-------|
| Standard list (fetch exists) | 11 | ~5 min | ~55 min |
| New fetch action needed | 2 | ~10 min | ~20 min |
| Detail pages | 3 | ~10 min | ~30 min |
| Dashboard (new actions.ts) | 1 | ~15 min | ~15 min |
| **Total** | **17** | | **~2 hours** |

## 8. Verification Command

After refactoring, run this to confirm zero violations remain:

```bash
grep -r "getServerTrpcClient" apps/admin/src/app/\(dashboard\)/**/page.tsx
# Expected: no output
```
