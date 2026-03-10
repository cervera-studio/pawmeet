import { z } from 'zod';
import type { matchDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

const swipeSchema = z.object({
  dogId: z.string().uuid(),
  targetDogId: z.string().uuid(),
});

const discoverSchema = z.object({
  dogId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).optional(),
});

export function createMatchesRouter(deps: typeof matchDeps) {
  return router({
    list: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.listMatches(ctx.userId)),
    ),

    discover: protectedProcedure
      .input(discoverSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.discoverCandidates(ctx.userId, input.dogId, input.limit)),
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
