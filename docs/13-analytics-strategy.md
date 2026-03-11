# 13 — Analytics Strategy

**Date:** 2026-03-11
**Authors:** Sara Conti (Analytics Engineer), Elena Ricci (Data Engineer), Davide Moretti (Data Security), Giulia Fontana (GDPR/Privacy)
**Status:** Proposal — awaiting team review

---

## Executive Summary

This document consolidates the analysis of 4 specialists on introducing product analytics into DogWalk. The recommendation is **PostHog Cloud (free tier)** for client-side product analytics + **custom server-side aggregation** (Neon + BullMQ) for admin dashboards, with a clear migration path to PostHog self-hosted on Fly.io Frankfurt.

**Critical finding:** The codebase currently has **zero consent infrastructure**. Both Sentry and Statsig initialize unconditionally before any user consent. Launching analytics without fixing this would violate GDPR Art. 6/7 and expose the company to Garante enforcement. **6 P0 blockers must be resolved first.**

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

| Criterion | PostHog Cloud (free) | PostHog Self-Hosted | Plausible | Custom (Neon + BullMQ) |
|---|---|---|---|---|
| **Cost** | EUR 0 (up to 1M events/mo) | EUR 15-30/mo (Fly.io VM) | EUR 9/mo (web only) | EUR 0 (existing infra) |
| **GDPR EU hosting** | US (EU on Teams plan EUR 450/yr) | Full control, Frankfurt | EU | Full control, Neon eu-central-1 |
| **Mobile SDK** | `posthog-react-native` (offline queue built-in) | Same SDK | No mobile SDK | Custom build required |
| **Funnels/Cohorts** | Built-in | Same | No | Must build from scratch |
| **Session replay** | Yes (5K sessions/mo free) | Yes | No | No |
| **Data ownership** | PostHog retains | Full ownership | SaaS | Full ownership |

### Decision: Hybrid Approach

1. **PostHog Cloud (free tier)** for client-side product analytics — funnels, cohorts, session replay. 1M events/month covers up to ~10K MAU.
2. **Custom server-side aggregation** (already planned in docs/08) for admin KPI dashboards — `admin_daily_metrics`, `admin_hourly_metrics`, `admin_cohort_retention` tables populated by BullMQ cron jobs.
3. **Cloudflare Web Analytics** (already deployed) for the landing page — no PostHog on marketing site.
4. **Migration path**: If free tier exceeded or EU data residency becomes hard requirement, migrate to PostHog self-hosted on Fly.io Frankfurt.

### Cost Projection

| Phase | Monthly Cost |
|---|---|
| MVP (0-5K users) | EUR 0 |
| Growth (5K-20K) | EUR 0-30 (evaluate self-hosted) |
| Scale (20K+) | EUR 15-50 (self-hosted) or EUR 37.50 (PostHog Teams EU) |

---

## 2. Event Taxonomy

### Naming Convention

All events use `object_action` format in lowercase snake_case. Properties use camelCase in TypeScript code.

### Auth Events

| Event | Properties | Informs |
|---|---|---|
| `auth_registration_started` | `method: 'email' \| 'google' \| 'apple'` | Auth method investment |
| `auth_registration_completed` | `method`, `durationMs` | Registration funnel |
| `auth_registration_failed` | `method`, `errorCode` | Auth UX issues |
| `auth_login_completed` | `method` | Auth method popularity |
| `auth_login_failed` | `method`, `errorCode` | Login friction |
| `auth_email_verified` | `method: 'link' \| 'otp'`, `delayMs` | Verification effectiveness |
| `auth_logout` | `reason: 'manual' \| 'token_expired' \| 'forced'` | Session health |

### Onboarding Events

| Event | Properties | Informs |
|---|---|---|
| `onboarding_started` | `source: 'organic' \| 'referral' \| 'ad' \| 'unknown'` | Acquisition quality |
| `onboarding_step_viewed` | `stepNumber`, `stepName` | Step visibility |
| `onboarding_step_completed` | `stepNumber`, `stepName`, `durationMs` | Drop-off identification |
| `onboarding_step_skipped` | `stepNumber`, `stepName` | User resistance |
| `onboarding_completed` | `totalDurationMs`, `stepsCompleted`, `authMethod` | End-to-end conversion |
| `onboarding_abandoned` | `lastStepNumber`, `lastStepName`, `totalDurationMs` | Where users give up |

Step names: `'welcome'`, `'registration'`, `'owner_profile'`, `'dog_basics'`, `'dog_physical'`, `'dog_behavior'`, `'dog_photos'`, `'permissions'`, `'tutorial'`

### Dog Profile Events

| Event | Properties | Informs |
|---|---|---|
| `dog_profile_created` | `breed`, `size`, `energyLevel`, `photoCount`, `isNeutered` | Dog demographics |
| `dog_profile_updated` | `fieldsChanged: string[]` | UX friction |
| `dog_photo_uploaded` | `position`, `fileSizeKb` | Photo patterns |
| `dog_photo_moderation_result` | `result: 'approved' \| 'rejected'`, `rejectionReason?`, `durationMs` | Moderation health |

### Matching Events

| Event | Properties | Informs |
|---|---|---|
| `match_feed_loaded` | `cardsAvailable`, `avgCompatibilityScore` | Feed quality |
| `match_card_viewed` | `compatibilityScore`, `distanceKm`, `viewDurationMs` | Card engagement |
| `match_swipe_performed` | `direction`, `compatibilityScore`, `distanceKm`, `viewDurationMs`, `sizePair`, `energyPair` | Algorithm tuning |
| `match_created` | `compatibilityScore`, `distanceKm`, `sizePair`, `energyPair` | Match quality |
| `match_unmatched` | `reason`, `matchAgeDays`, `messageCount` | Match health |
| `match_feed_exhausted` | `totalSwipesSession`, `searchRadiusKm` | Content supply |

### Chat Events

| Event | Properties | Informs |
|---|---|---|
| `chat_opened` | `matchAgeDays`, `isFirstOpen` | Match-to-chat timing |
| `chat_message_sent` | `messageType: 'text' \| 'image'`, `chatAgeHours`, `messageCountInChat` | Chat depth |

### Walk Events

| Event | Properties | Informs |
|---|---|---|
| `walk_proposed` | `matchAgeHours`, `messageCountBeforeProposal` | Chat-to-walk conversion |
| `walk_response` | `response: 'accepted' \| 'declined' \| 'counter'`, `proposalAgeHours` | Proposal effectiveness |
| `walk_completed` | `durationMinutes`, `distanceKm`, `participantCount` | Walk quality |
| `walk_feedback_submitted` | `rating`, `hasComment` | Post-walk engagement |

### Gamification Events

| Event | Properties | Informs |
|---|---|---|
| `gamification_badge_earned` | `badgeId`, `badgeName`, `badgeCategory` | Badge earn rates |
| `gamification_xp_awarded` | `amount`, `source` | XP economy health |
| `gamification_level_up` | `newLevel`, `totalXp` | Progression pacing |
| `gamification_streak_broken` | `streakLength`, `streakType` | Retention risk |

### App Lifecycle Events

| Event | Properties | Informs |
|---|---|---|
| `app_opened` | `hoursSinceLastOpen`, `isNotificationDriven`, `notificationType?` | Retention, push effectiveness |
| `app_backgrounded` | `sessionDurationMs`, `screenCount` | Session depth |
| `privacy_consent_updated` | `analytics: boolean`, `marketing: boolean` | Consent rate |

### PII Rules (Hard Constraints)

The following MUST NEVER appear in any analytics event:

| Data | Alternative |
|---|---|
| Email address | Opaque `userId` (hashed) |
| Display name | Opaque `userId` (hashed) |
| Exact GPS coordinates | `distanceKm` (rounded) |
| IP address | PostHog config: `disableGeoip: true` |
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

---

## 4. Data Pipeline Architecture

### Event Flow

```
Mobile/Web Client
    │
    ▼  (PostHog SDK — offline queue, batch flush)
  PostHog Cloud (EU when available)
    │
    ▼  (Dashboards: funnels, cohorts, session replay)

Mobile/Web Client
    │
    ▼  (tRPC mutation or POST /events/batch — fire-and-forget)
  Hono API (Fly.io)
    │
    ├──▶ BullMQ "analytics" queue (async, non-blocking)
    │         │
    │         ▼
    │     Analytics Worker
    │         │
    │         ▼
    │     analytics_events table (Neon PostgreSQL)
    │
    ▼  (cron jobs)
  BullMQ Cron Workers
    │
    ├──▶ admin_hourly_metrics   (every hour)
    ├──▶ admin_daily_metrics    (01:00 UTC)
    ├──▶ admin_cohort_retention (03:00 UTC)
    └──▶ admin_funnel_metrics   (every 6h)
```

### Raw Events Table (Drizzle ORM)

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
    platform: varchar('platform', { length: 10 }).notNull(), // 'ios' | 'android' | 'web'
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

### Funnel Metrics Table

```sql
CREATE TABLE admin_funnel_metrics (
    date           DATE NOT NULL,
    funnel_name    VARCHAR(50) NOT NULL,
    step_name      VARCHAR(50) NOT NULL,
    step_order     SMALLINT NOT NULL,
    users_entered  INTEGER NOT NULL DEFAULT 0,
    users_completed INTEGER NOT NULL DEFAULT 0,
    computed_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (date, funnel_name, step_name)
);
```

### Data Volume Estimates

| Scale | MAU | Events/Day | Storage/Month | Neon Tier Needed |
|---|---|---|---|---|
| Seed | 1K | 6,750 | ~70 MB | Launch ($19/mo) |
| Growth | 10K | 67,500 | ~700 MB | Launch ($19/mo) |
| Scale | 100K | 675,000 | ~7 GB | Scale ($69/mo) |

> **Finding:** Neon Free tier (0.5 GB) is already insufficient even without analytics due to `walk_track_points` and feed tables. Upgrade to Launch is necessary.

### Deduplication Strategy

1. Client generates UUID per event at capture time, stored in SQLite
2. Server worker: `INSERT ... ON CONFLICT (client_event_id) DO NOTHING`
3. Batch endpoint returns `{ accepted, duplicates }` for delivery confirmation
4. Reject events with `clientTimestamp` older than 30 days

### Aggregation Strategy

| Data | Strategy | Table |
|---|---|---|
| DAU, registrations, matches | Pre-aggregate hourly + daily | `admin_hourly_metrics`, `admin_daily_metrics` |
| Cohort retention (D1/D7/D30) | Pre-aggregate nightly | `admin_cohort_retention` |
| Onboarding funnel | Pre-aggregate every 6h | `admin_funnel_metrics` |
| Feature adoption, user timeline | Compute on-the-fly | Query `analytics_events` |

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

### Interface (packages/types/)

```typescript
// packages/types/src/analytics.ts

export const ANALYTICS_EVENT_CATEGORIES = {
  AUTH: 'auth',
  ONBOARDING: 'onboarding',
  DOG: 'dog',
  MATCH: 'match',
  CHAT: 'chat',
  WALK: 'walk',
  GAMIFICATION: 'gamification',
  GROUP: 'group',
  FEED: 'feed',
  APP: 'app',
  PERMISSION: 'permission',
  PRIVACY: 'privacy',
} as const;

export interface AnalyticsEventMap {
  // Auth
  auth_registration_started: { method: 'email' | 'google' | 'apple' };
  auth_registration_completed: { method: 'email' | 'google' | 'apple'; durationMs: number };
  // ... (all events from Section 2)

  // Matching
  match_swipe_performed: {
    direction: 'right' | 'left';
    compatibilityScore: number;
    distanceKm: number;
    viewDurationMs: number;
    sizePair: string;
    energyPair: string;
  };
  // ... etc.
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

export interface AnalyticsService {
  identify(userId: string, traits?: Record<string, unknown>): void;
  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]): void;
  reset(): void;
  optIn(): void;
  optOut(): void;
  flush(): Promise<void>;
}
```

### Mobile (tsyringe DI)

```typescript
// apps/mobile/repositories/tokens.ts
export const ANALYTICS_SERVICE = Symbol('AnalyticsService') as InjectionToken<AnalyticsService>;

// apps/mobile/repositories/container.ts
const analyticsService = __DEV__
  ? createNoOpAnalyticsService()
  : createPostHogAnalyticsService(
      process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
      process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    );
container.register(ANALYTICS_SERVICE, { useValue: analyticsService });
```

PostHog React Native SDK provides built-in SQLite offline queue — no custom offline implementation needed.

### Admin (Named Module Exports)

No client-side PostHog SDK in admin. Events tracked server-side via Hono middleware. Admin only reads analytics data via `AnalyticsDataRepository`.

### Server-Side (Hono Middleware)

Server-side events for un-spoofable actions (match creation, walk completion). Increments Redis counters for real-time dashboard + enqueues BullMQ jobs for aggregation.

### PostHog SDK Config (GDPR)

```typescript
new PostHog(apiKey, {
  host: 'https://eu.i.posthog.com',
  defaultOptIn: false,                    // Opted OUT by default
  sendFeatureFlagEvent: false,
  captureNativeAppLifecycleEvents: false, // Manual control
  disableGeoip: true,                     // No IP geolocation
});
```

---

## 6. Admin Dashboards

Mapped to routes already planned in docs/08:

### `/(dashboard)/page.tsx` — Homepage

- **KPI Cards (real-time):** DAU, new registrations, active matches, moderation queue
- **Charts (hourly refresh):** DAU/MAU trend (30d), registrations vs completions (7d)
- **Alerts:** SLA violations, spike detection, retention drops

### `/(dashboard)/analytics/funnel/page.tsx`

Onboarding funnel visualization (Recharts):
`onboarding_started` → `auth_registration_completed` → `dog_profile_created` → `onboarding_completed` → First swipe → First match

### `/(dashboard)/analytics/cohorts/page.tsx`

Retention grid (heatmap): rows = registration week cohort, columns = D1/D7/D14/D30/D60/D90

### `/(dashboard)/analytics/matching/page.tsx`

- Compatibility score distribution (histogram)
- Match rate by size/energy pair (heatmap matrix)
- Match-to-chat-to-walk conversion funnel

---

## 7. GDPR Compliance Plan

### Legal Basis

| Processing | Legal Basis | Notes |
|---|---|---|
| Product analytics (mobile) | **Consent** (Art. 6(1)(a)) | ePrivacy Art. 5(3) requires opt-in for device storage access |
| Web analytics (landing) | **Consent** | Garante 2021 guidelines: analytical trackers require prior consent |
| Server-side API metrics | **Legitimate interest** (Art. 6(1)(f)) | Only if pseudonymized, no PII |
| Admin operational analytics | **Legitimate interest** | Internal use, admin users are operators |

### Consent Requirements

Per GDPR Art. 7 and Garante 2021 guidelines, consent must be:
- **Specific**: separate toggles for analytics, A/B testing, error tracking, marketing
- **Informed**: clear Italian-language explanation
- **Freely given**: no bundling with service access, no dark patterns
- **Unambiguous**: affirmative action (no pre-ticked boxes)
- **Withdrawable**: "as easy to withdraw as to give" (Art. 7(3))
- **Re-requested**: every 6 months (Garante requirement)

### Current Violations (Must Fix)

| # | Violation | GDPR Article |
|---|---|---|
| 1 | Statsig + Sentry initialize unconditionally before consent | Art. 5(3) ePrivacy, Art. 6/7 |
| 2 | No `user_consents` table exists | Art. 7(1) |
| 3 | Registration screen has no consent checkboxes | Art. 7(2) |
| 4 | Privacy/cookie policies are placeholders | Art. 13/14 |
| 5 | No cookie banner on web | Garante 2021 guidelines |
| 6 | Raw userId sent to Statsig (US) without pseudonymization | Art. 44-49, Art. 25 |
| 7 | No consent withdrawal mechanism in Settings | Art. 7(3) |

### Consent Flow

**Mobile first launch (after registration):**
1. Present consent modal with individual toggles: Analytics, A/B Testing, Error Reporting
2. "Accetta selezionati" and "Rifiuta tutto" buttons of equal prominence
3. Store consent in MMKV (using `createMMKV()`)
4. Gate Statsig/Sentry/PostHog initialization behind consent state
5. Record consent server-side in `user_consents` table

**Consent withdrawal (Settings > Privacy):**
1. `analyticsService.optOut()` + `analyticsService.reset()` (immediate)
2. Update `analytics_consent = false` via API
3. Enqueue BullMQ job to delete user data from PostHog via API

### user_consents Table (Required)

```sql
CREATE TABLE user_consents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type    TEXT NOT NULL,  -- 'analytics', 'ab_testing', 'error_tracking', 'marketing'
    consent_version TEXT NOT NULL,  -- 'v1.0' — links to privacy policy version
    granted         BOOLEAN NOT NULL,
    granted_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    withdrawn_at    TIMESTAMP WITH TIME ZONE,
    ip_address      TEXT,          -- anonymized (last octet zeroed)
    user_agent      TEXT,
    source          TEXT NOT NULL,  -- 'mobile_onboarding', 'web_banner', 'settings'
    UNIQUE (user_id, consent_type)
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
| Erasure (Art. 17) | Cascade to PostHog API + analytics_events ON DELETE SET NULL |
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
| User identity correlation | HMAC-SHA256 hash of `userId + salt` for analytics IDs |
| Client-side event injection | All events via authenticated endpoints (`protectedProcedure`), validate `userId` matches JWT `sub` |
| Event flooding / DoS | Dedicated rate limiter: 500 events/min per user, 50/min per unauthenticated IP |
| Analytics data breach | Pseudonymized IDs + no PII = minimized impact |

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
| PostHog (new) | **Not signed** | Sign DPA before integration |
| Statsig | **Not signed** | Sign DPA, pseudonymize userId |
| Sentry | **Not signed** | Sign DPA, add PII scrubbing |
| Expo Push | **Not signed** | Sign DPA |
| Resend | **Not signed** | Sign DPA |
| Neon | **Needs verification** | Verify DPA coverage |

---

## 9. Blockers & Implementation Order

### P0 — Must Fix Before Any Analytics Event

| # | Item | Source Finding | Effort |
|---|---|---|---|
| 1 | Create `user_consents` table | Audit 3.4, 3.15 | 1d |
| 2 | Implement consent collection UI (mobile modal) | GDPR Art. 7 | 2d |
| 3 | Gate Statsig/Sentry initialization behind consent | Audit 3.6 | 1d |
| 4 | Hash userId before sending to any third-party | Security | 0.5d |
| 5 | Complete privacy policy with analytics section | Audit 3.3 | 1d |
| 6 | Fix admin refresh token secret (`jwt.ts:120`) | Audit 2.1 | 0.5d |

### Sprint N — Analytics Foundation

| # | Item | Effort |
|---|---|---|
| 7 | `AnalyticsEventMap` + `AnalyticsService` interface in `packages/types/` | 1d |
| 8 | PostHog mobile implementation + NoOp service | 1d |
| 9 | DI token + container registration (tsyringe) | 0.5d |
| 10 | Implement consent withdrawal flow in Settings | 1d |
| 11 | Add Sentry `beforeSend` PII scrubber | 0.5d |
| 12 | Instrument first events: auth + onboarding flows | 2d |

### Sprint N+1 — Server-Side + Admin

| # | Item | Effort |
|---|---|---|
| 13 | `analytics_events` table + BullMQ pipeline | 2d |
| 14 | Server-side Redis counters (Hono middleware) | 1d |
| 15 | BullMQ cron jobs (hourly, daily, cohort, funnel) | 2d |
| 16 | Admin dashboard KPI cards | 2d |
| 17 | Instrument matching + chat + walk events | 2d |

### Sprint N+2 — Dashboards + Compliance

| # | Item | Effort |
|---|---|---|
| 18 | Admin funnel visualization page | 2d |
| 19 | Admin cohort retention page | 2d |
| 20 | Admin matching analytics page | 2d |
| 21 | `deleteAccount` with analytics cascade | 2d |
| 22 | `exportMyData` including analytics data | 1d |
| 23 | DPIA documentation | 1d |
| 24 | Sign DPAs with all processors | 1d |

---

## Cross-Team Consensus

| Topic | Sara (Analytics) | Elena (Data Eng) | Davide (Security) | Giulia (GDPR) |
|---|---|---|---|---|
| **Tool** | PostHog Cloud free | Same DB, BullMQ pipeline | PostHog EU preferred | EU-hosted or self-hosted |
| **User IDs** | Opaque userId | UUID with dedup | HMAC-hashed | Pseudonymized |
| **Consent** | `defaultOptIn: false` | N/A (server-side) | Gate all tracking | P0 blocker, mandatory |
| **Data retention** | 12mo raw | 90d raw + aggregates | 90d + encryption | 90d raw, 24mo aggregated |
| **Neon tier** | Sufficient for now | Upgrade to Launch ($19) | Separate pool for workers | EU-hosted (already is) |

**Agreed retention**: 90 days raw events, 24 months aggregated, unlimited anonymized.
**Agreed ID strategy**: HMAC-SHA256 hash for all third-party destinations, raw UUID only in own Neon DB.
**Agreed blocker**: Consent infrastructure (P0) must ship before any analytics event is sent.
