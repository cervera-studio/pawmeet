import type { AchievementType, ChallengeType, LeaderboardType, XpAction } from '@dogwalk/config';
import type {
  Achievement,
  Challenge,
  ChallengeWithProgress,
  LeaderboardEntry,
  UserChallenge,
  XpTransaction,
} from '@dogwalk/types';

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

  // Achievements
  findAchievementsByUser(userId: string): Promise<Achievement[]>;
  hasAchievement(userId: string, type: AchievementType): Promise<boolean>;
  unlockAchievement(userId: string, type: AchievementType): Promise<Achievement>;

  // Stats (for achievement checks)
  countCompletedWalks(userId: string): Promise<number>;
  countMatches(userId: string): Promise<number>;
  countGroupEventsJoined(userId: string): Promise<number>;
  getTotalWalkDistanceKm(userId: string): Promise<number>;
}
