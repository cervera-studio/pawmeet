import {
  discoverSchema,
  getMatchExplanationSchema,
  getMatchingInsightsSchema,
  getNearbyActiveCountSchema,
  getOptimalTimesSchema,
  logSwipeScoreSchema,
  recordActivityWindowSchema,
  recordMatchInteractionSchema,
  suggestWalksSchema,
} from '@pawmeet/validation';
import type { matchingAiDeps } from '../../container/index.js';
import { trackEvent } from '../../lib/track-event.js';
import { countActiveUsers } from '../../lib/user-presence.js';
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

    matchExplanation: protectedProcedure
      .input(getMatchExplanationSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getMatchExplanation(ctx.userId, input.matchId)),
      ),

    suggestWalks: protectedProcedure.input(suggestWalksSchema).query(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.suggestWalks(ctx.userId, input.dogId, input.limit));
      trackEvent('walk_suggestions_viewed', ctx.userId, {
        suggestionCount: result.suggestions.length,
        topScore: result.suggestions[0]?.score ?? 0,
      });
      return result;
    }),

    getNearbyActiveCount: protectedProcedure
      .input(getNearbyActiveCountSchema)
      .query(async ({ ctx, input }) => {
        const userDogs = await deps.dogRepo.findByOwner(ctx.userId, true);
        const dogIds = userDogs.map((d) => d.id);
        if (dogIds.length === 0) return { activeCount: 0, totalMatches: 0 };

        const matches = await deps.matchRepo.findActiveByDogIds(dogIds);
        if (matches.length === 0) return { activeCount: 0, totalMatches: 0 };

        // Collect the "other" dog IDs from matches
        const dogIdSet = new Set(dogIds);
        const otherDogIds = new Set<string>();
        for (const m of matches) {
          otherDogIds.add(dogIdSet.has(m.dogAId) ? m.dogBId : m.dogAId);
        }

        // Resolve other dogs to get their owner IDs
        const otherDogs = await deps.dogRepo.findByIds([...otherDogIds]);
        const otherUserIds = [...new Set(otherDogs.map((d) => d.ownerId))];

        const activeCount = await countActiveUsers(otherUserIds);
        return { activeCount, totalMatches: matches.length };
      }),
  });
}
