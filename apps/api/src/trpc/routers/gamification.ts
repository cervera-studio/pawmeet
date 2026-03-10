import { getLeaderboardSchema, listAchievementsSchema } from '@dogwalk/validation';
import type { gamificationDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createGamificationRouter(deps: typeof gamificationDeps) {
  return router({
    getXpSummary: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.getXpSummary(ctx.userId)),
    ),

    getLeaderboard: protectedProcedure
      .input(getLeaderboardSchema)
      .query(async ({ input }) => unwrapResult(await deps.getLeaderboard(input.type, input.limit))),

    listActiveChallenges: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.listActiveChallenges(ctx.userId)),
    ),

    listAchievements: protectedProcedure
      .input(listAchievementsSchema)
      .query(async ({ input }) => unwrapResult(await deps.listAchievements(input.userId))),
  });
}
