import {
  cancelWalkSchema,
  listByMatchSchema,
  proposeWalkSchema,
  respondWalkSchema,
} from '@dogwalk/validation';
import type { walkDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createWalksRouter(deps: typeof walkDeps) {
  return router({
    propose: protectedProcedure.input(proposeWalkSchema).mutation(async ({ ctx, input }) =>
      unwrapResult(
        await deps.proposeWalk(ctx.userId, {
          matchId: input.matchId,
          scheduledAt: new Date(input.scheduledAt),
          durationMin: input.durationMin,
          title: input.title,
          location: input.location,
          latitude: input.latitude,
          longitude: input.longitude,
          notes: input.notes,
        }),
      ),
    ),

    respond: protectedProcedure
      .input(respondWalkSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.respondToWalk(ctx.userId, input.walkId, input.accept)),
      ),

    cancel: protectedProcedure
      .input(cancelWalkSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.cancelWalk(ctx.userId, input.walkId)),
      ),

    listUpcoming: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.listUpcomingWalks(ctx.userId)),
    ),

    listByMatch: protectedProcedure
      .input(listByMatchSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.listWalksByMatch(ctx.userId, input.matchId)),
      ),
  });
}
