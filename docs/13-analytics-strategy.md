# 13 — Analytics Strategy

**Date:** 2026-03-12 (rev. 2 — PostHog NOW, OpenPanel future)
**Authors:** Sara Conti (Analytics Engineer), Elena Ricci (Data Engineer), Davide Moretti (Data Security), Giulia Fontana (GDPR/Privacy), Luca Bianchi (Software Architect)
**Status:** Approved — PostHog Cloud EU free tier active, dual-write architecture

---

## Executive Summary

This document consolidates the analysis of 5 specialists on product analytics for PawMeet. The architecture is a **dual-write pipeline**: events flow through the server-side BullMQ pipeline into both **Neon** (authoritative source of truth, audit log) and **PostHog Cloud EU** (free tier, visualization and product analytics).

**PostHog is active NOW** — not deferred to a future revenue milestone. PostHog Cloud free tier (up to 1M events/month) with **EU data residency** provides funnels, cohorts, retention, and session replay at EUR 0 additional cost.

**Future migration to OpenPanel** is planned. The `AnalyticsProvider` port in the analytics worker abstracts the external provider — swapping PostHog → OpenPanel is a single-file implementation change with zero impact on tracking code, the Neon pipeline, or the mobile client.

**P0 blockers resolved:** Consent infrastructure is implemented — `user_consents` table, mobile consent modal + settings toggles, Sentry PII scrubbing (consent-aware), Statsig userId pseudonymization, and proper GDPR legal basis separation.

**Architecture principle:** All analytics events (both client-originated and server-originated) flow through a single server-side pipeline into `analytics_events` in Neon, then are forwarded to PostHog via the `AnalyticsProvider` abstraction. Neon is the source of truth. PostHog is the visualization layer. The `AnalyticsService` interface on mobile remains transport-agnostic.

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

| Criterion | Neon + BullMQ (audit log) | PostHog Cloud EU (free) | OpenPanel (future) |
|---|---|---|---|
| **Cost** | EUR 0 (existing infra) | EUR 0 (up to 1M events/mo) | EUR 0 (self-hosted on Fly.io) |
| **GDPR EU hosting** | Full control, Neon eu-central-1 | EU data residency (free tier) | Full control, self-hosted |
| **Funnels/Cohorts** | Custom queries only | Built-in | Built-in |
| **Session replay** | No | Yes (5K sessions/mo free) | No |
| **Data ownership** | Full ownership | PostHog retains copy | Full ownership |
| **Open source** | N/A | Partially | Fully |

### Decision: Dual-Write — Neon + PostHog NOW, OpenPanel FUTURE

1. **NOW (EUR 0):** Dual-write pipeline. All events flow through BullMQ into both Neon (`analytics_events` table, source of truth) and PostHog Cloud EU (free tier, visualization). Admin keeps KPI cards from Neon; PostHog provides funnels, cohorts, retention, session replay.
2. **Cloudflare Web Analytics** (already deployed) for the landing page — no analytics SDK on marketing site.
3. **FUTURE:** Swap PostHog → **OpenPanel** (open-source, self-hosted on Fly.io) when deeper customization or cost optimization is needed. The `AnalyticsProvider` port makes the swap a single-file change in the analytics worker.

### Why PostHog NOW?

- PostHog Cloud free tier **supports EU data residency** — GDPR-compliant at EUR 0
- Funnels, cohorts, retention grids, and session replay from day 1 — no custom Recharts development (~6d saved)
- Server-side dual-write via BullMQ worker keeps PostHog off the hot path (async, best-effort)
- Neon stays the authoritative source of truth — PostHog is additive, not a replacement
- The `AnalyticsProvider` abstraction ensures no vendor lock-in

### Why OpenPanel FUTURE?

- Fully open-source, self-hostable on existing Fly.io infrastructure (EUR 0 platform cost)
- No data leaves our infrastructure — full GDPR sovereignty
- Similar API to PostHog — migration via `AnalyticsProvider` swap is ~1 day
- Better long-term cost profile at scale (no per-event metered pricing)

### Cost Projection

| Phase | Monthly Cost | Notes |
|---|---|---|
| MVP (0-5K users) | EUR 0 | Neon + PostHog Cloud EU free tier |
| Growth (5K-20K) | EUR 0 | Still within PostHog free 1M events/mo |
| Scale (20K+) | EUR 0-15 | Evaluate OpenPanel self-hosted on Fly.io |

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

### Event Flow (Dual-Write, Server-First)

```
Mobile Client                           Server (Hono API)
    │                                       │
    ├─ Client-exclusive events ─────────────┤
    │  (in-memory buffer → POST /api/events/batch)
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
    │              analytics_events   Redis counters    AnalyticsProvider[]
    │              (Neon PostgreSQL)   (real-time KPIs)  ├─ PostHog (NOW)
    │              [source of truth]                     └─ OpenPanel (FUTURE)
    │
    └─ Offline? In-memory buffer holds events, flushes on:
       • App foreground
       • 60-second timer
       • Connectivity restored
```

### Why Dual-Write?

1. **Authoritative data**: Neon confirms actions actually happened — PostHog is best-effort visualization
2. **Provider independence**: `AnalyticsProvider` port abstracts PostHog/OpenPanel — swap with zero tracking code changes
3. **Failure isolation**: PostHog failure does NOT lose events — Neon has them, backfill possible
4. **EU data residency**: Neon eu-central-1 + PostHog EU region — both GDPR-compliant
5. **Transport-agnostic**: `AnalyticsService` interface on mobile unchanged
6. **Offline-resilient**: In-memory buffer on mobile handles connectivity gaps

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

### Server-Side AnalyticsProvider Port (Dual-Write)

The analytics worker uses an `AnalyticsProvider` port to forward events to external providers after the Neon write:

```typescript
// apps/api/src/ports/analytics-provider.ts
export interface AnalyticsProvider {
  readonly name: string;
  capture(events: ReadonlyArray<AnalyticsProviderEvent>): Promise<void>;
  shutdown(): Promise<void>;
}

export interface AnalyticsProviderEvent {
  distinctId: string;           // pseudonymized userId (HMAC-SHA256)
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}
```

**NOW:** `PostHogAnalyticsProvider` wraps `posthog-node`, sends to `https://eu.i.posthog.com`.
**FUTURE:** `OpenPanelAnalyticsProvider` wraps OpenPanel SDK — same interface, single-file swap.

The worker receives `providers: AnalyticsProvider[]` at construction. After each Neon `INSERT`, it iterates providers. PostHog failures are caught and logged as warnings — they never fail the BullMQ job or lose events from Neon.

**Identity rule:** Raw UUIDs from `analytics_events.userId` are pseudonymized via `pseudonymizeUserId()` (HMAC-SHA256 + `ANALYTICS_HASH_SALT`) before being sent as PostHog `distinct_id`. Same function used for Statsig, extracted to `apps/api/src/lib/pseudonymize.ts`.

### Mobile: No PostHog SDK (Server-Side Only)

No PostHog mobile SDK is installed. All events (client and server) reach PostHog through the server-side dual-write in the analytics worker. This keeps the mobile app simple, avoids a second data path, and ensures all events pass through server-side Zod validation.

The mobile `BufferedAnalyticsService` (posting to `POST /api/events/batch`) and the `AnalyticsService` DI registration are unchanged.

### Future: OpenPanel Swap (~1 Day Effort)

When moving to OpenPanel, change only the analytics worker:

```typescript
// apps/api/src/container.ts — swap provider registration
const analyticsProviders: AnalyticsProvider[] = [
  // new OpenPanelAnalyticsProvider(process.env.OPENPANEL_API_KEY ?? ''),
  // ↑ replaces PostHogAnalyticsProvider
];
```

No changes to `trackEvent()`, the batch endpoint, `AnalyticsService` interface, mobile code, or admin dashboard queries.

### Admin (Named Module Exports)

No client-side analytics SDK in admin. Events tracked server-side via domain events at router level. Admin reads operational KPIs from Neon via `AnalyticsDataRepository`. Product analytics (funnels, cohorts, retention) accessed directly in PostHog UI.

### Server-Side Domain Events

Server events tracked at tRPC router level after `unwrapResult()` — keeps domain layer pure (Clean Architecture). See Section 4 for pattern example.

---

## 6. Admin Dashboards

### Admin: Operational KPIs from Neon

The admin dashboard (`/(dashboard)/page.tsx`) displays real-time KPI cards powered by Redis counters and Neon aggregation tables:

- **KPI Cards (real-time):** DAU, new registrations, active matches, moderation queue
- **Charts (hourly refresh):** DAU/MAU trend (30d), registrations vs completions (7d)
- **Alerts:** SLA violations, spike detection, retention drops

Admin reads from Neon, NOT from PostHog API — no external HTTP dependency for operational dashboards.

### PostHog: Product Analytics (Available NOW)

The following are handled by PostHog — NOT built as custom admin pages:

| Capability | PostHog Feature | Access |
|---|---|---|
| Funnel analysis | Funnels (drag-and-drop builder) | PostHog UI |
| Retention cohorts | Retention grid with breakdowns | PostHog UI |
| Matching quality | Insights + custom dashboards | PostHog UI |
| Session replay | Recordings (5K sessions/mo free) | PostHog UI |
| A/B test analysis | Experiments (if needed) | PostHog UI |

**Effort saved:** ~6d of custom Recharts development, replaced by PostHog's built-in dashboards.

**Optional:** PostHog shared dashboard links can be embedded in admin via `<iframe>` — zero backend work.

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
| **PostHog** (EU region) | **Not signed** | Sign DPA before first event, userId pseudonymized via HMAC-SHA256 |
| Statsig | **Not signed** | Sign DPA, userId pseudonymized (DONE) |
| Sentry | **Not signed** | Sign DPA, PII scrubbing implemented (DONE) |
| Expo Push | **Not signed** | Sign DPA |
| Resend | **Not signed** | Sign DPA |
| Neon | **Needs verification** | Verify DPA coverage |

> **Note:** PostHog receives only pseudonymized `distinct_id` (HMAC-SHA256 hash), never raw UUIDs or PII. EU data residency selected on the free tier.

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

### Sprint N — PostHog Integration + Pipeline Completion

| # | Item | Effort |
|---|---|---|
| 7 | Create PostHog Cloud EU project, configure EU data residency, IP anonymization ON | 0.25d |
| 8 | Sign PostHog DPA (free tier) | 0.25d |
| 9 | Create `AnalyticsProvider` port (`apps/api/src/ports/analytics-provider.ts`) | 0.5d |
| 10 | Create `PostHogAnalyticsProvider` (`apps/api/src/infra/posthog-analytics-provider.ts`) + install `posthog-node` | 0.5d |
| 11 | Extract `pseudonymizeUserId()` to `apps/api/src/lib/pseudonymize.ts` (shared by Statsig + PostHog) | 0.25d |
| 12 | Add dual-write to analytics worker: forward to `AnalyticsProvider[]` after Neon INSERT, PostHog errors caught silently | 1d |
| 13 | Add `posthog.shutdown()` to graceful shutdown in `workers.ts` | 0.25d |
| 14 | Add `POSTHOG_API_KEY` + `POSTHOG_HOST` env vars (Fly.io secrets + `.env.example`) | 0.25d |
| 15 | Consent API endpoint (tRPC mutation `consent.update`) | 1d |
| 16 | Fix: add `consentGiven: true` to mobile batch POST body in `buffered-analytics-service.ts` | 0.25d |
| 17 | Fix: bulk upsert in `analytics-aggregation.ts` (replace serial N+1 loop) | 0.5d |
| 18 | Unit tests: PostHog capture called per event, errors don't fail job, dedup UUID passed | 0.5d |

### Sprint N+1 — Instrumentation + Admin KPIs

| # | Item | Effort |
|---|---|---|
| 19 | Instrument remaining routers: dogs, feed, walks, feedback, users, group-events, social | 2d |
| 20 | Instrument client-exclusive events on mobile: onboarding, match feed, app lifecycle, permissions | 1d |
| 21 | Redis real-time counters (Hono middleware) | 1d |
| 22 | BullMQ cron jobs (hourly, daily aggregation) | 1d |
| 23 | Admin dashboard KPI cards | 2d |
| 24 | Configure PostHog dashboards: onboarding funnel, registration funnel, match→chat→walk funnel | 0.5d |
| 25 | Configure PostHog retention cohorts (D1/D7/D30) and alerts | 0.5d |

### Sprint N+2 — Compliance + Data Rights

| # | Item | Effort |
|---|---|---|
| 26 | `deleteAccount` with analytics anonymization (SET NULL) + PostHog person delete API call | 1d |
| 27 | `exportMyData` including analytics data + consent records | 1d |
| 28 | Privacy policy update with analytics section (list PostHog EU as processor) | 1d |
| 29 | Update consent modal Italian text to reference PostHog EU per Garante transparency | 0.25d |
| 30 | DPIA documentation (include PostHog EU as processor) | 1d |
| 31 | Sign DPAs with all processors | 1d |
| 32 | Consent re-request mechanism (6-month Garante cycle) | 1d |

### Future — OpenPanel Migration (~1 Day)

| # | Item | Effort |
|---|---|---|
| 33 | Create `OpenPanelAnalyticsProvider` implementing `AnalyticsProvider` | 0.5d |
| 34 | Swap provider registration in `container.ts` | 0.1d |
| 35 | Backfill historical events from Neon to OpenPanel (one-time script) | 0.25d |
| 36 | Re-create funnel/cohort definitions in OpenPanel UI | 0.25d |
| **Total** | | **~1d** |

---

## Cross-Team Consensus (rev. 2 — 2026-03-12)

| Topic | Sara (Analytics) | Elena (Data Eng) | Davide (Security) | Giulia (GDPR) | Luca (Architect) |
|---|---|---|---|---|---|
| **Architecture** | Dual-write: Neon + PostHog | Neon source of truth, PostHog best-effort | Server validates, PostHog errors isolated | EU data residency on both stores | `AnalyticsProvider` port for provider swap |
| **Tool** | PostHog Cloud EU now, OpenPanel future | Same BullMQ pipeline, add provider forward | Server-authoritative, pseudonymized IDs | PostHog DPA required before go-live | Transport-agnostic interface preserved |
| **User IDs** | Opaque userId | UUID with dedup in Neon | HMAC-hashed for PostHog `distinct_id` | Pseudonymized, no raw UUID to PostHog | Raw UUID only in own DB |
| **Consent** | Gate client analytics | N/A (server-side) | Gate PostHog forward on consent | P0 blocker, mandatory | Consent-aware Sentry + PostHog |
| **Data retention** | 90d Neon + PostHog default | 90d raw Neon + aggregates | 90d + person delete on account removal | 90d Neon, PostHog retains per their policy | Monthly partitions (future) |
| **Admin dashboards** | KPI cards from Neon | Cron aggregation for Neon | Access control | Audit log required | PostHog UI for funnels/cohorts |

**Agreed architecture**: Dual-write — Neon (source of truth) + PostHog Cloud EU (visualization) via `AnalyticsProvider` port (unanimous).
**Agreed retention**: 90 days raw events in Neon, 24 months aggregated, unlimited anonymized. PostHog retains per their default policy.
**Agreed ID strategy**: HMAC-SHA256 hash for PostHog `distinct_id` and all third-party destinations, raw UUID only in own Neon DB.
**Agreed provider strategy**: PostHog Cloud EU free tier NOW, OpenPanel self-hosted FUTURE (~1 day swap via `AnalyticsProvider`).
**Agreed admin scope**: KPI cards from Neon, product analytics (funnels, cohorts, retention) via PostHog UI.
**Agreed mobile**: No PostHog SDK — all events flow through server-side dual-write.
