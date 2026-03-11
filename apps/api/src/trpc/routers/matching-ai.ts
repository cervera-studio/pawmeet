import {
  discoverSchema,
  getMatchingInsightsSchema,
  getOptimalTimesSchema,
  logSwipeScoreSchema,
  recordActivityWindowSchema,
  recordMatchInteractionSchema,
} from '@dogwalk/validation';
import type { matchingAiDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createMatchingAiRouter(deps: typeof matchingAiDeps) {
  return router({
    logSwipeScores: protectedProcedure.input(logSwipeScoreSchema).mutation(async ({ input }) =>
      unwrapResult(
        await deps.logSwipeScores({
          swiperDogId: input.dogId,
          swipedDogId: input.targetDogId,
          direction: input.direction,
          sizeScore: input.scores.sizeScore,
          energyScore: input.scores.energyScore,
          behaviorScore: input.scores.behaviorScore,
          walkScore: input.scores.walkScore,
          distanceScore: input.scores.distanceScore,
          leashScore: input.scores.leashScore,
          overallScore: input.scores.overallScore,
        }),
      ),
    ),

    recordInteraction: protectedProcedure
      .input(recordMatchInteractionSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(
          await deps.recordMatchInteraction(
            ctx.userId,
            input.matchId,
            input.interactionType,
            input.metadata,
          ),
        ),
      ),

    recordActivity: protectedProcedure
      .input(recordActivityWindowSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.recordActivityWindow(ctx.userId, input.dayOfWeek, input.hourOfDay)),
      ),

    learnPreferences: protectedProcedure.mutation(async ({ ctx }) =>
      unwrapResult(await deps.learnUserPreferences(ctx.userId)),
    ),

    optimalTimes: protectedProcedure
      .input(getOptimalTimesSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getOptimalTimes(ctx.userId, input.dogId, input.limit)),
      ),

    insights: protectedProcedure
      .input(getMatchingInsightsSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getMatchingInsights(ctx.userId, input.dogId)),
      ),

    discoverAi: protectedProcedure
      .input(discoverSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(
          await deps.discoverCandidatesAi(ctx.userId, input.dogId, input.limit, input.filters),
        ),
      ),
  });
}
