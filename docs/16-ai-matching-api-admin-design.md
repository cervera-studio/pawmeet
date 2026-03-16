# 16 — AI Matching: Backend API & Admin Dashboard Design

> Design document for the API endpoints and admin screens that support AI-powered matching,
> A/B testing, and model performance monitoring.

---

## 1. Current State Analysis

### What already exists

**DB Schema** (`packages/db/src/schema/matching-ai.ts`):
- `swipe_score_logs` — per-swipe score breakdown (6 dimensions + overall)
- `user_matching_preferences` — learned per-user weights + sample size + success rate
- `match_interactions` — post-match interaction tracking (message, walk, unmatch, etc.)
- `user_activity_windows` — hourly activity counts per user per day-of-week
- A/B experiments managed via **Statsig** (no custom tables)

**Use cases** (`apps/api/src/use-cases/`):
- `discover-candidates-ai` — AI-enhanced discovery (blended weights via Statsig gate)
- `get-optimal-times` — predicts best walk times based on activity windows
- `learn-user-preferences` — computes personalized weights from swipe history
- `get-matching-insights` — aggregated stats for a user (swipes, matches, preferences, variant)
- `log-swipe-scores`, `record-match-interaction`, `record-activity-window` — data collection

**tRPC router** (`apps/api/src/trpc/routers/matching-ai.ts`):
- `logSwipeScores`, `recordInteraction`, `recordActivity`, `learnPreferences`
- `optimalTimes`, `insights`, `discoverAi`, `matchExplanation`

**Experiment service** (`apps/api/src/ports/experiment-service.ts`):
- `checkGate(userId, gateName)` — feature gates
- `getExperiment(userId, experimentName)` — variant assignment
- `getConfigValue(userId, configName, paramName, fallback)` — dynamic configs
- `logEvent(userId, eventName, value, metadata)` — metrics

**Admin router** (`apps/api/src/trpc/routers/admin.ts`):
- Pattern: `createAdminProcedure(db)` with `requireRole()` guards
- Uses `logAdminAction()` for audit trail, `trackEvent()` for analytics

---

## 2. New API Endpoints

### 2.1 Admin: A/B Test Metrics

**Router**: `admin` (existing, add new procedures)

```
admin.getExperimentMetrics
```

- **Auth**: Admin role (min: `viewer`)
- **Input**:
  ```ts
  {
    experimentName: string;          // e.g. 'ai_matching_v1'
    dateFrom?: string;               // ISO date
    dateTo?: string;                 // ISO date
    granularity?: 'day' | 'week';    // default 'day'
  }
  ```
- **Output**:
  ```ts
  {
    experiment: {
      name: string;
      status: 'running' | 'paused' | 'completed';
      startDate: string;
      groups: Array<{
        name: string;              // 'ai_enhanced' | 'rule_based'
        userCount: number;
        splitPercentage: number;   // 30 / 70
      }>;
    };
    metrics: {
      matchAcceptanceRate: { ai: number; control: number; lift: number; pValue: number };
      walkCompletionRate: { ai: number; control: number; lift: number; pValue: number };
      avgMessagesPerMatch: { ai: number; control: number; lift: number; pValue: number };
      d7Retention: { ai: number; control: number; lift: number; pValue: number };
      avgCompatibilityScore: { ai: number; control: number; lift: number };
    };
    timeSeries: Array<{
      date: string;
      aiMatchRate: number;
      controlMatchRate: number;
      aiWalkRate: number;
      controlWalkRate: number;
    }>;
  }
  ```
- **Data source**: Statsig API (experiment results) + local DB aggregations on `swipe_score_logs` and `match_interactions`
- **Implementation notes**: Create a new use case `get-experiment-metrics.ts`. Statsig's Server SDK provides `getExperimentResults()` for aggregate metrics. Supplement with local queries for PawMeet-specific metrics (walk completion, messages per match).

---

### 2.2 Admin: Feature Flag Management

```
admin.listFeatureFlags
admin.updateFeatureFlag
```

**`listFeatureFlags`**:
- **Auth**: Admin role (min: `admin`)
- **Input**: none
- **Output**:
  ```ts
  Array<{
    name: string;                    // e.g. 'ff_ai_matching'
    type: 'gate' | 'experiment';
    enabled: boolean;
    splitPercentage?: number;        // for experiments
    targetingRules?: string;         // human-readable summary
    lastModified: string;
  }>
  ```

**`updateFeatureFlag`**:
- **Auth**: Admin role (min: `super_admin`)
- **Input**:
  ```ts
  {
    name: string;
    enabled?: boolean;
    splitPercentage?: number;        // e.g. change 30/70 to 50/50
  }
  ```
- **Output**: `{ success: boolean; flag: FeatureFlag }`
- **Side effects**: `logAdminAction()` with `RESOURCE_TYPE.FeatureFlag`
- **Implementation notes**: Wraps Statsig Console API. Changes propagate within seconds via Statsig's SDK polling. The `ExperimentService` port needs two new methods:
  ```ts
  listGatesAndExperiments(): Promise<FeatureFlag[]>;
  updateGateOrExperiment(name: string, updates: { enabled?: boolean; split?: number }): Promise<void>;
  ```

---

### 2.3 Admin: ML Model Performance

```
admin.getModelPerformance
```

- **Auth**: Admin role (min: `viewer`)
- **Input**:
  ```ts
  {
    dateFrom?: string;
    dateTo?: string;
  }
  ```
- **Output**:
  ```ts
  {
    overview: {
      totalPredictions: number;        // total AI-variant discoveries
      totalMatches: number;            // matches that resulted from AI suggestions
      accuracy: number;                // match rate for AI variant
      avgScore: number;                // mean overall_score for AI likes
    };
    weightDistribution: {
      dimension: string;               // 'size' | 'energy' | etc.
      avgWeight: number;               // average across all users
      stdDev: number;
      p25: number;
      p75: number;
    }[];
    scoreCalibration: Array<{
      scoreBucket: string;             // '0.0-0.1', '0.1-0.2', etc.
      totalSwipes: number;
      likes: number;
      matches: number;
      observedMatchRate: number;
    }>;
    successRateDistribution: Array<{
      bucket: string;                  // '0-10%', '10-20%', etc.
      userCount: number;
    }>;
    timeSeries: Array<{
      date: string;
      avgScore: number;
      matchRate: number;
      totalPredictions: number;
    }>;
  }
  ```
- **Data source**: Aggregation queries on `swipe_score_logs`, `user_matching_preferences`, `match_interactions`, and `matches` tables.
- **Implementation notes**: Create use case `get-model-performance.ts`. Heavy aggregation — consider caching results in Redis with 1-hour TTL.

---

### 2.4 Admin: Experiment User Lookup

```
admin.getExperimentUserAssignment
```

- **Auth**: Admin role (min: `moderator`)
- **Input**: `{ userId: string }`
- **Output**:
  ```ts
  {
    userId: string;
    experiments: Array<{
      name: string;
      variant: string;
      assignedAt?: string;
    }>;
    matchingPreferences: UserMatchingPreferences | null;
    swipeStats: { total: number; likes: number; passes: number };
  }
  ```
- **Purpose**: Support/debugging tool — see which variant a specific user is in and their learned preferences.

---

## 3. New DB Tables

### 3.1 `experiment_metrics_snapshots`

Daily snapshot of experiment metrics, populated by a scheduled BullMQ job.

```ts
export const experimentMetricsSnapshots = pgTable(
  'experiment_metrics_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    experimentName: varchar('experiment_name', { length: 100 }).notNull(),
    snapshotDate: timestamp('snapshot_date', { mode: 'date' }).notNull(),
    variant: varchar('variant', { length: 50 }).notNull(),          // 'ai_enhanced' | 'rule_based'
    userCount: integer('user_count').notNull().default(0),
    totalDiscoveries: integer('total_discoveries').notNull().default(0),
    totalLikes: integer('total_likes').notNull().default(0),
    totalMatches: integer('total_matches').notNull().default(0),
    totalWalksCompleted: integer('total_walks_completed').notNull().default(0),
    totalMessages: integer('total_messages').notNull().default(0),
    avgCompatibilityScore: doublePrecision('avg_compatibility_score'),
    avgMatchRate: doublePrecision('avg_match_rate'),
    retainedD7: integer('retained_d7').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('exp_metrics_snap_name_date_variant_idx').on(
      table.experimentName,
      table.snapshotDate,
      table.variant,
    ),
    index('exp_metrics_snap_date_idx').on(table.snapshotDate),
  ],
);
```

**Why a snapshot table instead of live queries?**
- Live aggregation across `swipe_score_logs` (potentially millions of rows) + joins with `matches` and `walks` would be too slow for the admin dashboard.
- BullMQ cron job runs daily at 03:00 UTC, computes metrics per variant, inserts snapshot row.
- Admin queries only read from this table — fast, predictable.

### 3.2 `model_performance_daily`

Daily model calibration and performance metrics.

```ts
export const modelPerformanceDaily = pgTable(
  'model_performance_daily',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    snapshotDate: timestamp('snapshot_date', { mode: 'date' }).notNull(),
    totalPredictions: integer('total_predictions').notNull().default(0),
    totalMatches: integer('total_matches').notNull().default(0),
    avgOverallScore: doublePrecision('avg_overall_score'),
    scoreBuckets: jsonb('score_buckets'),                          // calibration data
    weightDistribution: jsonb('weight_distribution'),               // per-dimension stats
    successRateDistribution: jsonb('success_rate_distribution'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('model_perf_daily_date_idx').on(table.snapshotDate),
  ],
);
```

**No new tables needed for A/B assignments** — Statsig handles variant assignment, targeting, and override management. The admin UI reads from Statsig APIs.

---

## 4. New Ports (Interfaces)

### 4.1 `ExperimentAdminService` (new port)

```ts
export interface ExperimentAdminService {
  listExperiments(): Promise<ExperimentSummary[]>;
  getExperimentResults(name: string): Promise<ExperimentResults>;
  updateExperiment(name: string, updates: ExperimentUpdate): Promise<void>;
  listGates(): Promise<GateSummary[]>;
  updateGate(name: string, enabled: boolean): Promise<void>;
  getUserExperiments(userId: string): Promise<UserExperimentAssignment[]>;
}
```

**Implementation**: `infra/statsig-admin-service.ts` — wraps Statsig Console API (REST).

### 4.2 `ExperimentMetricsRepository` (new port)

```ts
export interface ExperimentMetricsRepository {
  upsertSnapshot(input: ExperimentMetricsSnapshotInput): Promise<void>;
  findSnapshots(experimentName: string, dateFrom: Date, dateTo: Date): Promise<ExperimentMetricsSnapshot[]>;
  upsertModelPerformance(input: ModelPerformanceDailyInput): Promise<void>;
  findModelPerformance(dateFrom: Date, dateTo: Date): Promise<ModelPerformanceDaily[]>;
  getAggregatedSwipeStats(variant: string, dateFrom: Date, dateTo: Date): Promise<SwipeAggregation>;
}
```

**Implementation**: `infra/drizzle-experiment-metrics-repository.ts`

---

## 5. New BullMQ Jobs

### 5.1 `compute-experiment-metrics` (daily cron)

- **Schedule**: `0 3 * * *` (03:00 UTC daily)
- **Logic**:
  1. Query `swipe_score_logs` grouped by variant (join with user experiment assignment via Statsig)
  2. Query `matches` created today per variant
  3. Query `walks` completed per variant
  4. Compute match acceptance rate, walk completion rate, avg score
  5. Upsert into `experiment_metrics_snapshots`
  6. Upsert into `model_performance_daily`

### 5.2 `compute-model-calibration` (daily cron, same schedule)

- Bucketize `swipe_score_logs.overall_score` into 10 bins
- For each bin: count swipes, likes, resulting matches
- Compute observed match rate per bin (calibration curve)
- Store in `model_performance_daily.score_buckets`

---

## 6. Admin Dashboard Screens

### 6.1 Navigation Changes

Add new section in sidebar (`sidebar.view-model.ts`):

```ts
{
  name: t('aiMatching'),
  href: '/ai-matching',
  icon: BrainIcon,      // lucide-react
  children: [
    { name: t('abTests'), href: '/ai-matching/ab-tests' },
    { name: t('modelPerformance'), href: '/ai-matching/performance' },
    { name: t('featureFlags'), href: '/ai-matching/flags' },
  ],
}
```

**Route permission**: `'/ai-matching': AdminRole.Admin`

---

### 6.2 Screen: A/B Test Dashboard (`/ai-matching/ab-tests`)

**File**: `apps/admin/src/app/(dashboard)/ai-matching/ab-tests/page.tsx`

```
┌──────────────────────────────────────────────────────────────────┐
│  A/B Test: AI Matching                                          │
│  Stato: In corso · Inizio: 15 Mar 2026 · Durata: 32 giorni     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Gruppo AI    │  │ Gruppo Ctrl │  │ Significat.  │              │
│  │ 30% (1.2K)  │  │ 70% (2.8K)  │  │ p < 0.05 ✓  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Metrica          │  AI      │ Control │  Lift  │ p-value │    │
│  ├──────────────────┼──────────┼─────────┼────────┼─────────┤    │
│  │ Match accept.    │  34.2%   │  28.1%  │ +21.7% │  0.012  │    │
│  │ Walk complet.    │  18.5%   │  15.3%  │ +20.9% │  0.043  │    │
│  │ Msg/match        │  12.4    │  9.8    │ +26.5% │  0.008  │    │
│  │ Retention D7     │  45.2%   │  41.8%  │ +8.1%  │  0.089  │    │
│  │ Score medio      │  0.72    │  0.68   │ +5.9%  │   —     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │   [Line chart: match acceptance rate over time]          │    │
│  │   ── AI (blue)   ── Control (gray)                       │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │   [Line chart: walk completion rate over time]           │    │
│  │   ── AI (blue)   ── Control (gray)                       │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

**Components**:
- `ExperimentStatusBanner` — shows experiment name, status, duration, group sizes
- `MetricsComparisonTable` — shadcn `Table` with metric rows, lift%, p-value with color coding (green if significant)
- `MetricsTimeSeriesChart` — recharts `LineChart` with dual lines (AI vs control), date filter

**Data flow**:
1. `page.tsx` (RSC) calls `fetchExperimentMetrics()` server action
2. Server action calls `api.admin.getExperimentMetrics.query()`
3. Charts rendered in client component (recharts needs browser APIs), same pattern as `dashboard-charts-lazy.tsx`

---

### 6.3 Screen: Model Performance (`/ai-matching/performance`)

**File**: `apps/admin/src/app/(dashboard)/ai-matching/performance/page.tsx`

```
┌──────────────────────────────────────────────────────────────────┐
│  Performance Modello ML                                          │
│  Periodo: [Ultimo mese ▼]                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │ Predizioni │ │ Match      │ │ Accuracy   │ │ Score Medio│    │
│  │ 24.5K      │ │ 3.2K       │ │ 34.2%      │ │ 0.72       │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Curva di calibrazione                                   │    │
│  │                                                          │    │
│  │  [Bar chart: score buckets vs observed match rate]       │    │
│  │  X: Score predetto (0.0-0.1, 0.1-0.2, ...)              │    │
│  │  Y: Match rate osservato                                 │    │
│  │  ── Ideale (diagonal)  ■ Osservato (bars)                │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Distribuzione pesi medi per dimensione                  │    │
│  │                                                          │    │
│  │  [Horizontal bar chart]                                  │    │
│  │  size      ████████████████░░░░  0.28 (±0.08)            │    │
│  │  energy    ███████████████░░░░░  0.24 (±0.06)            │    │
│  │  behavior  ██████████████░░░░░░  0.22 (±0.07)            │    │
│  │  walk      █████████░░░░░░░░░░░  0.13 (±0.05)            │    │
│  │  distance  ██████░░░░░░░░░░░░░░  0.09 (±0.04)            │    │
│  │  leash     ███░░░░░░░░░░░░░░░░░  0.04 (±0.03)            │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Andamento nel tempo                                     │    │
│  │                                                          │    │
│  │  [Line chart: daily avg score + match rate]              │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Distribuzione success rate utenti                       │    │
│  │                                                          │    │
│  │  [Histogram: user count per success rate bucket]         │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

**Components**:
- `PerformanceKpiCards` — 4x `Card` (shadcn) with key numbers
- `CalibrationChart` — recharts `ComposedChart` (bars for observed, line for ideal)
- `WeightDistributionChart` — recharts `BarChart` horizontal with error bars (p25-p75)
- `PerformanceTimeSeries` — recharts `LineChart` with dual Y-axis (score + match rate)
- `SuccessRateHistogram` — recharts `BarChart` showing user distribution

---

### 6.4 Screen: Feature Flags (`/ai-matching/flags`)

**File**: `apps/admin/src/app/(dashboard)/ai-matching/flags/page.tsx`

```
┌──────────────────────────────────────────────────────────────────┐
│  Feature Flag — AI Matching                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Flag                │ Tipo       │ Stato  │ Split │ Azioni│    │
│  ├─────────────────────┼────────────┼────────┼───────┼───────┤    │
│  │ ff_ai_matching      │ Experiment │ Attivo │ 30/70 │ [⚙]  │    │
│  │ ff_gamification     │ Experiment │ Attivo │ 50/50 │ [⚙]  │    │
│  │ ff_feed_v2          │ Gate       │ Attivo │  —    │ [⚙]  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── Dialog: Modifica ff_ai_matching ──────────────────────┐    │
│  │                                                          │    │
│  │  Stato:  (●) Attivo  ( ) Disattivato                     │    │
│  │                                                          │    │
│  │  Split:  AI [  30  ]%   Control [  70  ]%                │    │
│  │                                                          │    │
│  │  ⚠ La modifica si propaga a tutti gli utenti entro       │    │
│  │    60 secondi. Verificare con il team prima di procedere.│    │
│  │                                                          │    │
│  │            [Annulla]  [Salva modifiche]                   │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

**Components**:
- `FeatureFlagsTable` — shadcn `Table` with status badges (`Badge` component)
- `EditFlagDialog` — shadcn `Dialog` with `RadioGroup` (on/off) + `Input` (split %)
- Confirmation step before saving (destructive action warning)

**Permissions**: Only `super_admin` can modify flags; `admin`/`viewer` see read-only view.

---

## 7. Architecture Integration

### 7.1 File Structure

```
apps/api/src/
  use-cases/
    get-experiment-metrics.ts          # NEW
    get-model-performance.ts           # NEW
    get-experiment-user-assignment.ts   # NEW
  ports/
    experiment-admin-service.ts        # NEW
    experiment-metrics-repository.ts   # NEW
  infra/
    statsig-admin-service.ts           # NEW
    drizzle-experiment-metrics-repo.ts # NEW
  container/
    admin-container.ts                 # UPDATE — wire new use cases
  trpc/routers/
    admin.ts                           # UPDATE — add new procedures
  jobs/
    compute-experiment-metrics.ts      # NEW — daily cron

packages/db/src/schema/
  matching-ai.ts                       # UPDATE — add 2 new tables

apps/admin/src/
  app/(dashboard)/ai-matching/
    page.tsx                           # Redirect to ab-tests
    ab-tests/
      page.tsx
      actions.ts
      ab-test-charts.tsx               # Client component (recharts)
    performance/
      page.tsx
      actions.ts
      performance-charts.tsx           # Client component (recharts)
    flags/
      page.tsx
      actions.ts
      edit-flag-dialog.tsx
  components/
    sidebar.view-model.ts             # UPDATE — add AI matching nav
  lib/
    auth.ts                           # UPDATE — add route permission
  i18n/messages/
    it.json                           # UPDATE — add AI matching translations
```

### 7.2 Dependency Flow

```
Admin UI (Next.js)
  → server actions (fetchExperimentMetrics, etc.)
    → tRPC client → admin router procedures
      → use cases (get-experiment-metrics, etc.)
        → ports (ExperimentMetricsRepository, ExperimentAdminService)
          → infra (Drizzle queries, Statsig Console API)
```

All use cases return `Result<T>`. Admin router uses `unwrapResult()`.

### 7.3 Analytics Events

New server-side events (tracked after `unwrapResult()` in admin router):

| Event | Properties | When |
|-------|-----------|------|
| `admin_experiment_viewed` | `experiment_name` | Admin views A/B dashboard |
| `admin_feature_flag_updated` | `flag_name`, `enabled`, `split` | Admin changes a flag |
| `admin_model_performance_viewed` | `date_range` | Admin views model perf page |

Add to `AnalyticsEventMap` in `packages/types/src/analytics.ts`.

### 7.4 i18n Keys (Italian)

```json
{
  "nav": {
    "aiMatching": "AI Matching",
    "abTests": "A/B Test",
    "modelPerformance": "Performance modello",
    "featureFlags": "Feature flag"
  },
  "aiMatching": {
    "experimentStatus": "Stato esperimento",
    "running": "In corso",
    "paused": "In pausa",
    "completed": "Completato",
    "groupAi": "Gruppo AI",
    "groupControl": "Gruppo Controllo",
    "significance": "Significatività statistica",
    "matchAcceptance": "Tasso accettazione match",
    "walkCompletion": "Completamento passeggiate",
    "messagesPerMatch": "Messaggi per match",
    "retention": "Retention D7",
    "avgScore": "Score medio",
    "lift": "Variazione",
    "pValue": "p-value",
    "predictions": "Predizioni",
    "accuracy": "Accuratezza",
    "calibrationCurve": "Curva di calibrazione",
    "weightDistribution": "Distribuzione pesi",
    "performanceOverTime": "Andamento nel tempo",
    "successRateDistribution": "Distribuzione success rate",
    "flagName": "Nome flag",
    "flagType": "Tipo",
    "flagStatus": "Stato",
    "flagSplit": "Split",
    "flagActive": "Attivo",
    "flagInactive": "Disattivato",
    "editFlag": "Modifica flag",
    "splitWarning": "La modifica si propaga a tutti gli utenti entro 60 secondi. Verificare con il team prima di procedere.",
    "saveChanges": "Salva modifiche",
    "cancel": "Annulla",
    "period": "Periodo",
    "lastWeek": "Ultima settimana",
    "lastMonth": "Ultimo mese",
    "last3Months": "Ultimi 3 mesi"
  }
}
```

---

## 8. Summary of Changes

| Area | What | Size estimate |
|------|------|--------------|
| **DB** | 2 new tables (`experiment_metrics_snapshots`, `model_performance_daily`) | S |
| **Ports** | 2 new interfaces (`ExperimentAdminService`, `ExperimentMetricsRepository`) | S |
| **Infra** | 2 new implementations (Statsig admin, Drizzle metrics repo) | M |
| **Use cases** | 3 new (`get-experiment-metrics`, `get-model-performance`, `get-experiment-user-assignment`) | M |
| **tRPC** | 4 new procedures in admin router | S |
| **BullMQ** | 1 new daily cron job | M |
| **Admin pages** | 3 new pages + client chart components | L |
| **Sidebar/auth** | Nav item + route permission | XS |
| **i18n** | ~30 new translation keys | XS |
| **Analytics** | 3 new events in taxonomy | XS |

**Dependencies**:
- Statsig Console API access (API key with read/write permissions for gates & experiments)
- ML pipeline (Task #1) must be producing learned weights for model performance to have data
- A/B test framework (Task #2) must define experiment name and metrics for dashboard to display
