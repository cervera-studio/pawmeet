import {
  approveParticipantSchema,
  cancelGroupEventSchema,
  cancelRequestSchema,
  createGroupEventSchema,
  createOfficialEventSchema,
  createRecurringEventSchema,
  declineParticipantSchema,
  getGroupEventSchema,
  joinGroupEventSchema,
  leaveGroupEventSchema,
  listFeaturedEventsSchema,
  listNearbyEventsSchema,
  listOccurrencesSchema,
  listPendingRequestsSchema,
  updateGroupEventSchema,
} from '@pawmeet/validation';
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
        category: input.category ?? 'walk',
        visibility: input.visibility ?? 'public',
        requiresApproval: input.requiresApproval ?? false,
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
        distanceKm: 0,
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

    // Approval flow
    requestJoin: protectedProcedure.input(joinGroupEventSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.requestJoinEvent(ctx.userId, input));
      trackEvent('group_event_request_sent', ctx.userId, {
        eventCategory: 'walk',
        isHostFriend: false,
      });
      return result.participant;
    }),

    approveParticipant: protectedProcedure
      .input(approveParticipantSchema)
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(
          await deps.approveParticipant(ctx.userId, input.eventId, input.userId),
        );
        trackEvent('group_event_request_approved', ctx.userId, {
          requestAgeHours: 0,
          participantNumber: 0,
        });
        return result;
      }),

    declineParticipant: protectedProcedure
      .input(declineParticipantSchema)
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(
          await deps.declineParticipant(ctx.userId, input.eventId, input.userId),
        );
        trackEvent('group_event_request_declined', ctx.userId, { requestAgeHours: 0 });
        return result;
      }),

    cancelRequest: protectedProcedure
      .input(cancelRequestSchema)
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(await deps.cancelRequest(ctx.userId, input.eventId));
        trackEvent('group_event_request_cancelled', ctx.userId, { requestAgeHours: 0 });
        return result;
      }),

    listPendingRequests: protectedProcedure
      .input(listPendingRequestsSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.listPendingRequests(ctx.userId, input.eventId)),
      ),

    // Recurrence
    createRecurring: protectedProcedure
      .input(createRecurringEventSchema)
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(
          await deps.createRecurringEvent(ctx.userId, {
            ...input,
            scheduledAt: new Date(input.scheduledAt),
            recurrenceEnd: input.recurrenceEnd ? new Date(input.recurrenceEnd) : undefined,
          }),
        );
        trackEvent('group_event_created', ctx.userId, {
          maxParticipants: input.maxParticipants,
          distanceFromCreatorKm: 0,
          category: input.category ?? 'walk',
          visibility: input.visibility ?? 'public',
          requiresApproval: input.requiresApproval ?? false,
          isRecurring: true,
        });
        return result;
      }),

    listOccurrences: protectedProcedure
      .input(listOccurrencesSchema)
      .query(async ({ input }) => unwrapResult(await deps.listOccurrences(input.eventId))),

    // Official events
    createOfficial: protectedProcedure
      .input(createOfficialEventSchema)
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(
          await deps.createOfficialEvent(ctx.userId, {
            ...input,
            scheduledAt: new Date(input.scheduledAt),
          }),
        );
        trackEvent('group_event_created', ctx.userId, {
          maxParticipants: input.maxParticipants,
          distanceFromCreatorKm: 0,
          category: 'meetup',
          visibility: 'public',
          requiresApproval: false,
          isRecurring: false,
        });
        return result;
      }),

    listFeatured: protectedProcedure
      .input(listFeaturedEventsSchema)
      .query(async ({ input }) =>
        unwrapResult(await deps.listFeaturedEvents(input.page, input.pageSize)),
      ),
  });
}
