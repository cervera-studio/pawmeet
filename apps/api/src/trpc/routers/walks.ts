import {
  cancelWalkSchema,
  listByMatchSchema,
  proposeWalkSchema,
  respondWalkSchema,
} from '@pawmeet/validation';
import type { walkDeps } from '../../container.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createWalksRouter(deps: typeof walkDeps) {
  return router({
    propose: protectedProcedure.input(proposeWalkSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(
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
      );
      trackEvent('walk_proposed', ctx.userId, {
        matchAgeHours: result.matchAgeHours,
        messageCountBeforeProposal: result.messageCountBeforeProposal,
      });
      return { walkId: result.walkId };
    }),

    respond: protectedProcedure.input(respondWalkSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.respondToWalk(ctx.userId, input.walkId, input.accept));
      trackEvent('walk_response', ctx.userId, {
        response: input.accept ? 'accepted' : 'declined',
        proposalAgeHours: result.proposalAgeHours,
      });
      return { message: result.message };
    }),

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
