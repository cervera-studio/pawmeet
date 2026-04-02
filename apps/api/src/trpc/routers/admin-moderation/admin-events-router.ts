import type { GroupEventStatus } from '@pawmeet/types';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { canTransitionTo } from '../../../domain/group-event-state-machine.js';
import { logAdminAction, RESOURCE_TYPE } from '../../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../../lib/admin-permissions.js';
import { paginate } from '../../../lib/pagination.js';
import { trackEvent } from '../../../lib/track-event.js';
import { router } from '../../trpc.js';
import { createAdminProcedure } from '../admin-procedure.js';
import type { ModerationRouterDeps } from './types.js';

const listGroupEventsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'template']).optional(),
  category: z.enum(['walk', 'meetup', 'training']).optional(),
});

const getGroupEventSchema = z.object({
  id: z.uuid(),
});

const cancelGroupEventSchema = z.object({
  eventId: z.uuid(),
});

const removeParticipantSchema = z.object({
  participantId: z.uuid(),
});

export function createAdminEventsRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, auditLogRepo } = deps;

  return router({
    listGroupEvents: adminProcedure.input(listGroupEventsSchema).query(async ({ input }) => {
      const { items, total, participantCounts } = await adminDataRepo.listGroupEvents(input);

      const countMap = new Map<string, { participants: number; pending: number }>();
      for (const row of participantCounts) {
        const entry = countMap.get(row.eventId) ?? { participants: 0, pending: 0 };
        if (row.status === 'accepted') entry.participants = row.count;
        if (row.status === 'pending') entry.pending = row.count;
        countMap.set(row.eventId, entry);
      }

      return paginate(
        {
          data: items.map((e) => ({
            id: e.id,
            title: e.title,
            category: e.category,
            visibility: e.visibility,
            status: e.status,
            scheduledAt: e.scheduledAt,
            location: e.location,
            maxParticipants: e.maxParticipants,
            requiresApproval: e.requiresApproval,
            createdAt: e.createdAt,
            creatorId: e.creatorId,
            creatorName: e.creatorName,
            participantCount: countMap.get(e.id)?.participants ?? 0,
            pendingCount: countMap.get(e.id)?.pending ?? 0,
            isRecurring: e.recurrenceRule != null || e.parentEventId != null,
          })),
          total,
        },
        input,
      );
    }),

    getGroupEvent: adminProcedure.input(getGroupEventSchema).query(async ({ input }) => {
      const result = await adminDataRepo.getGroupEvent(input.id);
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      const { event, participants } = result;
      const acceptedCount = participants.filter((p) => p.status === 'accepted').length;
      const pendingCount = participants.filter((p) => p.status === 'pending').length;

      return {
        ...event,
        participantCount: acceptedCount,
        pendingCount,
        isRecurring: event.recurrenceRule != null || event.parentEventId != null,
        participants,
      };
    }),

    cancelGroupEvent: adminProcedure
      .input(cancelGroupEventSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const event = await adminDataRepo.findGroupEventById(input.eventId);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
        }

        if (!canTransitionTo(event.status as GroupEventStatus, 'cancelled')) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Cannot cancel event with status "${event.status}"`,
          });
        }

        await adminDataRepo.cancelGroupEvent(input.eventId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'event.cancel',
          resourceType: RESOURCE_TYPE.event,
          resourceId: input.eventId,
        });

        return { success: true };
      }),

    removeEventParticipant: adminProcedure
      .input(removeParticipantSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const participant = await adminDataRepo.findParticipantById(input.participantId);
        if (!participant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Participant not found' });
        }

        await adminDataRepo.removeParticipant(input.participantId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'event.removeParticipant',
          resourceType: RESOURCE_TYPE.event,
          resourceId: input.participantId,
        });

        return { success: true };
      }),

    createOfficialEvent: adminProcedure
      .input(
        z.object({
          title: z.string().min(3).max(100),
          description: z.string().max(2000).optional(),
          scheduledAt: z.iso.datetime(),
          durationMin: z.number().int().min(15).max(180).default(60),
          location: z.string().min(1),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          maxParticipants: z.number().int().min(2).max(500).default(100),
          organizationId: z.uuid(),
          coverImageUrl: z.url().optional(),
          category: z.enum(['walk', 'meetup', 'training']).default('meetup'),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const org = await adminDataRepo.findOrganizationById(input.organizationId);
        if (!org) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }
        if (!(org.isVerified && org.isActive)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization must be verified and active',
          });
        }

        const event = await adminDataRepo.createOfficialEvent({
          createdBy: ctx.userId,
          title: input.title,
          description: input.description ?? null,
          scheduledAt: new Date(input.scheduledAt),
          durationMin: input.durationMin,
          location: input.location,
          latitude: input.latitude,
          longitude: input.longitude,
          maxParticipants: input.maxParticipants,
          category: input.category,
          coverImageUrl: input.coverImageUrl ?? null,
          organizationId: input.organizationId,
        });

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'event.createOfficial',
          resourceType: RESOURCE_TYPE.event,
          resourceId: event?.id,
          changes: {
            after: {
              title: input.title,
              organizationId: input.organizationId,
              maxParticipants: input.maxParticipants,
            },
          },
        });

        if (event) {
          trackEvent('admin_event_created', ctx.userId, {
            eventId: event.id,
            category: input.category,
            maxParticipants: input.maxParticipants,
          });
        }

        return event;
      }),
  });
}
