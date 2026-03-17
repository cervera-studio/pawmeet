// ── Gamification types ──────────────────────────────────────────────────────
// Canonical const objects and types live in @pawmeet/config.
// Here we define interface-level types that stay in sync.
// Use `string` for fields that may have values not yet in the const objects
// (e.g., new XP actions added in config before types is updated).

/** XP action — kept as string to stay compatible with @pawmeet/config XP_ACTION values */
export type XpAction = string;

/** User level — kept as string to stay compatible with @pawmeet/config USER_LEVEL values */
export type XpLevel = string;

/** Leaderboard type */
export type LeaderboardType = string;

/** Challenge type */
export type ChallengeType = string;

/** Streak type */
export type StreakType = string;

/** Achievement type */
export type AchievementType = string;

// ── XP ──────────────────────────────────────────────────────────────────────

export interface XpTransaction {
  id: string;
  userId: string;
  action: XpAction;
  points: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface XpSummary {
  totalXp: number;
  level: XpLevel;
  xpToNextLevel: number | null;
}

// ── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalXp: number;
  rank: number;
  level: XpLevel;
}

export interface LeaderboardParams {
  type: LeaderboardType;
  limit?: number;
}

// ── Challenges ──────────────────────────────────────────────────────────────

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  targetValue: number;
  xpReward: number;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  progress: number;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ChallengeWithProgress extends Challenge {
  progress: number;
  completedAt: Date | null;
}

// ── Streaks ─────────────────────────────────────────────────────────────────

export interface Streak {
  id: string;
  userId: string;
  type: StreakType;
  currentLength: number;
  longestLength: number;
  lastActivityDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Achievements ────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  userId: string;
  type: AchievementType;
  unlockedAt: Date;
}
