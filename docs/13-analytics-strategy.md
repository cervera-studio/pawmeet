# 13 — Analytics Strategy

**Date:** 2026-03-11
**Authors:** Sara Conti (Analytics Engineer), Elena Ricci (Data Engineer), Davide Moretti (Data Security), Giulia Fontana (GDPR/Privacy), Luca Bianchi (Software Architect)
**Status:** Approved — P0 blockers resolved, Sprint N ready

---

## Executive Summary

This document consolidates the analysis of 5 specialists on introducing product analytics into PawMeet. The recommendation is a **server-first single data store** (Neon + BullMQ) at EUR 0 additional cost, with a clear 1-day migration path to **PostHog EU** when revenue arrives.

**P0 blockers resolved:** Consent infrastructure is implemented — `user_consents` table, mobile consent modal + settings toggles, Sentry PII scrubbing (consent-aware), Statsig userId pseudonymization, and proper GDPR legal basis separation.

**Architecture principle:** All analytics events (both client-originated and server-originated) flow through a single server-side pipeline into `analytics_events` in Neon. This gives us authoritative server-side validation, a single source of truth, and transport-agnostic `AnalyticsService` interface that can swap implementations in ~1 day.

---

## Table of Contents

1. [Tool Decision](#1-tool-decision)
2. [Event Taxonomy](#2-event-taxonomy)
3. [Key Metrics & KPIs](#3-key-metrics--kpis)
4. [Data Pipeline Architecture](#4-data-pipeline-architecture)
5. [Analytics Service Architecture](#5-analytics-service-architecture)
6. [Admin Dashboards](#6-admin-dashboards)
7. [GDPR Compliance Plan](#7-gdpr-compliance-plan)
8. [Security Requirements](#8-security-requirements)
9. [Blockers & Implementation Order](#9-blockers--implementation-order)

---

## 1. Tool Decision

### Comparison Matrix

| Criterion | Server-First (Neon + BullMQ) | PostHog Cloud (free) | PostHog EU (Teams) | PostHog Self-Hosted |
|---|---|---|---|---|
| **Cost** | EUR 0 (existing infra) | EUR 0 (up to 1M events/mo) | EUR 37.50/mo | EUR 15-30/mo (Fly.io VM) |
| **GDPR EU hosting** | Full control, Neon eu-central-1 | US only | EU (Frankfurt) | Full control, Frankfurt |
| **Mobile SDK** | Custom `BufferedAnalyticsService` | `posthog-react-native` | Same | Same |
| **Funnels/Cohorts** | Build later or defer to PostHog | Built-in | Built-in | Built-in |
| **Session replay** | No | Yes (5K sessions/mo free) | Yes | Yes |
| **Data ownership** | Full ownership | PostHog retains | PostHog retains | Full ownership |

### Decision: Server-First NOW, PostHog When Revenue Arrives

1. **NOW (EUR 0):** Server-first pipeline using existing Neon + BullMQ infrastructure. All events (client + server) flow to a single `analytics_events` table. Admin gets KPI cards only.
2. **Cloudflare Web Analytics** (already deployed) for the landing page — no analytics SDK on marketing site.
3. **When revenue arrives (~1 day effort):** Add PostHog EU Teams plan (~EUR 37.50/mo) as the visualization layer. Funnels, cohorts, session replay, and dashboards handled by PostHog. Admin retains KPI cards; funnel/cohort/matching pages are NOT built — PostHog provides them.

### Why Not PostHog at MVP?

- **EUR 0 vs EUR 0 cost is the same**, but PostHog free tier is US-hosted (GDPR risk with Garante)
- PostHog EU requires Teams plan (EUR 450/yr) — unjustifiable before revenue
- Our server already processes every user action — duplicating events to a third party adds complexity without value at MVP scale
- The `AnalyticsService` interface is transport-agnostic: swapping `BufferedAnalyticsService` → `PostHogAnalyticsService` is a 1-day effort (change DI registration + add SDK)

### Cost Projection

| Phase | Monthly Cost | Notes |
|---|---|---|
| MVP (0-5K users) | EUR 0 | Server-first, existing Neon + BullMQ |
| Revenue phase | ~EUR 37.50 | Add PostHog EU Teams for dashboards |
| Scale (20K+) | EUR 37.50-69 | PostHog EU + Neon Scale tier |

---

## 2. Event Taxonomy

### Naming Convention

All events use `object_action` format in lowercase snake_case. Properties use camelCase in TypeScript code.

### Event Routing

Events are categorized by authoritative source to prevent spoofing:

| Category | Count | Source | Rationale |
|---|---|---|---|
| **Client-exclusive** | 13 | Mobile → batch POST | View durations, screen transitions, UI interactions — only the client knows |
| **Server-authoritative** | 31 | tRPC router (after `unwrapResult()`) | Matches, messages, walks, social, events, moderation — server is source of truth |
| **Hybrid → Server** | 6 | Client initiates, server records | Registration, login — client knows timing, server confirms success |

### Client-Exclusive Events

| Event | Properties | Informs |
|---|---|---|
| `onboarding_step_viewed` | `stepNumber`, `stepName` | Step visibility |
| `onboarding_step_skipped` | `stepNumber`, `stepName` | User resistance |
| `onboarding_abandoned` | `lastStepNumber`, `lastStepName`, `totalDurationMs` | Where users give up |
| `match_feed_loaded` | `cardsAvailable`, `avgCompatibilityScore` | Feed quality |
| `match_card_viewed` | `compatibilityScore`, `distanceKm`, `viewDurationMs` | Card engagement |
| `match_swipe_performed` | `direction`, `compatibilityScore`, `distanceKm`, `viewDurationMs`, `sizePair`, `energyPair` | Algorithm tuning |
| `match_feed_exhausted` | `totalSwipesSession`, `searchRadiusKm` | Content supply |
| `chat_opened` | `matchAgeDays`, `isFirstOpen` | Match-to-chat timing |
| `app_opened` | `hoursSinceLastOpen`, `isNotificationDriven`, `notificationType?` | Retention, push effectiveness |
| `app_backgrounded` | `sessionDurationMs`, `screenCount` | Session depth |
| `privacy_consent_updated` | `analytics`, `abTesting`, `errorTracking`, `marketing` | Consent rates |
| `social_user_searched` | `resultCount`, `queryLength` | Search usage |
| `event_sponsor_viewed` | `sponsorTier`, `placement` | Brand visibility |

### Server-Authoritative Events

| Event | Properties | Informs |
|---|---|---|
| `auth_registration_completed` | `method`, `durationMs` | Registration funnel |
| `auth_registration_failed` | `method`, `errorCode` | Auth UX issues |
| `auth_login_completed` | `method` | Auth method popularity |
| `auth_login_failed` | `method`, `errorCode` | Login friction |
| `auth_email_verified` | `method: 'link' \| 'otp'`, `delayMs` | Verification effectiveness |
| `auth_logout` | `reason: 'manual' \| 'token_expired' \| 'forced'` | Session health |
| `dog_profile_created` | `breed`, `size`, `energyLevel`, `photoCount`, `isNeutered` | Dog demographics |
| `dog_profile_updated` | `fieldsChanged: string[]` | UX friction |
| `dog_photo_uploaded` | `position`, `fileSizeKb` | Photo patterns |
| `dog_photo_moderation_result` | `result`, `rejectionReason?`, `durationMs` | Moderation health |
| `match_created` | `compatibilityScore`, `distanceKm`, `sizePair`, `energyPair` | Match quality |
| `match_unmatched` | `reason`, `matchAgeDays`, `messageCount` | Match health |
| `chat_message_sent` | `messageType`, `chatAgeHours`, `messageCountInChat` | Chat depth |
| `walk_proposed` | `matchAgeHours`, `messageCountBeforeProposal` | Chat-to-walk conversion |
| `walk_response` | `response`, `proposalAgeHours` | Proposal effectiveness |
| `walk_completed` | `durationMinutes`, `distanceKm`, `participantCount` | Walk quality |
| `walk_feedback_submitted` | `rating`, `hasComment` | Post-walk engagement |

### Server-Authoritative Events — Social (see docs/14)

| Event | Properties | Informs |
|---|---|---|
| `social_follow_created` | `isReciprocal` | Social graph growth |
| `social_follow_removed` | `wasMutual`, `followAgeDays` | Churn signal |
| `social_user_blocked` | `hadPriorFollow` | Safety, trust issues |
| `social_user_unblocked` | — | Conflict resolution |

### Server-Authoritative Events — Events v2 (see docs/14)

| Event | Properties | Informs |
|---|---|---|
| `group_event_created` | `maxParticipants`, `category`, `visibility`, `requiresApproval`, `isRecurring` | Event supply, feature adoption |
| `group_event_joined` | `participantNumber`, `distanceKm` | Event demand |
| `group_event_request_sent` | `eventCategory`, `isHostFriend` | Join demand, friends-only usage |
| `group_event_request_approved` | `requestAgeHours`, `participantNumber` | Host responsiveness |
| `group_event_request_declined` | `requestAgeHours`, `reason?` | Rejection patterns |
| `group_event_request_cancelled` | `requestAgeHours` | User changed mind |
| `group_event_recurring_created` | `recurrenceFrequency`, `category` | Recurring event adoption |
| `group_event_occurrence_generated` | `parentEventId`, `occurrenceNumber` | Recurrence system health |

### Server-Authoritative Events — Main Events & Brands (see docs/14)

| Event | Properties | Informs |
|---|---|---|
| `event_main_created` | `organizationType`, `maxParticipants`, `hasSponsor` | Official event supply |
| `event_main_joined` | `participantNumber`, `capacityPercent`, `organizationType` | Official event demand |
| `event_main_completed` | `participantCount`, `capacityPercent`, `hasSponsor` | Event success |

### Hybrid → Server Events

| Event | Client Sends | Server Records |
|---|---|---|
| `auth_registration_started` | `method`, client timestamp | Server validates + stores |
| `onboarding_started` | `source` | Server confirms auth |
| `onboarding_step_completed` | `stepNumber`, `stepName`, `durationMs` | Server validates step |
| `onboarding_completed` | `totalDurationMs`, `stepsCompleted` | Server confirms completion |
| `gamification_badge_earned` | — | Server awards badge |
| `gamification_level_up` | — | Server calculates level |

### PII Rules (Hard Constraints)

The following MUST NEVER appear in any analytics event:

| Data | Alternative |
|---|---|
| Email address | Opaque `userId` (raw UUID in own DB only) |
| Display name | Opaque `userId` |
| Exact GPS coordinates | `distanceKm` (rounded) |
| IP address | Never stored in analytics events |
| Chat message content | `messageType` + `messageCountInChat` |
| Dog name | Opaque `dogId` |
| Photos / media URLs | `photoCount` |
| Push tokens | Never in events |

---

## 3. Key Metrics & KPIs

### Activation

| Metric | Formula | Target (MVP) |
|---|---|---|
| Registration completion | `auth_registration_completed / auth_registration_started` | >= 80% |
| Onboarding completion | `onboarding_completed / onboarding_started` | >= 40% |
| First dog profile | Users with dog / Registered users | >= 85% |
| First swipe | Users who swiped / Onboarded users | >= 70% |
| First match | Users with match / Onboarded users | >= 30% |
| Time to first match | Median onboarding → match | < 48h |

### Engagement

| Metric | Formula | Target |
|---|---|---|
| DAU/MAU ("stickiness") | DAU / MAU | >= 30% |
| Swipes per session | Swipe events / Sessions | 10-30 |
| Messages per match | Messages / Matches with messages | >= 5 |
| Session duration (p50) | Median `app_backgrounded.sessionDurationMs` | 5-10 min |

### Retention

| Metric | Target |
|---|---|
| D1 retention | >= 50% |
| D7 retention | >= 40% |
| D30 retention | >= 20% |

### Matching Quality

| Metric | Target |
|---|---|
| Right swipe rate | 20-40% |
| Match-to-chat rate | >= 60% |
| Chat-to-walk rate | >= 25% |
| Walk completion rate | >= 80% |
| Unmatch rate | < 5%/month |

### Social Graph (Sprint 12+, see docs/14)

| Metric | Formula | Target |
|---|---|---|
| Follow rate | Users who follow someone / Active users | >= 40% |
| Mutual follow rate | Mutual follows / Total follows | >= 30% |
| Friends per user (p50) | Median mutual follow count | >= 3 |
| Block rate | Blocks / Active users | < 2% |

### Events v2 (Sprint 13+, see docs/14)

| Metric | Formula | Target |
|---|---|---|
| Event creation rate | Events created / Week | Growing |
| Request-to-join approval rate | Approved / (Approved + Declined) | >= 70% |
| Host response time (p50) | Median request → decision | < 12h |
| Friends-only event share | Friends-only events / Total events | 20-40% |
| Recurring event retention | Users re-joining next occurrence | >= 50% |

### Main Events & Brands (Sprint 14+, see docs/14)

| Metric | Formula | Target |
|---|---|---|
| Main Event attendance rate | Participants / Max capacity | >= 60% |
| Main Event fill time | Created → full capacity | Tracking |
| Sponsor visibility rate | `event_sponsor_viewed` / Event page views | >= 80% |
| Main Event → follow conversion | New follows within 48h of Main Event | Tracking |

---

## 4. Data Pipeline Architecture

### Event Flow (Single-Path, Server-First)

```
Mobile Client                           Server (Hono API)
    │                                       │
    ├─ Client-exclusive events ─────────────┤
    │  (SQLite buffer → POST /api/events/batch)
    │                                       │
    │                                       ├─ Server-authoritative events
    │                                       │  (tracked at tRPC router level
    │                                       │   after unwrapResult())
    │                                       │
    │                                       ▼
    │                               BullMQ "analytics" queue
    │                                       │
    │                                       ▼
    │                               Analytics Worker
    │                                       │
    │                     ┌─────────────────┼─────────────────┐
    │                     ▼                 ▼                 ▼
    │              analytics_events   Redis counters    (future: PostHog)
    │              (Neon PostgreSQL)   (real-time KPIs)
    │
    └─ Offline? SQLite buffer holds events, flushes on:
       • App foreground
       • 60-second timer
       • Connectivity restored
```

### Why Server-First?

1. **Authoritative data**: Server confirms actions actually happened (match created, message delivered)
2. **Single source of truth**: One `analytics_events` table, not dual client/server paths
3. **No third-party dependency**: Zero additional cost, full EU data residency
4. **Transport-agnostic**: `AnalyticsService` interface can be swapped without changing any tracking code
5. **Offline-resilient**: SQLite buffer on mobile handles connectivity gaps

### Raw Events Table (Drizzle ORM) — IMPLEMENTED

```typescript
// packages/db/src/schema/analytics.ts
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientEventId: varchar('client_event_id', { length: 64 }).notNull().unique(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: varchar('session_id', { length: 64 }),
    eventName: varchar('event_name', { length: 100 }).notNull(),
    properties: jsonb('properties').$type<Record<string, unknown>>(),
    clientTimestamp: timestamp('client_timestamp', { withTimezone: true }).notNull(),
    serverTimestamp: timestamp('server_timestamp', { withTimezone: true }).notNull().defaultNow(),
    platform: varchar('platform', { length: 10 }).notNull(),
    appVersion: varchar('app_version', { length: 20 }),
    screenName: varchar('screen_name', { length: 100 }),
  },
  (t) => [
    index('analytics_events_name_ts_idx').on(t.eventName, t.serverTimestamp),
    index('analytics_events_user_ts_idx').on(t.userId, t.serverTimestamp),
  ],
);
```

Key design decisions:
- `clientEventId` with UNIQUE constraint for offline-first deduplication (`ON CONFLICT DO NOTHING`)
- `clientTimestamp` vs `serverTimestamp` separation (mobile clocks may be wrong)
- JSONB `properties` for flexible event schemas without migrations
- `ON DELETE SET NULL` for userId — analytics data survives GDPR erasure (anonymized)

### Server-Side Event Tracking Pattern (Clean Architecture)

Events are tracked at the **tRPC router level**, AFTER `unwrapResult()`, NOT inside use-cases. This keeps the domain layer pure:

```typescript
// Example: apps/api/src/routes/match.router.ts
.mutation('createMatch', {
  input: createMatchSchema,
  resolve: async ({ input, ctx }) => {
    const result = await createMatchUseCase(deps)(input);
    const match = unwrapResult(result); // throws on error

    // Track AFTER confirmed success — router level, not use-case
    await analyticsQueue.add('track', {
      eventName: 'match_created',
      userId: ctx.userId,
      properties: {
        compatibilityScore: match.score,
        distanceKm: match.distance,
        sizePair: `${match.dog1Size}_${match.dog2Size}`,
        energyPair: `${match.dog1Energy}_${match.dog2Energy}`,
      },
    });

    return match;
  },
});
```

### Batch Endpoint (Client Events)

Raw Hono POST route (NOT tRPC) for minimal overhead:

```typescript
// POST /api/events/batch
// Rate limit: rl:analytics, 500/min per user
// Max 100 events per batch, 50KB body size
// Zod validation per event
// Returns: { accepted: number, duplicates: number }
```

### Data Volume Estimates

| Scale | MAU | Events/Day | Storage/Month | Neon Tier Needed |
|---|---|---|---|---|
| Seed | 1K | 6,750 | ~70 MB | Launch ($19/mo) |
| Growth | 10K | 67,500 | ~700 MB | Launch ($19/mo) |
| Scale | 100K | 675,000 | ~7 GB | Scale ($69/mo) |

### Deduplication Strategy

1. Client generates UUID per event at capture time, stored in SQLite `analytics_buffer` table
2. Server worker: `INSERT ... ON CONFLICT (client_event_id) DO NOTHING`
3. Batch endpoint returns `{ accepted, duplicates }` for delivery confirmation
4. Reject events with `clientTimestamp` older than 30 days

### Aggregation Strategy

| Data | Strategy | Table |
|---|---|---|
| DAU, registrations, matches | Pre-aggregate hourly + daily | `admin_hourly_metrics`, `admin_daily_metrics` |
| Cohort retention (D1/D7/D30) | Pre-aggregate nightly | `admin_cohort_retention` |
| Feature adoption, user timeline | Compute on-the-fly | Query `analytics_events` |
| Funnels, cohort heatmaps | **Deferred to PostHog** | — |

### Performance Isolation

| Concern | Mitigation |
|---|---|
| API latency | Async-only via BullMQ; batch endpoint returns in ~3ms |
| DB connections | Separate pool for analytics worker (max 2 connections) |
| Neon compute | Cron jobs run during off-peak (01:00, 03:00 UTC) |
| Table bloat | Monthly partitioning + 90-day retention (DROP old partitions) |
| Index size | BRIN index on `server_timestamp` (100x smaller than B-tree) |

---

## 5. Analytics Service Architecture

### Interface (packages/types/) — IMPLEMENTED

```typescript
// packages/types/src/analytics.ts

export interface AnalyticsService {
  identify(userId: string, traits?: Record<string, unknown>): void;
  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]): void;
  reset(): void;
  optIn(): void;
  optOut(): void;
  flush(): Promise<void>;
}
```

Full `AnalyticsEventMap` with ~60 typed events is defined in `packages/types/src/analytics.ts`.

### Mobile Implementation: BufferedAnalyticsService

```typescript
// apps/mobile/services/buffered-analytics-service.ts

// SQLite buffer table: analytics_buffer
// Columns: id, clientEventId, eventName, properties (JSON), timestamp, synced (boolean)
//
// Flush strategy:
// 1. App foreground (AppState listener)
// 2. 60-second interval timer
// 3. Connectivity restored (NetInfo listener)
//
// Flush: SELECT unsent → POST /api/events/batch → mark synced → DELETE synced rows
```

### Mobile DI (tsyringe)

```typescript
// apps/mobile/repositories/tokens.ts
export const ANALYTICS_SERVICE = Symbol('AnalyticsService') as InjectionToken<AnalyticsService>;

// apps/mobile/repositories/container.ts
const analyticsService = __DEV__
  ? createNoOpAnalyticsService()    // Silent in dev mode
  : createBufferedAnalyticsService(); // SQLite buffer + batch POST
container.register(ANALYTICS_SERVICE, { useValue: analyticsService });
```

### Future: PostHog Swap (~1 Day Effort)

When revenue arrives, swap the DI registration:

```typescript
// Change from:
const analyticsService = createBufferedAnalyticsService();
// To:
const analyticsService = createPostHogAnalyticsService(
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
  'https://eu.i.posthog.com',
);
```

No tracking code changes needed — same `AnalyticsService` interface.

### Admin (Named Module Exports)

No client-side analytics SDK in admin. Events tracked server-side via domain events at router level. Admin reads analytics data via `AnalyticsDataRepository`.

### Server-Side Domain Events

Server events tracked at tRPC router level after `unwrapResult()` — keeps domain layer pure (Clean Architecture). See Section 4 for pattern example.

---

## 6. Admin Dashboards

### NOW: KPI Cards Only

The admin dashboard (`/(dashboard)/page.tsx`) displays real-time KPI cards powered by Redis counters and hourly/daily aggregation tables:

- **KPI Cards (real-time):** DAU, new registrations, active matches, moderation queue
- **Charts (hourly refresh):** DAU/MAU trend (30d), registrations vs completions (7d)
- **Alerts:** SLA violations, spike detection, retention drops

### Deferred to PostHog (When Revenue Arrives)

The following pages are **NOT built** in the admin — PostHog provides them out-of-the-box with superior UX:

| Page | PostHog Feature | Why Defer |
|---|---|---|
| `analytics/funnel/page.tsx` | Funnels | PostHog's funnel builder is drag-and-drop, highly customizable |
| `analytics/cohorts/page.tsx` | Retention | PostHog's retention grid with breakdown by properties |
| `analytics/matching/page.tsx` | Insights + Dashboards | PostHog's query builder handles histograms, heatmaps, conversions |
| Session replay | Recordings | Not possible with custom solution |

**Effort saved:** ~6d of custom Recharts development, replaced by PostHog's built-in dashboards.

---

## 7. GDPR Compliance Plan

### Legal Basis Separation — IMPLEMENTED

| Service | Legal Basis | Status | Notes |
|---|---|---|---|
| **Sentry** (error tracking) | **Legitimate interest** (Art. 6(1)(f)) | ALWAYS active | PII scrubbed without consent; full context with consent |
| **Statsig** (remote config) | **Contract necessity** (Art. 6(1)(b)) | ALWAYS active | userId pseudonymized (HMAC-SHA256) |
| **Statsig** (A/B experiment logging) | **Consent** (Art. 6(1)(a)) | Consent-gated | Only event logging, not config delivery |
| **Product analytics** (mobile) | **Consent** (Art. 6(1)(a)) | Consent-gated | ePrivacy Art. 5(3) requires opt-in |
| **Web analytics** (landing) | **Consent** | Consent-gated | Garante 2021 guidelines |
| **Server-side API metrics** | **Legitimate interest** (Art. 6(1)(f)) | ALWAYS active | Pseudonymized, no PII |
| **Admin operational analytics** | **Legitimate interest** | Internal use | Admin users are operators |

### Consent Requirements

Per GDPR Art. 7 and Garante 2021 guidelines, consent must be:
- **Specific**: separate toggles for analytics, A/B testing, error tracking, marketing
- **Informed**: clear Italian-language explanation
- **Freely given**: no bundling with service access, no dark patterns
- **Unambiguous**: affirmative action (no pre-ticked boxes)
- **Withdrawable**: "as easy to withdraw as to give" (Art. 7(3))
- **Re-requested**: every 6 months (Garante requirement)

### Resolved Violations

| # | Violation | Status | Resolution |
|---|---|---|---|
| 1 | Sentry/Statsig init without consent | **RESOLVED** | Sentry: legitimate interest + consent-aware `beforeSend`. Statsig: contract necessity for config, consent for experiments |
| 2 | No `user_consents` table | **RESOLVED** | Table created in `packages/db/src/schema/user-consents.ts` |
| 3 | No consent collection UI | **RESOLVED** | `ConsentModal` shown after auth, toggles in Settings |
| 4 | Privacy/cookie policies are placeholders | **TODO** | Update privacy policy with analytics section |
| 5 | No cookie banner on web | **TODO** | Astro landing page (low priority — Cloudflare Analytics is cookieless) |
| 6 | Raw userId sent to Statsig | **RESOLVED** | HMAC-SHA256 pseudonymization in `statsig-experiment-service.ts` + client-side hash in `_layout.tsx` |
| 7 | No consent withdrawal in Settings | **RESOLVED** | Per-consent toggles in Settings modal |

### Consent Flow — IMPLEMENTED

**Mobile first launch (after authentication):**
1. Present consent modal with individual toggles: Analytics, A/B Testing, Error Tracking, Marketing
2. "Accetta selezionati" and "Rifiuta tutto" buttons of equal prominence
3. Store consent in MMKV via Zustand persist (`useConsentStore`)
4. Sentry reads consent at event time via `useConsentStore.getState()` — full context if consented, PII scrubbed if not
5. Statsig always active (remote config); experiment logging gated by `consents.abTesting`
6. Record consent server-side in `user_consents` table

**Consent withdrawal (Settings > Privacy):**
1. Toggle off in Settings → immediate MMKV update
2. Update `user_consents` table via API
3. Analytics service: `optOut()` + `reset()`

### user_consents Table — IMPLEMENTED

```typescript
// packages/db/src/schema/user-consents.ts
export const userConsents = pgTable(
  'user_consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    consentType: varchar('consent_type', { length: 30 }).notNull(),
    consentVersion: varchar('consent_version', { length: 10 }).notNull().default('v1.0'),
    granted: boolean('granted').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    source: varchar('source', { length: 30 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('user_consents_user_type_uniq').on(t.userId, t.consentType)],
);
```

### Data Retention

| Data Tier | Retention | Action After Expiry |
|---|---|---|
| Raw analytics events | 90 days | Aggregate then DELETE (DROP partition) |
| Aggregated metrics | 24 months | Delete |
| Anonymized statistics | Unlimited | Not personal data (Recital 26) |
| Consent records | Relationship + 5 years | Archive then delete |

### Data Subject Rights

| Right | Implementation |
|---|---|
| Access (Art. 15) | Include analytics data in `exportMyData` response |
| Erasure (Art. 17) | `analytics_events` ON DELETE SET NULL (anonymized, not deleted) |
| Object (Art. 21) | Opt-out toggle in Settings |
| Portability (Art. 20) | JSON export of events + consent records |

### DPIA Requirement

**A DPIA is mandatory** per Art. 35 GDPR and Garante Provvedimento 467/2018:
- Systematic behavioral monitoring (swipe patterns, engagement)
- Location data processing (GPS walks reveal habits)
- Profiling (matching algorithm + analytics)
- Potential minors (Italy: age of digital consent = 14)

---

## 8. Security Requirements

### Event Data Security

| Threat | Mitigation |
|---|---|
| PII in event payloads | Allowlist approach: strict Zod schema per event type, reject unknown properties |
| User identity correlation | HMAC-SHA256 hash of `userId + salt` for third-party destinations; raw UUID only in own Neon DB |
| Client-side event injection | All events via authenticated endpoints, validate `userId` matches JWT `sub` |
| Event flooding / DoS | Dedicated rate limiter: 500 events/min per user, 50/min per unauthenticated IP |
| Analytics data breach | Pseudonymized IDs + no PII = minimized impact |

### Sentry PII Scrubbing — IMPLEMENTED

**Server-side** (`apps/api/src/lib/sentry.ts`): Recursive `scrubPii()` removes email, displayName, passwordHash, pushToken, latitude, longitude, ip_address from all Sentry event contexts.

**Mobile** (`apps/mobile/app/_layout.tsx`): Consent-aware `beforeSend`:
- **Consent given**: Full context (user id, device info, headers) for better debugging
- **No consent**: PII scrubbed — only anonymized id, no headers, no coordinates

### Statsig Pseudonymization — IMPLEMENTED

`apps/api/src/infra/statsig-experiment-service.ts`: `pseudonymizeUserId()` using HMAC-SHA256 with `ANALYTICS_HASH_SALT` env var. Raw UUID never sent to Statsig.

`apps/mobile/app/_layout.tsx`: Client-side `hashUserId()` for `StatsigProviderExpo` user.

### Rate Limiting

```typescript
// Dedicated analytics rate limiter (separate from existing rl:api)
const analyticsRateLimit = new Ratelimit({
  redis: upstashRedis,
  limiter: Ratelimit.slidingWindow(500, '1 m'),
  prefix: 'rl:analytics',
});
```

Batch endpoint limits: max 100 events per batch, max 50KB body size.

### Access Control for Analytics Dashboards

| Level | Who | Access |
|---|---|---|
| Aggregated dashboards | `super_admin` | Counts, funnels, cohorts |
| Raw data export | `super_admin` only, with audit log | Aggregated CSV/JSON |
| Individual user drill-down | Prohibited | Requires explicit justification |

### Third-Party Processor Risk

| Processor | DPA Status | Action Needed |
|---|---|---|
| Statsig | **Not signed** | Sign DPA, userId pseudonymized (DONE) |
| Sentry | **Not signed** | Sign DPA, PII scrubbing implemented (DONE) |
| Expo Push | **Not signed** | Sign DPA |
| Resend | **Not signed** | Sign DPA |
| Neon | **Needs verification** | Verify DPA coverage |

> **Note:** PostHog is NOT a current processor. Will need DPA when added.

---

## 9. Blockers & Implementation Order

### P0 — Must Fix Before Any Analytics Event — DONE

| # | Item | Status |
|---|---|---|
| 1 | Create `user_consents` table | **DONE** — `packages/db/src/schema/user-consents.ts` |
| 2 | Implement consent collection UI (mobile modal) | **DONE** — `ConsentModal` + Settings toggles |
| 3 | Separate Sentry/Statsig legal basis (not blindly consent-gated) | **DONE** — Sentry: legitimate interest; Statsig config: contract necessity |
| 4 | Hash userId before sending to any third-party | **DONE** — HMAC-SHA256 server + client hash |
| 5 | Sentry `beforeSend` PII scrubber (consent-aware) | **DONE** — server + mobile |
| 6 | `AnalyticsEventMap` + `AnalyticsService` interface | **DONE** — `packages/types/src/analytics.ts` |

### Sprint N — Server-First Pipeline

| # | Item | Effort |
|---|---|---|
| 7 | Consent API endpoint (tRPC mutation `consent.update`) | 1d |
| 8 | DB push: `drizzle-kit push` for new tables on Neon | 0.5d |
| 9 | `BufferedAnalyticsService` (SQLite buffer + batch POST) | 2d |
| 10 | `NoOpAnalyticsService` (dev mode) | 0.5d |
| 11 | DI token `ANALYTICS_SERVICE` + container registration | 0.5d |
| 12 | `POST /api/events/batch` Hono route (Zod validation + BullMQ) | 1d |
| 13 | Analytics rate limiter (`rl:analytics`, 500/min) | 0.5d |
| 14 | Analytics BullMQ worker (batch INSERT + ON CONFLICT DO NOTHING) | 1d |
| 15 | Privacy policy update with analytics section | 1d |

### Sprint N+1 — Instrumentation + Admin KPIs

| # | Item | Effort |
|---|---|---|
| 16 | Server-side domain event tracking (router-level pattern) | 1d |
| 17 | Instrument auth + onboarding flows (hybrid events) | 1d |
| 18 | Instrument matching + chat + walk events (server-authoritative) | 2d |
| 19 | Redis real-time counters (Hono middleware) | 1d |
| 20 | BullMQ cron jobs (hourly, daily, cohort aggregation) | 2d |
| 21 | Admin dashboard KPI cards | 2d |

### Sprint N+2 — Compliance + Data Rights

| # | Item | Effort |
|---|---|---|
| 22 | `deleteAccount` with analytics anonymization (SET NULL) | 1d |
| 23 | `exportMyData` including analytics data + consent records | 1d |
| 24 | DPIA documentation | 1d |
| 25 | Sign DPAs with all processors | 1d |
| 26 | Consent re-request mechanism (6-month Garante cycle) | 1d |

### Future — PostHog Migration (When Revenue Arrives, ~1 Day)

| # | Item | Effort |
|---|---|---|
| 27 | Add `posthog-react-native` SDK | 0.25d |
| 28 | Create `PostHogAnalyticsService` implementing `AnalyticsService` | 0.25d |
| 29 | Swap DI registration in `container.ts` | 0.1d |
| 30 | Sign PostHog DPA (EU Teams plan) | 0.1d |
| 31 | Configure PostHog dashboards (funnels, cohorts, retention) | 0.25d |
| **Total** | | **~1d** |

---

## Cross-Team Consensus

| Topic | Sara (Analytics) | Elena (Data Eng) | Davide (Security) | Giulia (GDPR) | Luca (Architect) |
|---|---|---|---|---|---|
| **Architecture** | Server-first | Single data store | Server validates | EU-only pipeline | Clean Architecture: track at router, not use-case |
| **Tool** | Neon now, PostHog later | Same DB, BullMQ pipeline | Server-authoritative | No third-party at MVP | Transport-agnostic interface |
| **User IDs** | Opaque userId | UUID with dedup | HMAC-hashed for third-party | Pseudonymized | Raw UUID only in own DB |
| **Consent** | Gate client analytics | N/A (server-side) | Gate all tracking | P0 blocker, mandatory | Consent-aware Sentry |
| **Data retention** | 90d raw + aggregates | 90d raw + aggregates | 90d + encryption | 90d raw, 24mo aggregated | Monthly partitions |
| **Admin dashboards** | KPI cards now | Cron aggregation | Access control | Audit log required | PostHog for complex viz |

**Agreed architecture**: Server-first single data store (unanimous).
**Agreed retention**: 90 days raw events, 24 months aggregated, unlimited anonymized.
**Agreed ID strategy**: HMAC-SHA256 hash for all third-party destinations, raw UUID only in own Neon DB.
**Agreed PostHog timing**: Add when revenue arrives (~1 day effort, EUR 37.50/mo EU Teams).
**Agreed admin scope**: KPI cards only — no funnel/cohort/matching pages (PostHog provides them later).
