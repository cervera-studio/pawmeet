import { XP_POINTS } from '@pawmeet/config';
import { logger } from '@pawmeet/utils';
import { listDogMoodLogsSchema, submitMoodLogSchema } from '@pawmeet/validation';
import type { moodLogDeps } from '../../container/index.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createMoodLogRouter(deps: typeof moodLogDeps) {
  return router({
    submit: protectedProcedure.input(submitMoodLogSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(
        await deps.submitMoodLog(ctx.userId, {
          dogId: input.dogId,
          trackId: input.trackId,
          rating: input.rating,
          tags: input.tags,
          notes: input.notes,
        }),
      );
      trackEvent('mood_log_submitted', ctx.userId, {
        rating: input.rating,
        tagCount: input.tags.length,
        hasNotes: !!input.notes,
        source: 'post_walk',
      });

      // Gamification: small XP reward (fire and forget)
      void deps
        .awardXp(ctx.userId, 'mood_logged')
        .catch((e) => logger.warn('gamification', 'Side effect failed', e));
      trackEvent('gamification_xp_awarded', ctx.userId, {
        amount: XP_POINTS.mood_logged,
        source: 'mood_logged',
      });

      return result;
    }),

    listByDog: protectedProcedure
      .input(listDogMoodLogsSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(
          await deps.listDogMoodLogs(ctx.userId, input.dogId, input.cursor, input.limit),
        ),
      ),
  });
}
