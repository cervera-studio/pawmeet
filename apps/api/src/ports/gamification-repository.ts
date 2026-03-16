import type { AchievementType, ChallengeType, LeaderboardType, XpAction } from '@pawmeet/config';
import type {
  Achievement,
  Challenge,
  LeaderboardEntry,
  Streak,
  UserChallenge,
  XpTransaction,
} from '@pawmeet/types';

export interface GamificationRepository {
  // XP
  createXpTransaction(
    userId: string,
    action: XpAction,
    points: number,
    metadata?: Record<string, unknown>,
  ): Promise<XpTransaction>;
  getTotalXp(userId: string): Promise<number>;
  getLeaderboard(type: LeaderboardType, limit: number): Promise<LeaderboardEntry[]>;

  // Challenges
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

  // Achievements
  findAchievementsByUser(userId: string): Promise<Achievement[]>;
  hasAchievement(userId: string, type: AchievementType): Promise<boolean>;
  unlockAchievement(userId: string, type: AchievementType): Promise<Achievement>;

  // Streaks
  getStreak(userId: string, type: string): Promise<Streak | null>;
  upsertStreak(
    userId: string,
    type: string,
    data: { currentLength: number; longestLength: number; lastActivityDate: Date },
  ): Promise<Streak>;
  findStreaksOlderThan(date: Date): Promise<Streak[]>;
  breakStreak(streakId: string): Promise<void>;

  // Admin challenge management
  listAllChallenges(limit: number, offset: number): Promise<{ data: Challenge[]; total: number }>;
  deleteChallenge(challengeId: string): Promise<void>;

  // Aggregate fitness stats (admin)
  getAggregateFitnessStats(): Promise<{
    totalWalks: number;
    avgDistanceKm: number;
    totalDistanceKm: number;
    topWalkers: { userId: string; displayName: string | null; totalKm: number }[];
  }>;

  // Stats (for achievement checks)
  countCompletedWalks(userId: string): Promise<number>;
  countMatches(userId: string): Promise<number>;
  countGroupEventsJoined(userId: string): Promise<number>;
  getTotalWalkDistanceKm(userId: string): Promise<number>;
}
