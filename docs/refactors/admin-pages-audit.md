# Admin Pages Server Component Audit

Audit date: 2026-03-15

## Summary

- **Total pages**: 22
- **Pages calling tRPC directly**: 15
- **Pages using actions.ts**: 5
- **Pages with no data fetching**: 1 (safety redirect)
- **Pages missing i18n**: 7

## Inventory

| Page path | Calls tRPC directly? | Has actions.ts? | Action function exists? | tRPC procedures called | Has i18n? | Notes |
|---|---|---|---|---|---|---|
| `(dashboard)/page.tsx` | yes | no | no | `admin.getStats.query()`, `admin.getAnalyticsKpis.query()` | yes | Dashboard home. No actions.ts at all. |
| `(dashboard)/dogs/page.tsx` | yes | yes | yes | `admin.listDogs.query()` | yes | actions.ts has `fetchDogs` wrapping same call, but page calls tRPC directly instead of using it. |
| `(dashboard)/organizations/page.tsx` | no | yes | yes | (none directly) | yes | Uses `fetchOrganizations` from actions.ts. Already refactored. |
| `(dashboard)/organizations/[id]/page.tsx` | yes | parent | no | `admin.getOrganization.query()` | no | Inline `fetchOrganization` helper in page file. Parent actions.ts has no `getOrganization` wrapper. No i18n. |
| `(dashboard)/settings/page.tsx` | yes | yes | partial | `admin.getSettings.query()` | yes | actions.ts only has `updateSettings` (mutation). No query wrapper for `getSettings`. |
| `(dashboard)/settings/admins/page.tsx` | yes | yes | yes | `admin.listAdminUsers.query()` | yes | actions.ts has `fetchAdminUsers` wrapping same call, but page calls tRPC directly instead. |
| `(dashboard)/group-events/page.tsx` | yes | yes | yes | `admin.listGroupEvents.query()` | yes | actions.ts has `fetchGroupEvents` wrapping same call, but page calls tRPC directly instead. |
| `(dashboard)/group-events/[id]/page.tsx` | yes | parent | no | `admin.getGroupEvent.query()` | no | Inline `fetchEvent` helper in page file. Parent actions.ts has no `getGroupEvent` wrapper. No i18n. |
| `(dashboard)/audit-log/page.tsx` | yes | yes | yes | `admin.listAuditLog.query()` | yes | actions.ts has `fetchAuditLog` wrapping same call, but page calls tRPC directly instead. |
| `(dashboard)/safety/page.tsx` | no | yes | n/a | (none) | no | Redirect-only page (`redirect('/safety/sos')`). No data fetching. |
| `(dashboard)/safety/contacts/page.tsx` | no | parent | yes | (none directly) | no | Uses `fetchEmergencyContacts` from parent `safety/actions.ts`. Hardcoded Italian strings instead of i18n. |
| `(dashboard)/safety/sos/page.tsx` | no | parent | yes | (none directly) | yes | Uses `fetchSosAlerts` from parent `safety/actions.ts`. Already refactored. |
| `(dashboard)/account-deletions/page.tsx` | yes | yes | yes | `admin.listPendingDeletions.query()` | yes | actions.ts has `fetchPendingDeletions` wrapping same call, but page calls tRPC directly instead. |
| `(dashboard)/breeds/page.tsx` | yes | yes | yes | `admin.listBreeds.query()` | yes | actions.ts has `fetchBreeds` wrapping same call, but page calls tRPC directly instead. |
| `(dashboard)/users/page.tsx` | yes | yes | yes | `admin.listUsers.query()` | yes | actions.ts has `fetchUsers` wrapping same call, but page calls tRPC directly instead. |
| `(dashboard)/users/[id]/page.tsx` | yes | parent | no | `admin.getUser.query()` | yes | Parent actions.ts has no `getUser` wrapper. Page calls tRPC directly with inline `.catch(() => notFound())`. |
| `(dashboard)/notifications/page.tsx` | no | yes | yes | (none directly) | yes | Uses `fetchNotificationStats` from actions.ts. Already refactored. |
| `(dashboard)/moderation/content/page.tsx` | yes | yes | yes | `contentModeration.pendingReports.query()` | no | actions.ts has `fetchPendingContent` wrapping same call, but page calls tRPC directly instead. No i18n. |
| `(dashboard)/moderation/stories/page.tsx` | yes | yes | yes | `admin.listStories.query()` | yes | actions.ts has `fetchStories` wrapping same call, but page calls tRPC directly instead. |
| `(dashboard)/moderation/feed/page.tsx` | yes | yes | yes | `admin.listFeedPosts.query()`, `admin.getFeedStats.query()` | no | actions.ts has both `fetchFeedPosts` and `fetchFeedStats`, but page calls tRPC directly. No i18n. |
| `(dashboard)/moderation/photos/page.tsx` | yes | yes | no | `admin.listPendingPhotos.query()` | no | actions.ts has approve/reject mutations only, no query wrapper for `listPendingPhotos`. No i18n. |
| `(dashboard)/moderation/reports/page.tsx` | yes | yes | yes | `admin.listReports.query()` | no | actions.ts has `fetchReports` wrapping same call, but page calls tRPC directly. No i18n. |

## Patterns Found

### 1. Pages already using actions.ts (no direct tRPC) -- 4 pages
- `organizations/page.tsx` -- uses `fetchOrganizations`
- `safety/contacts/page.tsx` -- uses `fetchEmergencyContacts` from parent
- `safety/sos/page.tsx` -- uses `fetchSosAlerts` from parent
- `notifications/page.tsx` -- uses `fetchNotificationStats`

### 2. Pages calling tRPC directly despite action wrapper existing -- 10 pages
These pages import `getServerTrpcClient` and call tRPC directly even though the co-located `actions.ts` already exports an equivalent function:
- `dogs/page.tsx` (action: `fetchDogs`)
- `settings/admins/page.tsx` (action: `fetchAdminUsers`)
- `group-events/page.tsx` (action: `fetchGroupEvents`)
- `audit-log/page.tsx` (action: `fetchAuditLog`)
- `account-deletions/page.tsx` (action: `fetchPendingDeletions`)
- `breeds/page.tsx` (action: `fetchBreeds`)
- `users/page.tsx` (action: `fetchUsers`)
- `moderation/content/page.tsx` (action: `fetchPendingContent`)
- `moderation/stories/page.tsx` (action: `fetchStories`)
- `moderation/reports/page.tsx` (action: `fetchReports`)

### 3. Pages calling tRPC directly with NO action wrapper -- 5 pages
These need a new action function created:
- `(dashboard)/page.tsx` -- needs `fetchStats`, `fetchAnalyticsKpis` (no actions.ts exists)
- `organizations/[id]/page.tsx` -- needs `fetchOrganization` in parent actions.ts
- `group-events/[id]/page.tsx` -- needs `fetchGroupEvent` in parent actions.ts
- `users/[id]/page.tsx` -- needs `fetchUser` in parent actions.ts
- `moderation/photos/page.tsx` -- needs `fetchPendingPhotos` in actions.ts

### 4. Pages calling tRPC directly with PARTIAL action coverage -- 2 pages
- `settings/page.tsx` -- actions.ts has `updateSettings` but no `fetchSettings`
- `moderation/feed/page.tsx` -- actions.ts has both wrappers but page doesn't use them

### 5. Missing i18n -- 7 pages
- `organizations/[id]/page.tsx`
- `group-events/[id]/page.tsx`
- `safety/page.tsx` (redirect only, acceptable)
- `safety/contacts/page.tsx` (hardcoded Italian strings)
- `moderation/content/page.tsx`
- `moderation/feed/page.tsx`
- `moderation/photos/page.tsx`
- `moderation/reports/page.tsx`

## Recommended Refactor Priority

1. **Quick wins (swap to existing action)**: 10 pages that already have the wrapper function -- just change the import from `getServerTrpcClient` to the action function.
2. **Create missing action wrappers**: 5 pages that need new functions in actions.ts files.
3. **Add i18n**: 7 pages with hardcoded or missing translations.
4. **Create dashboard actions.ts**: The main dashboard page has no actions.ts at all.
