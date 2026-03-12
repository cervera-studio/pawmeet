import { discoverSchema, swipeSchema } from '@pawmeet/validation';
import { z } from 'zod';
import type { matchDeps } from '../../container.js';
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
          distanceKm: 0, // TODO: compute from PostGIS when location is in match flow
          sizePair: result.sizePair ?? 'unknown',
          energyPair: result.energyPair ?? 'unknown',
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
