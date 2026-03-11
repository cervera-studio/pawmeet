import { submitFeedbackSchema } from '@dogwalk/validation';
import { z } from 'zod';
import type { feedbackDeps } from '../../container.js';
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
