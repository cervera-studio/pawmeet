import { discoverSchema, swipeSchema } from '@dogwalk/validation';
import { z } from 'zod';
import type { matchDeps } from '../../container.js';
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

    like: protectedProcedure
      .input(swipeSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.likeDog(ctx.userId, input.dogId, input.targetDogId)),
      ),

    pass: protectedProcedure
      .input(swipeSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.passDog(ctx.userId, input.dogId, input.targetDogId)),
      ),

    unmatch: protectedProcedure
      .input(z.object({ matchId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.unmatch(ctx.userId, input.matchId)),
      ),
  });
}
