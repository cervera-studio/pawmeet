import {
  achievements,
  badges,
  challenges,
  groupEventParticipants,
  groupEvents,
  userChallenges,
  xpTransactions,
} from '@pawmeet/db';
import { eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export function createGamificationQueries(db: NodePgDatabase) {
  return {
    async getXpTransactions(userId: string) {
      return db
        .select({
          action: xpTransactions.action,
          points: xpTransactions.points,
          createdAt: xpTransactions.createdAt,
        })
        .from(xpTransactions)
        .where(eq(xpTransactions.userId, userId));
    },

    async getAchievements(userId: string) {
      return db
        .select({ type: achievements.type, unlockedAt: achievements.unlockedAt })
        .from(achievements)
        .where(eq(achievements.userId, userId));
    },

    async getChallenges(userId: string) {
      return db
        .select({
          title: challenges.title,
          description: challenges.description,
          targetValue: challenges.targetValue,
          progress: userChallenges.progress,
          completedAt: userChallenges.completedAt,
          createdAt: userChallenges.createdAt,
        })
        .from(userChallenges)
        .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
        .where(eq(userChallenges.userId, userId));
    },

    async getBadges(dogIds: string[]) {
      if (dogIds.length === 0) return [];
      return db
        .select({ dogId: badges.dogId, type: badges.type, awardedAt: badges.awardedAt })
        .from(badges)
        .where(inArray(badges.dogId, dogIds));
    },

    async getGroupEventParticipation(userId: string) {
      return db
        .select({
          eventTitle: groupEvents.title,
          eventScheduledAt: groupEvents.scheduledAt,
          eventLocation: groupEvents.location,
          status: groupEventParticipants.status,
          isOrganizer: groupEventParticipants.isOrganizer,
          joinedAt: groupEventParticipants.joinedAt,
        })
        .from(groupEventParticipants)
        .innerJoin(groupEvents, eq(groupEventParticipants.eventId, groupEvents.id))
        .where(eq(groupEventParticipants.userId, userId));
    },
  };
}
