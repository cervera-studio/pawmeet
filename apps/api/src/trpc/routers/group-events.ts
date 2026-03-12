import {
  cancelGroupEventSchema,
  createGroupEventSchema,
  getGroupEventSchema,
  joinGroupEventSchema,
  leaveGroupEventSchema,
  listNearbyEventsSchema,
  updateGroupEventSchema,
} from '@dogwalk/validation';
import type { groupEventDeps } from '../../container.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createGroupEventsRouter(deps: typeof groupEventDeps) {
  return router({
    create: protectedProcedure.input(createGroupEventSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(
        await deps.createGroupEvent(ctx.userId, {
          ...input,
          scheduledAt: new Date(input.scheduledAt),
        }),
      );
      trackEvent('group_event_created', ctx.userId, {
        maxParticipants: input.maxParticipants,
        distanceFromCreatorKm: 0,
        category: 'walk',
        visibility: input.visibility as 'public' | 'friends_only' | 'invite_only',
        requiresApproval: false,
        isRecurring: false,
      });
      return result;
    }),

    get: protectedProcedure
      .input(getGroupEventSchema)
      .query(async ({ input }) => unwrapResult(await deps.getGroupEvent(input.eventId))),

    listNearby: protectedProcedure
      .input(listNearbyEventsSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.listNearbyEvents(ctx.userId, input)),
      ),

    listMine: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.listUserEvents(ctx.userId)),
    ),

    join: protectedProcedure.input(joinGroupEventSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.joinGroupEvent(ctx.userId, input));
      trackEvent('group_event_joined', ctx.userId, {
        participantNumber: result.participantNumber,
        distanceKm: 0, // TODO: compute from PostGIS user/event locations
      });
      return result.participant;
    }),

    leave: protectedProcedure
      .input(leaveGroupEventSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.leaveGroupEvent(ctx.userId, input.eventId)),
      ),

    update: protectedProcedure.input(updateGroupEventSchema).mutation(async ({ ctx, input }) => {
      const { eventId, scheduledAt, ...rest } = input;
      return unwrapResult(
        await deps.updateGroupEvent(ctx.userId, eventId, {
          ...rest,
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        }),
      );
    }),

    cancel: protectedProcedure
      .input(cancelGroupEventSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.cancelGroupEvent(ctx.userId, input.eventId)),
      ),
  });
}
