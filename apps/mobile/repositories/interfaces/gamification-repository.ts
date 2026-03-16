import type {
  Achievement,
  ChallengeWithProgress,
  LeaderboardEntry,
  XpSummary,
} from '@pawmeet/types';

export interface GamificationRepository {
  getXpSummary(): Promise<XpSummary>;
  getLeaderboard(type: 'weekly' | 'allTime', limit?: number): Promise<LeaderboardEntry[]>;
  listActiveChallenges(): Promise<ChallengeWithProgress[]>;
  listAchievements(): Promise<Achievement[]>;
}
