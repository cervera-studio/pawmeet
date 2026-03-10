import { WALK_DURATION_MAX, WALK_DURATION_MIN } from '@dogwalk/config';
import { z } from 'zod';
import type { walkDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

const proposeSchema = z.object({
  matchId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(WALK_DURATION_MIN).max(WALK_DURATION_MAX).default(30),
  title: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().max(500).optional(),
});

const respondSchema = z.object({
  walkId: z.string().uuid(),
  accept: z.boolean(),
});

const cancelSchema = z.object({
  walkId: z.string().uuid(),
});

const listByMatchSchema = z.object({
  matchId: z.string().uuid(),
});

export function createWalksRouter(deps: typeof walkDeps) {
  return router({
    propose: protectedProcedure.input(proposeSchema).mutation(async ({ ctx, input }) =>
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
      .input(respondSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.respondToWalk(ctx.userId, input.walkId, input.accept)),
      ),

    cancel: protectedProcedure
      .input(cancelSchema)
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
