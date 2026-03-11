// ── Walk Tracking ────────────────────────────────────────────────────────────

export interface WalkTrack {
  id: string;
  walkId: string | null;
  userId: string;
  startedAt: Date | string;
  endedAt: Date | string | null;
  distanceKm: number;
  durationMinutes: number;
  avgSpeedKmh: number;
  isCompleted: boolean;
  createdAt: Date | string;
}

export interface WalkTrackPoint {
  id: string;
  trackId: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: Date | string;
  speedKmh: number | null;
  position: number;
}

// ── Daily Activity ───────────────────────────────────────────────────────────

export interface DailyActivity {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  stepsCount: number;
  walkDistanceKm: number;
  walkDurationMin: number;
  walkCount: number;
  source: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ── Aggregated Stats ─────────────────────────────────────────────────────────

export interface ActivitySummary {
  totalSteps: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  totalWalks: number;
  avgDailySteps: number;
  avgDailyDistanceKm: number;
  avgDailyDurationMin: number;
  days: DailyActivity[];
}

export interface HealthGoal {
  recommendedDailyMinutes: number;
  sizeCategory: string;
  currentDailyAvgMinutes: number;
  goalProgress: number; // 0-1
}
