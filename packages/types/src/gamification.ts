// ── XP ──────────────────────────────────────────────────────────────────────

export interface XpTransaction {
  id: string;
  userId: string;
  action: string;
  points: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface XpSummary {
  totalXp: number;
  level: string;
  xpToNextLevel: number | null;
}

// ── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalXp: number;
  rank: number;
  level: string;
}

export interface LeaderboardParams {
  type: string;
  limit?: number;
}

// ── Challenges ──────────────────────────────────────────────────────────────

export interface Challenge {
  id: string;
  type: string;
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

// ── Achievements ────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  userId: string;
  type: string;
  unlockedAt: Date;
}
