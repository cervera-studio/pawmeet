import type { ApiClient } from '@pawmeet/api-client';
import type { GamificationRepository } from '../interfaces/gamification-repository';

export function createTrpcGamificationRepository(api: ApiClient): GamificationRepository {
  return {
    async getXpSummary() {
      return api.gamification.getXpSummary.query();
    },
    async getLeaderboard(type, limit) {
      const { entries } = await api.gamification.getLeaderboard.query({ type, limit });
      return entries;
    },
    async listActiveChallenges() {
      const { challenges } = await api.gamification.listActiveChallenges.query();
      return challenges.map((c) => ({
        ...c,
        startsAt: new Date(c.startsAt),
        endsAt: new Date(c.endsAt),
        createdAt: new Date(c.createdAt),
        completedAt: c.completedAt ? new Date(c.completedAt) : null,
      }));
    },
    async listAchievements() {
      const { achievements } = await api.gamification.listAchievements.query({
        userId: '00000000-0000-0000-0000-000000000000', // Server uses ctx.userId; required by schema
      });
      return achievements.map((a) => ({
        ...a,
        unlockedAt: new Date(a.unlockedAt),
      }));
    },
  };
}
