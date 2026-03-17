import { XP_POINTS } from '@pawmeet/config';
import { isSuccess } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { discoverSchema, swipeSchema } from '@pawmeet/validation';
import { z } from 'zod';
import type { matchDeps } from '../../container/index.js';
import { enqueueNotification } from '../../jobs/queue.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createMatchesRouter(deps: typeof matchDeps) {
  return router({
    list: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.listMatches(ctx.userId)),
    ),

    discover: protectedProcedure
      .input(discoverSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(
          await deps.discoverCandidates(ctx.userId, input.dogId, input.limit, input.filters),
        ),
      ),

    like: protectedProcedure.input(swipeSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.likeDog(ctx.userId, input.dogId, input.targetDogId));
      if (result.isMatch && result.match) {
        trackEvent('match_created', ctx.userId, {
          compatibilityScore: result.match.compatibilityScore,
          distanceKm: result.distanceKm ?? 0,
          sizePair: result.sizePair ?? 'unknown',
          energyPair: result.energyPair ?? 'unknown',
        });

        // Gamification: XP, challenge progress, achievements (fire and forget)
        void deps
          .awardXp(ctx.userId, 'match_made')
          .then((res) => {
            if (isSuccess(res) && res.data.previousLevel !== res.data.summary.level) {
              trackEvent('gamification_level_up', ctx.userId, {
                newLevel: res.data.summary.level,
                previousLevel: res.data.previousLevel,
                totalXp: res.data.summary.totalXp,
              });
              void enqueueNotification({
                userId: ctx.userId,
                title: 'Livello su!',
                body: `Sei diventato ${res.data.summary.level}!`,
              }).catch((e) => logger.warn('gamification', 'Side effect failed', e));
            }
          })
          .catch((e) => logger.warn('gamification', 'Side effect failed', e));
        void deps
          .updateChallengeProgress(ctx.userId, 'new_matches', 1)
          .catch((e) => logger.warn('gamification', 'Side effect failed', e));
        void deps
          .checkAndUnlockAchievements(ctx.userId)
          .catch((e) => logger.warn('gamification', 'Side effect failed', e));
        trackEvent('gamification_xp_awarded', ctx.userId, {
          amount: XP_POINTS.match_made,
          source: 'match_made',
        });
      }
      return result;
    }),

    pass: protectedProcedure
      .input(swipeSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.passDog(ctx.userId, input.dogId, input.targetDogId)),
      ),

    unmatch: protectedProcedure
      .input(z.object({ matchId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(await deps.unmatch(ctx.userId, input.matchId));
        trackEvent('match_unmatched', ctx.userId, {
          reason: 'manual',
          matchAgeDays: result.matchAgeDays,
          messageCount: result.messageCount,
        });
        return { message: result.message };
      }),
  });
}
