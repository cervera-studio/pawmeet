# 16 — ML Pipeline Architecture: AI-Powered Matching

> Sprint 16 — PawMeet AI per Matching Ottimale

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Data Collection Layer](#3-data-collection-layer)
4. [Feature Engineering](#4-feature-engineering)
5. [Training Pipeline](#5-training-pipeline)
6. [Model Serving](#6-model-serving)
7. [Personalized Suggestions](#7-personalized-suggestions)
8. [Optimal Time Prediction](#8-optimal-time-prediction)
9. [A/B Testing Integration](#9-ab-testing-integration)
10. [Infrastructure & Cost](#10-infrastructure--cost)
11. [Migration Path & Rollout](#11-migration-path--rollout)
12. [Monitoring & Observability](#12-monitoring--observability)

---

## 1. Executive Summary

PawMeet's current matching system uses a **rule-based weighted scoring algorithm** with fixed compatibility matrices (size, energy, behavior, walk preferences, distance, leash). Sprint 15 introduced `ai-matching.ts` with weight learning from swipe history (`learnWeightsFromSwipes`) and confidence-based blending (`blendWeights`). This is a solid foundation — Sprint 16 extends it into a full ML pipeline that:

- Learns from **outcome signals** (walks completed, feedback ratings, chat engagement), not just swipe patterns
- Serves **personalized match scores** with sub-50ms latency via Redis caching
- Predicts **optimal walk times** based on user activity windows and nearby-user density
- Runs **A/B tests** (via Statsig) comparing ML-scored matches vs rule-based matches
- Stays within startup budget: no GPU instances, no dedicated ML infrastructure

**Key architectural decision**: We use **lightweight models (gradient-boosted trees via ONNX Runtime)** running directly on the Fly.io API server, not a separate ML service. This avoids network hops, keeps infrastructure simple, and is sufficient for our feature space (~20 features).

---

## 2. Current State Analysis

### 2.1 Existing Matching Flow

```
DogProfile A + DogProfile B + distance
        │
        ▼
┌─────────────────────────────┐
│  createMatchingAlgorithm()  │  ← apps/api/src/domain/matching-algorithm.ts
│  Pure function, no I/O      │
│                             │
│  Compatibility matrices:    │
│  • SIZE_MATRIX (5×5)        │  ← packages/utils/src/matching.ts
│  • ENERGY_MATRIX (4×4)      │
│  • BEHAVIOR_MATRIX (4×4)    │
│  • LEASH_MATRIX (4×4)       │
│  • walkScore (time/terrain/duration overlap)
│  • distanceScore (exponential decay)
│                             │
│  Weights (default):         │
│  size=0.25, energy=0.25,    │
│  behavior=0.20, walk=0.15,  │
│  distance=0.10, leash=0.05  │
└─────────────────────────────┘
        │
        ▼
  overall = Σ(weight_i × score_i)
```

### 2.2 Existing AI/ML Infrastructure

| Component | Table/Module | Status |
|-----------|-------------|--------|
| Swipe score logs | `swipe_score_logs` | Active — logs every swipe with per-dimension scores |
| User matching preferences | `user_matching_preferences` | Active — stores learned weights per user |
| Match interactions | `match_interactions` | Active — tracks post-match engagement (walk_completed, feedback_positive, etc.) |
| User activity windows | `user_activity_windows` | Active — aggregated (dayOfWeek, hourOfDay, activityCount) |
| Weight learning | `learnWeightsFromSwipes()` | Active — computes dimension importance from like/pass differential |
| Weight blending | `blendWeights()` | Active — confidence-based blend (15 min swipes, caps at 0.6 blend) |
| Success rate | `computeSuccessRate()` | Active — ratio of matches with walk_completed or feedback_positive |
| A/B testing | Statsig | Configured — no custom tables, variant assignment via Statsig SDK |

### 2.3 What's Missing for ML

1. **Richer outcome signals** — Current `matchInteractions` tracks coarse types. We need structured outcome labels (match success score) and temporal engagement features.
2. **Feature store** — No precomputed feature vectors. Each match score is computed on-the-fly from raw profile data.
3. **Model artifacts** — No model storage or versioning.
4. **Batch training pipeline** — `learnWeightsFromSwipes` runs per-user but there's no global model training.
5. **Prediction caching** — Scores are computed per request, not cached.

---

## 3. Data Collection Layer

### 3.1 Implicit Signals (Already Collected)

These signals exist in the current schema and can be used immediately as training data:

| Signal | Source Table | Signal Type | Weight in Label |
|--------|------------|-------------|-----------------|
| Swipe direction (like/pass) | `swipes`, `swipe_score_logs` | Binary preference | Low (noisy) |
| Match creation (mutual like) | `matches` | Binary conversion | Medium |
| First message sent | `chat_messages` (timestamp) | Engagement | Medium |
| Message count | `chat_messages` (count per match) | Engagement depth | Medium |
| Walk proposed | `walks` (status=pending) | Intent | High |
| Walk completed | `walks` (status=completed) | Outcome | Very High |
| Walk feedback rating | `walk_feedback` (1-5) | Satisfaction | Very High |
| Match unmatched | `matches` (isActive=false) | Negative outcome | High (negative) |

### 3.2 New Signals to Collect

Add these to `match_interactions` via new `interactionType` values:

| Signal | interactionType | Trigger | Metadata |
|--------|----------------|---------|----------|
| Profile view duration | `profile_viewed` | Client event | `{ durationMs: number }` |
| Chat response time | `chat_first_reply` | Server (first reply in chat) | `{ delayMs: number }` |
| Walk re-proposal | `walk_reproposed` | Server (second walk with same match) | `{ daysSinceFirst: number }` |
| Repeat walk | `walk_repeat` | Server (3+ walks with same match) | `{ walkCount: number }` |

**Implementation**: Track `chat_first_reply` and `walk_repeat` server-side in tRPC routers (after `unwrapResult()`). Track `profile_viewed` as a client-exclusive event via `AnalyticsService.track()` and also log to `match_interactions` for ML training data.

### 3.3 New Analytics Events

Add to `AnalyticsEventMap` in `packages/types/src/analytics.ts`:

```typescript
// ML Matching
ml_score_served: {
  algorithmVariant: 'rule_based' | 'ml_v1' | 'ml_v2';
  score: number;
  featureCount: number;
  latencyMs: number;
};
ml_model_version_active: {
  modelVersion: string;
  trainedAt: string;
  trainingMetrics: { auc: number; precision: number; recall: number };
};
```

### 3.4 Outcome Label Construction

A match's **success score** (0.0–1.0) is the training label, computed as:

```
label = 0.0                          # base: match exists but no engagement
      + 0.15 if first_message_sent   # they started talking
      + 0.15 if reply_within_24h     # conversation was reciprocal
      + 0.20 if walk_proposed        # they planned to meet
      + 0.30 if walk_completed       # they actually met
      + 0.20 × (feedback_rating / 5) # satisfaction (0.04–0.20)
      − 0.30 if unmatched_within_7d  # fast unmatch = bad match
```

This gives a continuous label:
- 0.0 = dead match (no interaction)
- 0.15–0.30 = chat-only match
- 0.50–0.70 = one walk, moderate satisfaction
- 0.85–1.0 = repeat walks, high satisfaction

**Where to compute**: BullMQ daily job (same pattern as `analyticsDailyMetrics`). Materializes labels into a new `ml_training_samples` table.

---

## 4. Feature Engineering

### 4.1 Feature Categories

#### Dog-Pair Features (from existing compatibility matrices)

| Feature | Type | Source | Description |
|---------|------|--------|-------------|
| `size_score` | float [0,1] | `SIZE_MATRIX[a][b]` | Size compatibility |
| `energy_score` | float [0,1] | `ENERGY_MATRIX[a][b]` | Energy level compatibility |
| `behavior_score` | float [0,1] | `BEHAVIOR_MATRIX[a][b]` | Dog-to-dog behavior compatibility |
| `walk_time_overlap` | float [0,1] | Intersection of `walkPrefTime` arrays | Time preference overlap |
| `walk_terrain_overlap` | float [0,1] | Intersection of `walkPrefTerrain` arrays | Terrain preference overlap |
| `walk_duration_overlap` | float [0,1] | Range intersection ratio | Duration preference overlap |
| `leash_score` | float [0,1] | `LEASH_MATRIX[a][b]` | Leash behavior compatibility |
| `distance_km` | float [0,50] | PostGIS `ST_Distance` | Geographic distance |
| `distance_score` | float [0,1] | `exp(-0.15 * distance)` | Exponential distance decay |
| `rule_based_score` | float [0,1] | Current algorithm output | Baseline score as a feature |

#### Dog-Individual Features (profile characteristics)

| Feature | Type | Source |
|---------|------|--------|
| `dog_a_age_months` | int | `birthDate` |
| `dog_b_age_months` | int | `birthDate` |
| `age_difference_months` | int | Absolute difference |
| `dog_a_neutered` | bool | `isNeutered` |
| `dog_b_neutered` | bool | `isNeutered` |
| `same_breed` | bool | `breed` comparison |
| `both_neutered` | bool | Derived |

#### User-Behavioral Features (engagement history)

| Feature | Type | Source |
|---------|------|--------|
| `user_a_like_rate` | float [0,1] | `swipes` table (likes / total) |
| `user_b_like_rate` | float [0,1] | Same |
| `user_a_match_success_rate` | float [0,1] | `userMatchingPreferences.successRate` |
| `user_b_match_success_rate` | float [0,1] | Same |
| `user_a_avg_chat_messages` | float | Average messages per match |
| `user_b_avg_chat_messages` | float | Same |
| `user_a_walk_completion_rate` | float [0,1] | Completed walks / proposed walks |
| `user_b_walk_completion_rate` | float [0,1] | Same |
| `user_a_sample_size` | int | `userMatchingPreferences.sampleSize` |

#### Temporal Features

| Feature | Type | Source |
|---------|------|--------|
| `hour_of_day` | int [0,23] | Request timestamp |
| `day_of_week` | int [0,6] | Request timestamp |
| `activity_overlap_score` | float [0,1] | `user_activity_windows` cross-correlation |

**Total feature count**: ~25 features

### 4.2 Feature Store Architecture

Features are **precomputed and cached**, not computed per-request:

```
┌───────────────────────────────────────────────────┐
│              Feature Computation                   │
│                                                    │
│  BullMQ Cron Job (runs every 4 hours)             │
│  ┌──────────────────────────────────────────────┐ │
│  │ 1. Query active dogs + user stats from Neon  │ │
│  │ 2. Compute per-dog features (age, rates, ..) │ │
│  │ 3. Store in Redis hash:                      │ │
│  │    ml:features:dog:{dogId} → JSON            │ │
│  │    ml:features:user:{userId} → JSON          │ │
│  │    TTL: 8 hours                              │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  At scoring time:                                  │
│  ┌──────────────────────────────────────────────┐ │
│  │ 1. Fetch dog_a + dog_b features from Redis   │ │
│  │ 2. Compute pair features (matrices, distance) │ │
│  │ 3. Feed feature vector to model               │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

**Redis key structure** (Upstash):
- `ml:features:dog:{dogId}` — Dog-individual features (JSON hash)
- `ml:features:user:{userId}` — User-behavioral features (JSON hash)
- `ml:model:active` — Currently active model version string
- `ml:model:{version}:metadata` — Model metrics and info
- `ml:scores:{dogA}:{dogB}` — Cached pairwise scores (TTL: 1 hour)

---

## 5. Training Pipeline

### 5.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Training Pipeline (Offline)                   │
│                                                                 │
│  Trigger: BullMQ scheduled job (weekly, Sunday 03:00 UTC)       │
│  Or: Manual trigger via admin dashboard                         │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ 1. Extract  │───▶│ 2. Transform │───▶│ 3. Train + Eval  │   │
│  │   Training  │    │   Feature    │    │   Export ONNX    │   │
│  │   Samples   │    │   Vectors    │    │   model file     │   │
│  └─────────────┘    └──────────────┘    └──────────────────┘   │
│        │                                        │               │
│        ▼                                        ▼               │
│  Neon PostgreSQL                         Cloudflare R2          │
│  (ml_training_samples)                   (models/matching/)     │
│                                                 │               │
│                                                 ▼               │
│                                          ┌──────────────┐      │
│                                          │ 4. Validate  │      │
│                                          │   & Promote  │      │
│                                          └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Training Environment

**Why not a separate ML service**: At PawMeet's scale (early startup), the feature space is small (~25 features), the training data fits in memory, and gradient-boosted trees train in seconds. Running training on Fly.io worker instances avoids the cost and complexity of dedicated ML infrastructure.

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Fly.io worker Machine (on-demand) | Same infra, no new provider, cheap | Limited to CPU, 2GB RAM | **Phase 1** |
| GitHub Actions workflow | Free/cheap, triggered from admin | 6-hour timeout, cold start | Backup option |
| Modal.com serverless GPU | Fast training, scales, cheap per-run | New vendor, network dependency | **Phase 2** (if needed) |

**Phase 1 approach**: Spawn a temporary Fly Machine (`fly machine run`) with 4GB RAM, run the training script, upload the model to R2, then destroy the machine. Cost: ~$0.01 per training run.

### 5.3 Model Choice

**LightGBM (gradient-boosted decision trees)** exported to **ONNX format**:

- Trains in <10 seconds on 100K samples with 25 features
- ONNX Runtime for Node.js (`onnxruntime-node`) runs inference in <1ms per prediction
- No GPU required
- Interpretable (feature importance for debugging)
- Handles mixed feature types (numeric + boolean) natively
- Battle-tested for recommendation/ranking at small-to-medium scale

**Why not neural networks**: The feature space is small and structured. Trees match or beat NNs on tabular data under ~50 features. No embedding-worthy features (no text, no images in matching).

### 5.4 Training Data Pipeline

#### Step 1: Extract Training Samples

Daily BullMQ job materializes outcome labels:

```sql
-- Pseudocode for the training sample materialization query
SELECT
  m.id AS match_id,
  m.dog_a_id, m.dog_b_id,
  m.compatibility_score AS rule_based_score,
  m.created_at,
  -- Outcome signals
  CASE WHEN EXISTS (first message) THEN 0.15 ELSE 0 END +
  CASE WHEN EXISTS (reply within 24h) THEN 0.15 ELSE 0 END +
  CASE WHEN EXISTS (walk proposed) THEN 0.20 ELSE 0 END +
  CASE WHEN EXISTS (walk completed) THEN 0.30 ELSE 0 END +
  COALESCE(avg_feedback_rating / 5.0, 0) * 0.20 -
  CASE WHEN unmatch within 7d THEN 0.30 ELSE 0 END
  AS outcome_label
FROM matches m
WHERE m.created_at < NOW() - INTERVAL '7 days'  -- maturation window
```

**Maturation window**: 7 days from match creation before labeling. This ensures enough time for engagement signals to accumulate. Matches younger than 7 days are excluded from training data.

#### Step 2: Feature Vector Construction

For each training sample, construct the ~25-feature vector by joining:
- `dog_profiles` (both dogs) — size, energy, behavior, walk prefs, age
- `swipe_score_logs` — per-dimension scores at match time
- `user_matching_preferences` — user behavioral stats
- `user_activity_windows` — temporal overlap

#### Step 3: Train + Export

```
Input:  CSV/Parquet with ~25 features + outcome_label (float 0-1)
Model:  LightGBM regressor (objective=regression, metric=rmse)
Output: ONNX file uploaded to R2 at models/matching/v{N}/model.onnx
```

Hyperparameters (starting point):
- `num_leaves`: 31
- `learning_rate`: 0.05
- `n_estimators`: 200
- `min_child_samples`: 20
- `reg_alpha`: 0.1, `reg_lambda`: 0.1
- `subsample`: 0.8

#### Step 4: Validation & Promotion

Before promoting a new model:

1. **Offline metrics** (computed during training):
   - RMSE on held-out test set (20% split)
   - AUC-ROC for binary classification (label > 0.5 = "good match")
   - NDCG@10 for ranking quality
   - **Gate**: New model must beat current model on all metrics

2. **Shadow scoring** (first 48 hours after upload):
   - Score all live matches with BOTH old and new model
   - Log both scores to `swipe_score_logs.metadata` (new jsonb column)
   - Compare distributions — alert if KL divergence > threshold

3. **Promotion**:
   - Update `ml:model:active` in Redis to new version
   - Admin dashboard action (not automatic)

### 5.5 New Database Tables

```
ml_training_samples
├── id (uuid PK)
├── match_id (uuid FK → matches)
├── dog_a_id (uuid FK → dog_profiles)
├── dog_b_id (uuid FK → dog_profiles)
├── feature_vector (jsonb) — full feature vector at label time
├── outcome_label (float 0-1)
├── label_version (int) — label formula version
├── matured_at (timestamp) — when 7-day window expired
├── created_at (timestamp)
└── indexes: (matured_at), (label_version)

ml_model_registry
├── id (uuid PK)
├── version (varchar unique) — e.g., "v1.0.3"
├── r2_path (varchar) — e.g., "models/matching/v1.0.3/model.onnx"
├── training_samples_count (int)
├── metrics (jsonb) — { rmse, auc, ndcg, precision, recall }
├── feature_schema (jsonb) — ordered list of feature names
├── hyperparameters (jsonb)
├── is_active (boolean default false)
├── promoted_at (timestamp nullable)
├── created_at (timestamp)
└── indexes: (is_active), (version)
```

### 5.6 Model Versioning & Storage

```
Cloudflare R2 (existing bucket)
└── models/
    └── matching/
        ├── v1.0.0/
        │   ├── model.onnx          (ONNX model file, ~50KB–2MB)
        │   ├── feature_schema.json  (feature names + types)
        │   └── metrics.json         (training metrics)
        ├── v1.0.1/
        │   └── ...
        └── latest → symlink/pointer to active version
```

---

## 6. Model Serving

### 6.1 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Server (Fly.io)                    │
│                                                          │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │ tRPC Router  │────▶│ MatchingUseCase │               │
│  │ match.feed   │     │              │                  │
│  └──────────────┘     └──────┬───────┘                  │
│                              │                           │
│                    ┌─────────▼──────────┐               │
│                    │ ScoringStrategy    │               │
│                    │ (Strategy Pattern) │               │
│                    └────┬────────┬──────┘               │
│                         │        │                       │
│              ┌──────────▼┐  ┌───▼───────────┐          │
│              │ RuleBased │  │ MLScoring     │          │
│              │ Strategy  │  │ Strategy      │          │
│              │ (current) │  │ (ONNX Runtime)│          │
│              └───────────┘  └───────┬───────┘          │
│                                     │                    │
│                         ┌───────────▼───────────┐       │
│                         │ 1. Redis: get features │       │
│                         │ 2. Redis: check cache  │       │
│                         │ 3. ONNX: inference     │       │
│                         │ 4. Redis: cache result │       │
│                         └───────────────────────┘       │
│                                                          │
│  ONNX Runtime loaded at server startup.                  │
│  Model file downloaded from R2 on boot + on version      │
│  change (polled every 5 min from ml:model:active).       │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Strategy Pattern Integration

The existing `MatchingAlgorithm` interface in `apps/api/src/domain/matching-algorithm.ts` already supports this. Introduce a `ScoringStrategy` abstraction:

```typescript
interface ScoringStrategy {
  name: 'rule_based' | 'ml_v1' | 'ml_v2';
  score(dogA: DogProfile, dogB: DogProfile, distanceKm: number): Promise<CompatibilityBreakdown>;
}
```

- `RuleBasedStrategy` wraps `createMatchingAlgorithm()` + `blendWeights()` (current behavior)
- `MLScoringStrategy` fetches features from Redis, runs ONNX inference, returns breakdown

The use case selects strategy based on Statsig feature gate (A/B test assignment).

### 6.3 Latency Budget

| Step | Target | Technique |
|------|--------|-----------|
| Feature fetch (Redis) | <5ms | Upstash Redis pipeline, 2 keys |
| Score cache check (Redis) | <2ms | `ml:scores:{dogA}:{dogB}` |
| ONNX inference | <1ms | In-process, ~25 features, tree model |
| Score cache write (Redis) | <2ms | Fire-and-forget, TTL 1h |
| **Total (cache miss)** | **<10ms** | |
| **Total (cache hit)** | **<5ms** | |

Current rule-based scoring: ~0.1ms (pure math, no I/O). ML scoring adds Redis round-trips but stays well under the 50ms target.

### 6.4 Model Loading

```
Server Boot Sequence:
1. Load ONNX Runtime (onnxruntime-node) — ~200ms cold
2. Read ml:model:active from Redis → version string
3. Check local file cache: /tmp/ml-models/{version}/model.onnx
4. If not cached: download from R2 → write to /tmp
5. Load model into ONNX InferenceSession
6. Ready to serve

Hot Reload (no downtime):
- BullMQ repeatable job: every 5 min, check ml:model:active
- If version changed: download new model, create new session, swap reference
- Old session garbage-collected after inflight requests complete
```

### 6.5 Graceful Degradation

If ML scoring fails (model not loaded, Redis down, inference error):
1. Log error via `logger.warn('ml-scoring', ...)`
2. **Fall back to rule-based scoring** (always available, no I/O)
3. Track `ml_score_fallback` analytics event with reason
4. The user never sees an error

---

## 7. Personalized Suggestions

### 7.1 Recommendation Types

| Type | Description | Signal Source | Delivery |
|------|-------------|--------------|----------|
| **Top Matches** | Highest-scoring dogs in radius | ML scores | Match feed (primary) |
| **Rising Compatibility** | Dogs whose owners' behavior pattern increasingly aligns | Activity windows + walk history | Push notification |
| **Similar to Successful** | Dogs similar to ones user had good walks with | Collaborative filtering | Match feed (boost) |
| **Group Walk Suggestions** | Events with compatible dogs attending | Event participants + ML scores | Event feed |

### 7.2 Architecture: Precomputed Recommendations

```
BullMQ Job: "compute-recommendations" (runs every 2 hours)
│
├─ For each active user with location:
│   ├─ Find dogs within searchRadiusKm (PostGIS)
│   ├─ Score each candidate with ML model (batch inference)
│   ├─ Apply business rules (not already swiped, not blocked, active)
│   ├─ Rank top 50 candidates
│   └─ Store in Redis sorted set:
│       ml:recs:{userId} → ZADD score dogId (TTL: 4 hours)
│
├─ For "Rising Compatibility":
│   ├─ Find users whose activity windows shifted to overlap more
│   ├─ Score with ML model
│   └─ If score improved >15% from last computation → push notification
│
└─ For "Group Walk Suggestions":
    ├─ Find upcoming events within radius
    ├─ Score user against event participants (avg compatibility)
    └─ Store in: ml:event-recs:{userId} → ZADD score eventId
```

### 7.3 Feed Integration

The match feed endpoint currently queries candidates and scores them on-the-fly. With precomputed recommendations:

```
match.feed request:
1. Check Redis: ml:recs:{userId} (sorted set, descending score)
2. If exists and fresh: return top N from sorted set
3. If stale or missing: fall back to on-the-fly scoring (current behavior)
4. Apply freshness boost: recently active users get +5% score
5. Apply diversity: ensure top 10 has variety in dog sizes and distances
```

---

## 8. Optimal Time Prediction

### 8.1 Problem Statement

Predict: "When are compatible dogs most likely to be available for walks near me?"

This helps users:
- Schedule walks when nearby matches are most active
- See "best times to walk" in their profile/dashboard
- Receive "good time to walk" push notifications

### 8.2 Data Source

The `user_activity_windows` table already tracks per-user activity by (dayOfWeek, hourOfDay). This is the primary signal.

Additional signals:
- Walk completion timestamps (from `walks.scheduledAt` where status=completed)
- App open times (from `app_opened` analytics events)
- Location update timestamps (from `users.locationUpdatedAt`)

### 8.3 Architecture

```
┌───────────────────────────────────────────────────────┐
│           Optimal Time Prediction                      │
│                                                        │
│  BullMQ Job: "compute-optimal-times" (daily, 04:00)   │
│                                                        │
│  For each active user:                                 │
│  1. Get user's activity_windows (their own patterns)   │
│  2. Find nearby users (within searchRadiusKm)          │
│  3. Get nearby users' activity_windows                 │
│  4. Compute overlap heatmap:                           │
│     overlap[day][hour] = Σ(nearby_activity × compat)   │
│     weighted by ML compatibility score                 │
│  5. Normalize to probability distribution              │
│  6. Store top 5 optimal windows:                       │
│     ml:optimal-times:{userId} → JSON array             │
│     [{ dayOfWeek, hourStart, hourEnd, score, count }]  │
│                                                        │
│  Push notification trigger:                            │
│  If current time matches a top-2 window AND            │
│  user hasn't walked today AND                          │
│  at least 3 compatible dogs are "active now":          │
│  → Send push: "Buon momento per una passeggiata!"      │
└───────────────────────────────────────────────────────┘
```

### 8.4 "Active Now" Signal

To know if a user is currently active (for real-time suggestions):

```
Redis key: user:active:{userId}
Set on: app_opened event, location update, any API request
TTL: 15 minutes (auto-expires = "inactive")
```

Query "how many compatible dogs are active near me now":
1. Get user's precomputed recommendations (top 50 from `ml:recs:{userId}`)
2. Check `user:active:{ownerId}` for each recommended dog's owner
3. Count active owners → return as "nearby active matches" count

No new model needed — this is a heuristic system layered on top of ML scores.

---

## 9. A/B Testing Integration

### 9.1 Statsig Integration

A/B testing uses Statsig (already configured — no custom tables). The ML pipeline integrates with it via feature gates:

| Gate / Experiment | Variants | Metric |
|-------------------|----------|--------|
| `matching_algorithm` | `rule_based` (control), `ml_v1` (treatment) | Match success rate (7-day) |
| `ml_weight_blending` | `conservative` (maxBlend=0.4), `aggressive` (maxBlend=0.8) | Swipe-to-match conversion |
| `optimal_time_notifications` | `off`, `on` | Walk completion rate |

### 9.2 Experiment Assignment Flow

```
match.feed request:
1. Get Statsig user assignment for "matching_algorithm" experiment
2. If variant = "rule_based": use RuleBasedStrategy
3. If variant = "ml_v1": use MLScoringStrategy
4. Log assignment to analytics: ml_score_served event
5. All downstream metrics (match_created, walk_completed, etc.)
   are automatically attributed via Statsig user assignment
```

### 9.3 Guardrails

- **Minimum sample size**: 500 users per variant before declaring significance
- **Primary metric**: Match success rate (walk_completed within 14 days / matches created)
- **Guardrail metrics**: Swipe rate (should not decrease >10%), unmatched rate (should not increase >5%)
- **Auto-shutoff**: If treatment variant shows >20% regression on primary metric, auto-disable via Statsig targeting rule

---

## 10. Infrastructure & Cost

### 10.1 Infrastructure Components

| Component | What | Existing? | Cost Impact |
|-----------|------|-----------|-------------|
| Neon PostgreSQL | Training data storage, feature source | Yes | +~2GB storage for ml_training_samples |
| Upstash Redis | Feature cache, score cache, recommendations | Yes | +~50MB memory for ML keys |
| Cloudflare R2 | Model artifact storage | Yes | +~10MB for ONNX models (negligible) |
| Fly.io API (performance-1x, 2GB) | ONNX Runtime inference | Yes | No change — model runs in existing process |
| Fly.io Worker Machine (on-demand) | Training jobs | New | ~$0.01/run, ~$0.04/month (weekly) |
| BullMQ jobs | Feature computation, training trigger, recommendations | Yes (pattern exists) | 3 new repeatable jobs |
| Statsig | A/B test assignment and metrics | Yes | No change (free tier: 1M events/mo) |
| `onnxruntime-node` | NPM dependency | New | ~15MB in Docker image |

### 10.2 Monthly Cost Estimate

| Item | Cost |
|------|------|
| Neon storage (+2GB) | ~$0 (within free tier / existing plan) |
| Upstash Redis (+50MB) | ~$0 (within existing plan) |
| R2 model storage | ~$0 (negligible) |
| Fly.io training machines | ~$0.04 (4 runs × $0.01) |
| ONNX Runtime (package size) | $0 (open source) |
| **Total incremental** | **~$0.04/month** |

The ML pipeline adds essentially zero cost by leveraging existing infrastructure.

### 10.3 Scaling Path

When PawMeet outgrows this setup:

1. **>100K active users**: Move feature computation to a dedicated Fly Machine (always-on worker, $15/mo)
2. **>500K active users**: Consider Modal.com for training (GPU-accelerated, ~$1/run for larger models)
3. **>1M active users**: Evaluate dedicated feature store (e.g., Feast on Redis) and model serving (e.g., Seldon Core on Fly.io Kubernetes)
4. **If neural models needed**: Transition to embedding-based models (user/dog embeddings), still served via ONNX Runtime

---

## 11. Migration Path & Rollout

### 11.1 Phase 1: Data Foundation (Week 1)

- [ ] Add new `interactionType` values to `match_interactions` tracking
- [ ] Create `ml_training_samples` table (Drizzle schema + migration)
- [ ] Create `ml_model_registry` table
- [ ] Implement BullMQ job for daily label materialization
- [ ] Implement BullMQ job for feature precomputation (Redis)
- [ ] Add `ml_score_served` to `AnalyticsEventMap`

### 11.2 Phase 2: Training Pipeline (Week 2)

- [ ] Write training script (Python or TypeScript — LightGBM + ONNX export)
- [ ] Set up R2 model storage structure
- [ ] Implement training trigger (BullMQ weekly job + admin manual trigger)
- [ ] Implement model validation (offline metrics, gating logic)
- [ ] Add `onnxruntime-node` to API dependencies
- [ ] Implement model loading at server boot + hot reload

### 11.3 Phase 3: Serving & A/B Test (Week 3)

- [ ] Implement `ScoringStrategy` interface and both implementations
- [ ] Wire Statsig experiment to strategy selection
- [ ] Implement Redis score caching
- [ ] Implement graceful degradation (fallback to rule-based)
- [ ] Set up Statsig experiment: `matching_algorithm` (50/50 split)
- [ ] Deploy shadow scoring (log both scores, don't affect feed yet)

### 11.4 Phase 4: Recommendations & Optimal Times (Week 4)

- [ ] Implement precomputed recommendations BullMQ job
- [ ] Integrate precomputed recs into match.feed endpoint
- [ ] Implement optimal time prediction job
- [ ] Implement "active now" tracking (Redis TTL keys)
- [ ] Implement push notification for optimal walk times
- [ ] Admin dashboard: model registry, metrics, manual training trigger

### 11.5 Rollout Strategy

```
Week 3: Shadow scoring (0% traffic affected, both scores logged)
Week 4: 10% traffic on ML scoring (canary)
Week 5: 50% traffic (A/B test, measure primary metrics)
Week 7: If metrics positive, 100% traffic on ML
Week 8: Remove rule-based code path (or keep as permanent fallback)
```

---

## 12. Monitoring & Observability

### 12.1 Key Metrics Dashboard (Admin)

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| ML inference latency (p50, p95, p99) | Sentry performance | p99 > 50ms |
| ML inference error rate | Sentry errors | > 1% requests |
| Fallback-to-rule-based rate | Analytics: ml_score_fallback | > 5% |
| Feature cache hit rate | Redis metrics | < 80% |
| Score cache hit rate | Redis metrics | < 60% |
| Model freshness (hours since training) | ml_model_registry.created_at | > 14 days |
| Training job success rate | BullMQ job status | Any failure |
| A/B test primary metric divergence | Statsig | Per experiment guardrails |
| Recommendation freshness | Redis TTL check | > 50% users stale |

### 12.2 Model Drift Detection

Weekly BullMQ job compares:
1. **Feature distribution drift**: Compare current feature distributions vs training data (Population Stability Index). Alert if PSI > 0.2 for any feature.
2. **Prediction distribution drift**: Compare score distribution over last 7 days vs training set predictions. Alert if mean shift > 0.1.
3. **Outcome drift**: Compare actual match success rates vs model-predicted rates. Alert if calibration error > 0.15.

If drift is detected → trigger retraining automatically (but still require admin approval for promotion).

### 12.3 Logging

All ML operations use the existing `logger` from `@pawmeet/utils`:

```
logger.info('ml-scoring', 'Score computed', { dogA, dogB, score, strategy, latencyMs })
logger.info('ml-training', 'Training started', { samplesCount, modelVersion })
logger.warn('ml-scoring', 'Fallback to rule-based', { reason, error })
logger.error('ml-training', 'Training failed', { error })
```

No PII in ML logs (no emails, names, coordinates — only UUIDs and scores).

---

## Appendix A: Decision Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| LightGBM over neural network | Small feature space (~25), tabular data, trains in seconds, <1ms inference | XGBoost (similar but ONNX export less mature), PyTorch (overkill) |
| ONNX Runtime in-process over separate service | No network hop, simpler infra, <10ms total latency | gRPC sidecar (latency), HTTP microservice (complexity) |
| Fly.io on-demand machines for training | Same provider, pay-per-second, simple orchestration | GitHub Actions (less flexible), Modal.com (new vendor) |
| Redis for feature store over dedicated solution | Already using Upstash, <50MB needed, simple hash operations | Feast (overkill), DynamoDB (wrong provider) |
| Weekly retraining over real-time learning | Sufficient for feature velocity, simpler to debug, stable model | Online learning (drift-prone), daily (unnecessary at early scale) |
| Continuous outcome label (0-1) over binary | Captures match quality gradient, better for ranking | Binary good/bad (loses signal), multi-class (harder to calibrate) |
| Statsig for A/B testing over custom solution | Already integrated, handles assignment + metrics, free tier | PostHog (already planned for analytics, but Statsig better for experiments) |

## Appendix B: Training Script Language

**Recommendation: Python** for the training script, even though the rest of the codebase is TypeScript.

Rationale:
- LightGBM's Python API is first-class; the Node.js bindings are less mature
- scikit-learn for preprocessing, evaluation metrics, and cross-validation
- `onnxmltools` for reliable ONNX export
- Training script runs in an isolated Fly Machine — no coupling to the API codebase
- The training script is ~200 lines, runs weekly, and outputs an ONNX file. It doesn't need to share types with the API.

The training script connects to Neon PostgreSQL directly, reads from `ml_training_samples`, trains the model, and uploads the ONNX file to R2. It's a standalone script, not part of the monorepo build pipeline.

Structure:
```
scripts/ml-training/
├── train.py           # Main training script
├── requirements.txt   # lightgbm, onnxmltools, psycopg2, boto3, scikit-learn
├── Dockerfile         # Python 3.12 slim, installs requirements
└── README.md          # How to run locally and on Fly.io
```
