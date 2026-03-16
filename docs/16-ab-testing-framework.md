# 16 — A/B Testing Framework: ML vs Rule-Based Matching

**Date:** 2026-03-16
**Author:** Experimentation Engineer
**Status:** Draft — pending review

---

## Executive Summary

This document designs the A/B testing framework to compare PawMeet's existing **rule-based** matching algorithm (fixed weights) with the new **ML-enhanced** algorithm (learned per-user weights via swipe history analysis). The experiment will run as a 70/30 split (control/treatment) using the existing Statsig + Upstash Redis infrastructure, with PostHog as the analytics visualization layer and Neon as the source of truth.

**Key decision:** Replace Statsig with a lightweight **custom experiment service backed by Upstash Redis** for variant assignment. Statsig adds an external dependency and cost that is unnecessary given our simple gate-based needs. The `ExperimentService` port already abstracts this — we swap the implementation without touching any use case code.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Feature Flag Architecture](#2-feature-flag-architecture)
3. [Traffic Splitting Strategy](#3-traffic-splitting-strategy)
4. [Experiment Metrics](#4-experiment-metrics)
5. [Analytics Integration](#5-analytics-integration)
6. [Sample Size & Duration](#6-sample-size--duration)
7. [Guardrails & Auto-Stop](#7-guardrails--auto-stop)
8. [Consent & GDPR](#8-consent--gdpr)
9. [Implementation Plan](#9-implementation-plan)

---

## 1. Current State Analysis

### What exists

| Component | File | Status |
|---|---|---|
| `ExperimentService` port | `apps/api/src/ports/experiment-service.ts` | Implemented — abstract interface with `checkGate()`, `getExperiment()`, `logEvent()` |
| `StatsigExperimentService` | `apps/api/src/infra/statsig-experiment-service.ts` | Implemented — uses Statsig SDK, checks `ab_testing` consent |
| `discover-candidates-ai` use case | `apps/api/src/use-cases/discover-candidates-ai.ts` | Implemented — calls `experimentService.checkGate(userId, STATSIG_GATE.AI_MATCHING)` to decide variant |
| Feature gate constants | `packages/config/src/matching-ai.ts` | `STATSIG_GATE.AI_MATCHING = 'ai_matching_enabled'` |
| Consent infrastructure | `packages/db/src/schema/user-consents.ts` | `ab_testing` consent type with full audit trail |
| Analytics pipeline | Neon + PostHog dual-write via BullMQ | Events stored in `analytics_events`, forwarded to PostHog |
| Matching AI data | `swipe_score_logs`, `user_matching_preferences`, `match_interactions`, `user_activity_windows` | All tables exist with proper constraints |

### What needs to change

1. **Replace Statsig with Upstash Redis** for variant assignment (eliminate external dependency cost)
2. **Add experiment assignment tracking** — persist which variant a user is in
3. **Tag all analytics events with `experiment_variant`** — enables PostHog filtering
4. **Add experiment-specific metrics** to the event taxonomy
5. **Implement guardrails** — automatic degradation if ML variant underperforms

---

## 2. Feature Flag Architecture

### 2.1 Redis Key Design

Use Upstash Redis as the feature flag store. Simple, fast, no external SDK.

```
Experiment config (hash):
  experiment:{name}  → { splitPercent, status, startedAt, stoppedAt }

User assignment (string with TTL):
  experiment:{name}:user:{userId}  → "control" | "treatment"

Global kill switch (string):
  experiment:{name}:kill  → "1" (if set, all users get control)
```

**Example for `matching_v2`:**
```
experiment:matching_v2 → { "splitPercent": 30, "status": "running", "startedAt": "2026-04-01" }
experiment:matching_v2:user:abc-123 → "treatment"
experiment:matching_v2:kill → (not set = running normally)
```

### 2.2 New Implementation: `RedisExperimentService`

Create `apps/api/src/infra/redis-experiment-service.ts` implementing the existing `ExperimentService` port. No changes to the port interface, no changes to use cases.

```
RedisExperimentService implements ExperimentService
├── checkGate(userId, gateName)
│   1. Check kill switch → if set, return false
│   2. Check ab_testing consent → if not granted, return false
│   3. Check existing assignment in Redis → if exists, return it
│   4. Hash userId deterministically → assign variant
│   5. Persist assignment in Redis (no TTL — sticky for experiment lifetime)
│   6. Return variant === "treatment"
│
├── getExperiment(userId, experimentName)
│   Same as checkGate but returns { value, groupName }
│
├── logEvent(userId, eventName, value, metadata)
│   No-op for Redis implementation — events go through PostHog/Neon pipeline
│
├── initialize() / shutdown()
│   No-op — Redis connection is shared (apps/api/src/lib/redis.ts)
```

### 2.3 Deterministic Assignment Algorithm

```typescript
function assignVariant(userId: string, experimentName: string, splitPercent: number): string {
  // Deterministic hash: same user always gets same variant
  const hash = createHash('sha256')
    .update(`${experimentName}:${userId}`)
    .digest();
  const bucket = hash.readUInt16BE(0) % 100; // 0-99
  return bucket < splitPercent ? 'treatment' : 'control';
}
```

**Properties:**
- **Deterministic**: Same userId + experimentName always produces same bucket
- **Uniform**: SHA-256 provides uniform distribution across buckets
- **Isolated**: Adding new experiments doesn't change existing assignments (experiment name is part of the hash)
- **Persistent**: Assignment is written to Redis on first evaluation, subsequent calls read from cache

### 2.4 DI Container Swap

In `apps/api/src/container/services.ts`, replace:

```typescript
// Before:
export const experimentService = new StatsigExperimentService(
  process.env.STATSIG_SERVER_SECRET ?? '',
  consentRepo,
);

// After:
export const experimentService = new RedisExperimentService(redis, consentRepo);
```

No other files change — the `ExperimentService` port abstraction ensures all consumers (`discover-candidates-ai`, `get-matching-insights`, etc.) work identically.

---

## 3. Traffic Splitting Strategy

### 3.1 Split Ratio: 70% Control / 30% Treatment

| Group | Ratio | Algorithm | Description |
|---|---|---|---|
| **control** | 70% | Rule-based (fixed weights) | Current production algorithm. Weights: size 25%, energy 25%, behavior 20%, walk 15%, distance 10%, leash 5% |
| **treatment** | 30% | ML-enhanced (learned weights) | Per-user weights learned from swipe history via `blendWeights()`. Falls back to defaults if < 15 swipes |

**Why 70/30 (not 50/50)?**
- ML algorithm is unproven — minimize blast radius
- 30% treatment still provides sufficient statistical power (see Section 6)
- Allows ramp-up: 30% → 50% → 100% as confidence grows

### 3.2 Assignment Rules

1. **Sticky assignment**: Once assigned, a user stays in their group for the entire experiment duration
2. **No re-randomization**: Assignment is deterministic from userId + experiment name
3. **Consent-gated**: Users without `ab_testing` consent always get `control` (rule-based). They are excluded from experiment analysis
4. **New users**: Assigned on first match feed load (when `discoverCandidatesAi` is called)
5. **Cross-device consistency**: Assignment is by userId, not device — works across mobile reinstalls

### 3.3 Ramp-Up Schedule

| Week | Treatment % | Condition to proceed |
|---|---|---|
| 1 | 10% | Verify no crashes, no major UX regressions |
| 2 | 30% | Verify guardrail metrics are green |
| 3-6 | 30% | Full experiment duration |
| 7+ | 50% or 100% | Only if treatment wins or is neutral |

Ramp-up is controlled by updating the `splitPercent` field in the Redis experiment config hash. Existing assignments are never changed — only new (unassigned) users are affected by the new ratio.

---

## 4. Experiment Metrics

### 4.1 Primary Metrics (Decision Metrics)

These determine whether the ML variant wins:

| Metric | Definition | Source Event | Success Criteria |
|---|---|---|---|
| **Match acceptance rate** | `match_created` / `match_swipe_performed(direction=right)` | `match_created`, `match_swipe_performed` | Treatment >= Control (non-inferior) |
| **Walk completion rate** | `walk_completed` / `match_created` within 14 days | `walk_completed`, `match_created` | Treatment > Control by >= 5% relative |
| **D7 retention** | % users active 7 days after first match | `app_opened` + cohort analysis | Treatment >= Control (non-inferior) |

### 4.2 Secondary Metrics (Diagnostic)

Help explain primary metric movements:

| Metric | Definition | Source Event |
|---|---|---|
| **Swipe-right rate** | `match_swipe_performed(direction=right)` / total swipes | `match_swipe_performed` |
| **Chat initiation rate** | % of matches that open chat within 24h | `chat_opened` |
| **Messages per match** | avg `chat_message_sent` count per match in first 7 days | `chat_message_sent` |
| **Walk proposal rate** | `walk_proposed` / `match_created` within 7 days | `walk_proposed` |
| **Walk feedback score** | avg `walk_feedback_submitted.rating` | `walk_feedback_submitted` |
| **Feed exhaustion rate** | `match_feed_exhausted` per session | `match_feed_exhausted` |
| **Avg compatibility score** | mean `compatibilityScore` of shown cards | `match_card_viewed` |
| **D30 retention** | % users active 30 days after first match | `app_opened` + cohort |

### 4.3 Guardrail Metrics (Safety)

If any guardrail is breached, the experiment is paused automatically:

| Metric | Threshold | Action |
|---|---|---|
| **Unmatch rate** | Treatment > Control by >= 20% relative | Pause experiment |
| **D7 retention** | Treatment < Control by >= 10% relative | Pause experiment |
| **App crash rate** | Treatment > Control by >= 50% relative | Kill switch |
| **Feed empty rate** | Treatment has >= 2x empty feeds vs Control | Pause experiment |

---

## 5. Analytics Integration

### 5.1 Enriching Events with Experiment Variant

Every analytics event tracked via `trackEvent()` for users in the experiment must include the `experiment_variant` property. This enables PostHog filtering and cohort creation.

**Approach:** Add a middleware/wrapper around `trackEvent()` that:

1. Looks up the user's experiment assignment from Redis
2. Injects `experiment_variant: "control" | "treatment" | "none"` into event properties
3. Injects `experiment_name: "matching_v2"` into event properties

```typescript
// Enhanced trackEvent in apps/api/src/lib/track-event.ts
export async function trackEventWithExperiment<E extends AnalyticsEventName>(
  event: E,
  userId: string | null,
  properties: AnalyticsEventMap[E],
): void {
  let enrichedProps = { ...properties } as Record<string, unknown>;

  if (userId) {
    const variant = await experimentService.getAssignment(userId, 'matching_v2');
    if (variant) {
      enrichedProps.experiment_variant = variant;
      enrichedProps.experiment_name = 'matching_v2';
    }
  }

  trackEvent(event, userId, enrichedProps as AnalyticsEventMap[E]);
}
```

**Which events to enrich:** All match-related, chat, walk, and retention events. Specifically:
- `match_feed_loaded`, `match_card_viewed`, `match_swipe_performed`, `match_created`, `match_unmatched`, `match_feed_exhausted`
- `chat_opened`, `chat_message_sent`
- `walk_proposed`, `walk_response`, `walk_completed`, `walk_feedback_submitted`
- `app_opened` (for retention)

### 5.2 New Experiment-Specific Events

Add to `AnalyticsEventMap` in `packages/types/src/analytics.ts`:

```typescript
// Experiment
experiment_user_assigned: {
  experimentName: string;
  variant: 'control' | 'treatment';
  assignmentMethod: 'deterministic_hash';
};
experiment_variant_evaluated: {
  experimentName: string;
  variant: 'control' | 'treatment';
  gateResult: boolean;
};
```

These are **server-authoritative** events tracked at assignment time.

### 5.3 PostHog Integration

PostHog receives all events via the existing dual-write pipeline. No PostHog-specific code needed beyond what exists.

**PostHog usage for the experiment:**
1. **Cohorts:** Create cohorts `matching_v2:control` and `matching_v2:treatment` filtering on `experiment_variant` property
2. **Funnels:** Build funnels (swipe → match → chat → walk) per cohort
3. **Retention:** D7/D30 retention grids per cohort
4. **Trends:** Compare key metrics (match rate, walk rate) per cohort over time

**No PostHog feature flags used** — variant assignment is via Redis, PostHog is purely for visualization. This maintains the "PostHog now, OpenPanel future" architecture where PostHog is an additive visualization layer.

### 5.4 Neon Queries for Experiment Analysis

Since Neon `analytics_events` is the source of truth, build experiment analysis queries directly:

```sql
-- Match acceptance rate by variant
SELECT
  (properties->>'experiment_variant') AS variant,
  COUNT(*) FILTER (WHERE event_name = 'match_created') AS matches,
  COUNT(*) FILTER (WHERE event_name = 'match_swipe_performed'
    AND properties->>'direction' = 'right') AS right_swipes,
  ROUND(
    COUNT(*) FILTER (WHERE event_name = 'match_created')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE event_name = 'match_swipe_performed'
      AND properties->>'direction' = 'right'), 0),
    4
  ) AS acceptance_rate
FROM analytics_events
WHERE event_name IN ('match_created', 'match_swipe_performed')
  AND properties->>'experiment_name' = 'matching_v2'
  AND server_timestamp >= '2026-04-01'
GROUP BY variant;
```

---

## 6. Sample Size & Duration

### 6.1 Power Analysis

**Parameters:**
- Baseline match acceptance rate (estimated): 15%
- Minimum detectable effect (MDE): 2 percentage points (15% → 17%, ~13% relative lift)
- Significance level (alpha): 0.05 (two-sided)
- Statistical power (1 - beta): 0.80
- Split: 70/30

**Sample size calculation (two-proportion z-test):**

```
n_treatment = (Z_alpha/2 + Z_beta)^2 * (p1*(1-p1)/k + p2*(1-p2)) / (p2 - p1)^2

Where:
  p1 = 0.15 (control baseline)
  p2 = 0.17 (treatment expected)
  k  = 70/30 = 2.33 (allocation ratio adjustment)
  Z_alpha/2 = 1.96, Z_beta = 0.84

n_treatment ≈ 3,200 users
n_control   ≈ 7,500 users
Total       ≈ 10,700 users with at least 1 right-swipe
```

### 6.2 Duration Estimate

| Scenario | DAU | Users with swipes/week | Weeks to 10.7K users |
|---|---|---|---|
| Optimistic | 2,000 | ~1,400 | ~8 weeks |
| Realistic | 800 | ~560 | ~19 weeks |
| Conservative | 400 | ~280 | ~38 weeks |

**Recommendation:** Plan for **6 weeks minimum**, with the understanding that:
- If early signal is strong (>3% lift with p < 0.01), can call early
- If no signal after 6 weeks and sample is insufficient, extend to 12 weeks
- Use sequential testing (see 6.3) to allow valid early stopping

### 6.3 Sequential Testing

To allow peeking at results without inflating false positive rate, use **alpha spending** (O'Brien-Fleming bounds):

| Analysis | Calendar | Cumulative alpha spent |
|---|---|---|
| 1st look | Week 2 | 0.001 |
| 2nd look | Week 4 | 0.014 |
| 3rd look | Week 6 | 0.050 (final) |

Implement as a scheduled BullMQ job that runs the Neon query weekly and checks against the spending boundaries.

---

## 7. Guardrails & Auto-Stop

### 7.1 Automated Guardrail Check

A **daily BullMQ job** (`experiment-guardrails`) queries Neon for guardrail metrics and triggers alerts or auto-stop.

**Logic:**
```
1. Query guardrail metrics from analytics_events (last 24h rolling window)
2. For each guardrail:
   a. Compute treatment vs control rates
   b. If threshold breached:
      - SET experiment:matching_v2:kill "1" in Redis (instant kill switch)
      - Send admin notification via existing EmailAdminNotificationService
      - Track event: experiment_auto_stopped { reason, metric, values }
3. Log results to analytics_daily_metrics for dashboard visibility
```

### 7.2 Kill Switch Mechanism

The Redis key `experiment:{name}:kill` provides instant rollback:

- **When set:** `RedisExperimentService.checkGate()` returns `false` for ALL users → everyone gets rule-based algorithm
- **Latency:** Takes effect on the next API call (no cache, direct Redis read)
- **Manual trigger:** Admin can set via backoffice UI or direct Redis CLI
- **Automatic trigger:** Guardrail job sets it when thresholds are breached

### 7.3 Admin Dashboard Integration

Add to the existing Next.js admin backoffice:

1. **Experiment status card:** Shows running/paused/stopped, current split, enrollment count per variant
2. **Metric comparison table:** Primary + secondary metrics side-by-side with confidence intervals
3. **Guardrail status:** Green/yellow/red indicators per guardrail metric
4. **Manual controls:** Start/pause/stop experiment, adjust split %, trigger kill switch

Data source: Neon `analytics_events` + `analytics_daily_metrics` tables, queried via existing admin tRPC routes.

---

## 8. Consent & GDPR

### 8.1 Consent Requirements

The existing `user_consents` table already supports `ab_testing` consent type. The `RedisExperimentService` must check consent before assignment:

- **Consent granted:** User is assigned to a variant (control or treatment) and tracked
- **Consent not granted:** User always gets `control` (rule-based) — NOT tracked in experiment analysis
- **Consent withdrawn mid-experiment:** User's assignment remains in Redis but events stop being enriched with experiment properties. User is excluded from analysis going forward

### 8.2 Data Minimization

- **Redis stores only:** `userId → variant` mapping. No PII.
- **Analytics events:** `experiment_variant` property is added to events already being tracked (no new PII)
- **GDPR export:** Include experiment assignment in the existing `export-user-data` use case
- **Right to erasure:** Experiment assignment is deleted when user account is deleted (Redis key cleanup in account deletion flow)

### 8.3 Privacy Notice

The mobile consent modal already mentions A/B testing. No changes needed to privacy notices.

---

## 9. Implementation Plan

### Phase 1: Infrastructure (2-3 days)

| Task | File(s) | Description |
|---|---|---|
| Create `RedisExperimentService` | `apps/api/src/infra/redis-experiment-service.ts` | Implement `ExperimentService` port with Redis-backed assignment |
| Unit tests | `apps/api/src/infra/redis-experiment-service.test.ts` | Test deterministic assignment, consent checking, kill switch |
| Swap DI binding | `apps/api/src/container/services.ts` | Replace `StatsigExperimentService` with `RedisExperimentService` |
| Remove Statsig dep | `apps/api/package.json` | Remove `@statsig/statsig-node-core` |

### Phase 2: Analytics Enrichment (1-2 days)

| Task | File(s) | Description |
|---|---|---|
| Add experiment events to taxonomy | `packages/types/src/analytics.ts` | `experiment_user_assigned`, `experiment_variant_evaluated` |
| Enrich `trackEvent` | `apps/api/src/lib/track-event.ts` | Add `experiment_variant` to match/chat/walk/retention events |
| Track assignment event | `apps/api/src/infra/redis-experiment-service.ts` | Fire `experiment_user_assigned` on first assignment |

### Phase 3: Guardrails (1-2 days)

| Task | File(s) | Description |
|---|---|---|
| Guardrail BullMQ job | `apps/api/src/jobs/experiment-guardrails.ts` | Daily job checking guardrail metrics, auto-stop if breached |
| Schedule job | `apps/api/src/jobs/queue.ts` | Add repeatable job (daily at 03:00 UTC) |
| Admin notification | Existing `EmailAdminNotificationService` | Alert on guardrail breach |

### Phase 4: Admin Dashboard (2-3 days)

| Task | File(s) | Description |
|---|---|---|
| Experiment API routes | `apps/api/src/trpc/routers/admin-experiments.ts` | CRUD for experiment config, metric queries |
| Admin UI | `apps/admin/src/app/(dashboard)/experiments/` | Status card, metric table, controls |

### Phase 5: Launch (1 day)

| Task | Description |
|---|---|
| Set experiment config in Redis | `splitPercent: 10`, `status: running` |
| Monitor first 24h | Check logs, guardrail metrics, event flow |
| Ramp to 30% | After 1 week if all green |

**Total estimated effort:** 7-11 days

---

## Appendix: Relationship to Other Documents

- **Doc 09 (Consolidated Architecture):** This framework extends the feature flag strategy described in Section 6.4
- **Doc 13 (Analytics Strategy):** New experiment events follow the existing taxonomy conventions (Section 2) and pipeline (Section 4)
- **Doc 14 (DPIA):** A/B testing consent model already covered
- **`packages/config/src/matching-ai.ts`:** Statsig constants will be replaced with Redis-based equivalents
