import { XP_POINTS } from '@pawmeet/config';
import { submitFeedbackSchema } from '@pawmeet/validation';
import { z } from 'zod';
import type { feedbackDeps } from '../../container/index.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

const listByWalkSchema = z.object({
  walkId: z.string().uuid(),
});

const getDogRatingSchema = z.object({
  dogId: z.string().uuid(),
});

export function createFeedbackRouter(deps: typeof feedbackDeps) {
  return router({
    submit: protectedProcedure.input(submitFeedbackSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(
        await deps.submitFeedback(ctx.userId, {
          walkId: input.walkId,
          toDogId: input.toDogId,
          rating: input.rating,
          comment: input.comment,
        }),
      );
      trackEvent('walk_feedback_submitted', ctx.userId, {
        rating: input.rating,
        hasComment: !!input.comment,
      });

      // Gamification: XP for feedback (fire and forget)
      void deps
        .awardXp(ctx.userId, 'feedback_given')
        .catch((e) => console.warn('Gamification error:', e));
      trackEvent('gamification_xp_awarded', ctx.userId, {
        amount: XP_POINTS.feedback_given,
        source: 'feedback_given',
      });

      return result;
    }),

    listByWalk: protectedProcedure
      .input(listByWalkSchema)
      .query(async ({ input }) => unwrapResult(await deps.listWalkFeedback(input.walkId))),

    getDogRating: protectedProcedure
      .input(getDogRatingSchema)
      .query(async ({ input }) => unwrapResult(await deps.getDogRating(input.dogId))),
  });
}
