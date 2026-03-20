import type { AchievementType, ChallengeType, LeaderboardType, XpAction } from '@pawmeet/config';
import type {
  Achievement,
  Challenge,
  LeaderboardEntry,
  Streak,
  UserChallenge,
  XpTransaction,
} from '@pawmeet/types';

// ── XP ─────────────────────────────────────────────────────────────────────────

export interface XpRepository {
  createXpTransaction(
    userId: string,
    action: XpAction,
    points: number,
    metadata?: Record<string, unknown>,
  ): Promise<XpTransaction>;
  getTotalXp(userId: string): Promise<number>;
  getLeaderboard(type: LeaderboardType, limit: number): Promise<LeaderboardEntry[]>;
}

// ── Challenges ─────────────────────────────────────────────────────────────────

export interface ChallengeRepository {
  findActiveChallenges(now: Date): Promise<Challenge[]>;
  findUserChallenges(userId: string, challengeIds: string[]): Promise<UserChallenge[]>;
  upsertUserChallenge(
    userId: string,
    challengeId: string,
    progress: number,
    completedAt: Date | null,
  ): Promise<UserChallenge>;
  findActiveChallengesByType(type: ChallengeType, now: Date): Promise<Challenge[]>;
  createChallenge(data: {
    type: string;
    title: string;
    description: string;
    targetValue: number;
    xpReward: number;
    startsAt: Date;
    endsAt: Date;
  }): Promise<Challenge>;
  listAllChallenges(limit: number, offset: number): Promise<{ data: Challenge[]; total: number }>;
  updateChallenge(
    challengeId: string,
    data: {
      title?: string;
      description?: string;
      targetValue?: number;
      xpReward?: number;
      startsAt?: Date;
      endsAt?: Date;
    },
  ): Promise<Challenge>;
  deleteChallenge(challengeId: string): Promise<void>;
}

// ── Achievements ───────────────────────────────────────────────────────────────

export interface AchievementRepository {
  findAchievementsByUser(userId: string): Promise<Achievement[]>;
  hasAchievement(userId: string, type: AchievementType): Promise<boolean>;
  unlockAchievement(userId: string, type: AchievementType): Promise<Achievement>;
}

// ── Streaks ────────────────────────────────────────────────────────────────────

export interface StreakRepository {
  getStreak(userId: string, type: string): Promise<Streak | null>;
  upsertStreak(
    userId: string,
    type: string,
    data: { currentLength: number; longestLength: number; lastActivityDate: Date },
  ): Promise<Streak>;
  findStreaksOlderThan(date: Date): Promise<Streak[]>;
  breakStreak(streakId: string): Promise<void>;
}

// ── Stats (for achievement checks & admin) ─────────────────────────────────────

export interface GamificationStatsRepository {
  getAggregateFitnessStats(): Promise<{
    totalWalks: number;
    avgDistanceKm: number;
    totalDistanceKm: number;
    topWalkers: { userId: string; displayName: string | null; totalKm: number }[];
  }>;
  countCompletedWalks(userId: string): Promise<number>;
  countMatches(userId: string): Promise<number>;
  countGroupEventsJoined(userId: string): Promise<number>;
  getTotalWalkDistanceKm(userId: string): Promise<number>;
}

// ── Full repository (backward-compatible union of all interfaces) ──────────────

export interface GamificationRepository
  extends XpRepository,
    ChallengeRepository,
    AchievementRepository,
    StreakRepository,
    GamificationStatsRepository {}
