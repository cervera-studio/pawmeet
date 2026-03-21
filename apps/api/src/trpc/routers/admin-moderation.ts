import type { GroupEventStatus } from '@pawmeet/types';
import { pushNotificationDataSchema } from '@pawmeet/validation';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { canTransitionTo } from '../../domain/group-event-state-machine.js';
import { enqueueNotification } from '../../jobs/queue.js';
import { logAdminAction, RESOURCE_TYPE } from '../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../lib/admin-permissions.js';
import { toAuditChanges } from '../../lib/audit-helpers.js';
import { paginate } from '../../lib/pagination.js';
import { trackEvent } from '../../lib/track-event.js';
import type { AdminDataRepository } from '../../ports/admin-data-repository.js';
import type { AuditLogRepository } from '../../ports/audit-log-repository.js';
import { createAddEventSponsor } from '../../use-cases/admin/add-event-sponsor.js';
import { createResolveContentReport } from '../../use-cases/admin/resolve-content-report.js';
import { router, unwrapResult } from '../trpc.js';
import { createAdminProcedure } from './admin-procedure.js';

/** Mask an email address: `user@example.com` -> `u***@example.com` */
function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!(local && domain)) return '***';
  return `${local[0]}***@${domain}`;
}

/** Mask a phone number: `+39 333 1234567` -> `+39 ***4567` */
function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (phone.length <= 4) return '***';
  return `***${phone.slice(-4)}`;
}

const listDogsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const getDogSchema = z.object({
  id: z.uuid(),
});

const listReportsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'resolved', 'dismissed']).optional(),
});

const resolveReportSchema = z.object({
  id: z.uuid(),
  action: z.enum(['dismiss', 'warn', 'suspend', 'ban']),
});

const listFeedPostsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  search: z.string().optional(),
});

const updatePostModerationSchema = z.object({
  postId: z.uuid(),
  status: z.enum(['approved', 'rejected']),
});

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

const addSponsorSchema = z.object({
  eventId: z.uuid(),
  organizationId: z.uuid(),
  tier: z.enum(['title', 'gold', 'silver', 'partner']),
  logoPlacement: z.enum(['header', 'footer', 'banner']).default('footer'),
});

const removeSponsorSchema = z.object({
  eventId: z.uuid(),
  organizationId: z.uuid(),
});

const listEventSponsorsSchema = z.object({
  eventId: z.uuid(),
});

const sizeCategoryEnum = z.enum(['toy', 'small', 'medium', 'large', 'giant']);

const listBreedsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  group: z.string().optional(),
});

const createBreedSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'Code must be lowercase alphanumeric with underscores'),
  group: z.string().max(50).optional(),
  sizeCategory: sizeCategoryEnum,
  avgWeightKg: z.number().int().positive().optional(),
});

const updateBreedSchema = z.object({
  id: z.number().int().positive(),
  code: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  group: z.string().max(50).optional(),
  sizeCategory: sizeCategoryEnum.optional(),
  avgWeightKg: z.number().int().positive().optional(),
});

const deleteBreedSchema = z.object({
  id: z.number().int().positive(),
});

interface ModerationRouterDeps {
  adminDataRepo: AdminDataRepository;
  auditLogRepo: AuditLogRepository;
}

export function createAdminModerationRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, auditLogRepo } = deps;
  const resolveContentReport = createResolveContentReport({ adminDataRepo });
  const addEventSponsor = createAddEventSponsor({ adminDataRepo });

  return router({
    // ── Dogs management ──────────────────────────────────────────────────────
    listDogs: adminProcedure.input(listDogsSchema).query(async ({ input }) => {
      const result = await adminDataRepo.listDogs(input);
      return paginate(result, input);
    }),

    getDog: adminProcedure.input(getDogSchema).query(async ({ input }) => {
      const dog = await adminDataRepo.getDog(input.id);
      if (!dog) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Dog not found' });
      }
      return dog;
    }),

    // ── Reports management ───────────────────────────────────────────────────
    listReports: adminProcedure.input(listReportsSchema).query(async ({ input }) => {
      const { items, total } = await adminDataRepo.listReports(input);

      const userIds = [...new Set(items.flatMap((r) => [r.reporterId, r.reportedUserId]))];
      const userRows = await adminDataRepo.getReportUserInfos(userIds);
      const userMap = new Map(userRows.map((u) => [u.id, u]));

      return paginate(
        {
          data: items.map((r) => ({
            ...r,
            reporterName: userMap.get(r.reporterId)?.displayName ?? 'Utente sconosciuto',
            reporterEmail: maskEmail(userMap.get(r.reporterId)?.email),
            reportedName: userMap.get(r.reportedUserId)?.displayName ?? 'Utente sconosciuto',
            reportedEmail: maskEmail(userMap.get(r.reportedUserId)?.email),
          })),
          total,
        },
        input,
      );
    }),

    resolveReport: adminProcedure.input(resolveReportSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);

      const result = await resolveContentReport({
        reportId: input.id,
        action: input.action,
        adminId: ctx.userId,
      });
      const data = unwrapResult(result);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: `report.${input.action}`,
        resourceType: RESOURCE_TYPE.report,
        resourceId: input.id,
        changes: { before: { status: 'pending' }, after: { status: data.newStatus } },
      });

      trackEvent('admin_report_resolved', ctx.userId, {
        reportId: input.id,
        action: input.action,
      });

      return { success: true };
    }),

    // ── Feed management ──────────────────────────────────────────────────────
    listFeedPosts: adminProcedure.input(listFeedPostsSchema).query(async ({ input }) => {
      const result = await adminDataRepo.listFeedPosts(input);

      const mediaByPost = new Map<string, typeof result.media>();
      for (const m of result.media) {
        const list = mediaByPost.get(m.postId) ?? [];
        list.push(m);
        mediaByPost.set(m.postId, list);
      }

      const reportCountMap = new Map(result.reportCounts.map((r) => [r.contentId, r.count]));

      return paginate(
        {
          data: result.posts.map((p) => ({
            ...p,
            authorEmail: maskEmail(p.authorEmail),
            media: mediaByPost.get(p.id) ?? [],
            reportCount: reportCountMap.get(p.id) ?? 0,
          })),
          total: result.total,
        },
        input,
      );
    }),

    updatePostModeration: adminProcedure
      .input(updatePostModerationSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        const post = await adminDataRepo.findPostById(input.postId);
        if (!post) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
        }

        await adminDataRepo.updatePostModeration(input.postId, input.status);

        if (input.status === 'rejected') {
          await adminDataRepo.softDeletePost(input.postId);
        }

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: `post.${input.status}`,
          resourceType: RESOURCE_TYPE.post,
          resourceId: input.postId,
          changes: {
            before: { moderationStatus: post.moderationStatus },
            after: { moderationStatus: input.status },
          },
        });

        return { success: true };
      }),

    listStories: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        }),
      )
      .query(async ({ input }) => {
        const result = await adminDataRepo.listStories(input);
        return paginate(result, input);
      }),

    deleteStory: adminProcedure
      .input(z.object({ storyId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        const story = await adminDataRepo.findStoryById(input.storyId);
        if (!story) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' });
        }

        await adminDataRepo.deleteStory(input.storyId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'story.delete',
          resourceType: RESOURCE_TYPE.story,
          resourceId: input.storyId,
        });

        return { success: true };
      }),

    getFeedStats: adminProcedure.query(async () => {
      return adminDataRepo.getFeedStats();
    }),

    // ── Photo moderation ─────────────────────────────────────────────────────
    listPendingPhotos: adminProcedure.query(async () => {
      const rows = await adminDataRepo.listPendingPhotos();
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        dogId: r.dogId,
        dogName: r.dogName,
        imageUrl: r.imageUrl,
        type: 'dog' as const,
        uploadedAt: r.uploadedAt.toISOString(),
      }));
    }),

    approvePhoto: adminProcedure
      .input(z.object({ photoId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        const photo = await adminDataRepo.findPhotoById(input.photoId);
        if (!photo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
        }

        await adminDataRepo.updatePhotoModeration(input.photoId, 'approved');

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'photo.approve',
          resourceType: RESOURCE_TYPE.photo,
          resourceId: input.photoId,
          changes: {
            before: { moderationStatus: 'pending' },
            after: { moderationStatus: 'approved' },
          },
        });

        return { success: true };
      }),

    rejectPhoto: adminProcedure
      .input(z.object({ photoId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        const photo = await adminDataRepo.findPhotoById(input.photoId);
        if (!photo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
        }

        await adminDataRepo.updatePhotoModeration(input.photoId, 'rejected');

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'photo.reject',
          resourceType: RESOURCE_TYPE.photo,
          resourceId: input.photoId,
          changes: {
            before: { moderationStatus: 'pending' },
            after: { moderationStatus: 'rejected' },
          },
        });

        return { success: true };
      }),

    approveAllPhotos: adminProcedure.mutation(async ({ ctx }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);

      await adminDataRepo.approveAllPendingPhotos();

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'photo.approveAll',
        resourceType: RESOURCE_TYPE.photo,
      });

      return { success: true };
    }),

    // ── Group events management ───────────────────────────────────────────────
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

    // ── Organizations management ────────────────────────────────────────────
    listOrganizations: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
          type: z.enum(['pawmeet_team', 'association', 'educator', 'brand']).optional(),
        }),
      )
      .query(async ({ input }) => {
        const { items, total, memberCounts } = await adminDataRepo.listOrganizations(input);

        const memberCountMap = new Map(memberCounts.map((m) => [m.organizationId, m.count]));

        return paginate(
          {
            data: items.map((o) => ({
              ...o,
              memberCount: memberCountMap.get(o.id) ?? 0,
            })),
            total,
          },
          input,
        );
      }),

    getOrganization: adminProcedure
      .input(z.object({ id: z.uuid() }))
      .query(async ({ input }) => {
        const result = await adminDataRepo.getOrganization(input.id);
        if (!result) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }
        return { ...result.organization, members: result.members };
      }),

    verifyOrganization: adminProcedure
      .input(z.object({ organizationId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const org = await adminDataRepo.findOrganizationById(input.organizationId);
        if (!org) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }

        await adminDataRepo.verifyOrganization(input.organizationId, ctx.userId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'organization.verify',
          resourceType: RESOURCE_TYPE.organization,
          resourceId: input.organizationId,
        });

        return { success: true };
      }),

    revokeOrganization: adminProcedure
      .input(z.object({ organizationId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const org = await adminDataRepo.findOrganizationById(input.organizationId);
        if (!org) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }

        await adminDataRepo.revokeOrganization(input.organizationId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'organization.revoke',
          resourceType: RESOURCE_TYPE.organization,
          resourceId: input.organizationId,
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

    // ── Event sponsors management ────────────────────────────────────────────
    listEventSponsors: adminProcedure.input(listEventSponsorsSchema).query(async ({ input }) => {
      const sponsors = await adminDataRepo.listEventSponsors(input.eventId);
      return { data: sponsors };
    }),

    addEventSponsor: adminProcedure.input(addSponsorSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const result = await addEventSponsor(input);
      const sponsor = unwrapResult(result);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'sponsor.add',
        resourceType: RESOURCE_TYPE.sponsor,
        resourceId: input.eventId,
        changes: { after: { organizationId: input.organizationId, tier: input.tier } },
      });

      return sponsor;
    }),

    removeEventSponsor: adminProcedure
      .input(removeSponsorSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const existing = await adminDataRepo.findEventSponsor(input.eventId, input.organizationId);
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Sponsor not found for this event' });
        }

        await adminDataRepo.removeEventSponsor(input.eventId, input.organizationId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'sponsor.remove',
          resourceType: RESOURCE_TYPE.sponsor,
          resourceId: input.eventId,
          changes: { before: { organizationId: input.organizationId } },
        });

        return { success: true };
      }),

    // ── Safety management ──────────────────────────────────────────────────────
    listSosAlerts: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          type: z.enum(['sos', 'auto_alert', 'checkin']).optional(),
        }),
      )
      .query(async ({ input }) => {
        const result = await adminDataRepo.listSosAlerts(input);
        return paginate(result, input);
      }),

    listEmergencyContacts: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
        }),
      )
      .query(async ({ input }) => {
        const result = await adminDataRepo.listEmergencyContacts(input);
        return paginate(
          {
            data: result.data.map((item) => ({
              ...item,
              phone: maskPhone(item.phone),
            })),
            total: result.total,
          },
          input,
        );
      }),

    // ── Breeds management ──────────────────────────────────────────────────────
    listBreeds: adminProcedure.input(listBreedsSchema).query(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);

      const result = await adminDataRepo.listBreeds(input);
      return paginate(result, input);
    }),

    createBreed: adminProcedure.input(createBreedSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const created = await adminDataRepo.createBreed(input);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'create_breed',
        resourceType: RESOURCE_TYPE.breed,
        resourceId: String((created as { id?: number }).id),
        changes: { after: toAuditChanges(input) },
      });

      return created;
    }),

    updateBreed: adminProcedure.input(updateBreedSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const { id, ...updates } = input;

      const existing = await adminDataRepo.findBreedById(id);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Breed not found' });
      }

      const setValues: Record<string, unknown> = {};
      if (updates.code !== undefined) setValues.code = updates.code;
      if (updates.group !== undefined) setValues.group = updates.group;
      if (updates.sizeCategory !== undefined) setValues.sizeCategory = updates.sizeCategory;
      if (updates.avgWeightKg !== undefined) setValues.avgWeightKg = updates.avgWeightKg;

      if (Object.keys(setValues).length === 0) {
        return existing;
      }

      const updated = await adminDataRepo.updateBreed(id, setValues);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'update_breed',
        resourceType: RESOURCE_TYPE.breed,
        resourceId: String(id),
        changes: {
          before: toAuditChanges(existing),
          ...(updated ? { after: toAuditChanges(updated) } : {}),
        },
      });

      return updated;
    }),

    deleteBreed: adminProcedure.input(deleteBreedSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const existing = await adminDataRepo.findBreedById(input.id);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Breed not found' });
      }

      const dogCount = await adminDataRepo.countDogsReferencingBreed(existing.code);

      if (dogCount > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot delete breed "${existing.code}": ${dogCount} dog(s) still reference it`,
        });
      }

      await adminDataRepo.deleteBreed(input.id);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'delete_breed',
        resourceType: RESOURCE_TYPE.breed,
        resourceId: String(input.id),
        changes: { before: toAuditChanges(existing) },
      });

      return { success: true };
    }),

    // ── Push notifications ──────────────────────────────────────────────────────
    sendBroadcastNotification: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(100),
          body: z.string().min(1).max(500),
          data: pushNotificationDataSchema.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const activeUsersWithToken = await adminDataRepo.getActiveUsersWithPushToken();

        const BATCH_SIZE = 100;
        for (let i = 0; i < activeUsersWithToken.length; i += BATCH_SIZE) {
          const batch = activeUsersWithToken.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map((user) =>
              enqueueNotification({
                userId: user.id,
                title: input.title,
                body: input.body,
                data: input.data,
              }),
            ),
          );
        }

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'send_broadcast',
          resourceType: RESOURCE_TYPE.notification,
          changes: {
            after: {
              title: input.title,
              body: input.body,
              sentCount: activeUsersWithToken.length,
            },
          },
        });

        return { sentCount: activeUsersWithToken.length };
      }),

    sendTargetedNotification: adminProcedure
      .input(
        z.object({
          userIds: z.array(z.uuid()).min(1).max(100),
          title: z.string().min(1).max(100),
          body: z.string().min(1).max(500),
          data: pushNotificationDataSchema.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const targetUsers = await adminDataRepo.getTargetedUsers(input.userIds);

        const usersWithToken = targetUsers.filter((u) => u.pushToken != null);
        const skippedCount = input.userIds.length - usersWithToken.length;

        await Promise.all(
          usersWithToken.map((user) =>
            enqueueNotification({
              userId: user.id,
              title: input.title,
              body: input.body,
              data: input.data,
            }),
          ),
        );

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'send_targeted',
          resourceType: RESOURCE_TYPE.notification,
          changes: {
            after: {
              title: input.title,
              body: input.body,
              targetUserIds: input.userIds,
              sentCount: usersWithToken.length,
              skippedCount,
            },
          },
        });

        return { sentCount: usersWithToken.length, skippedCount };
      }),

    getNotificationStats: adminProcedure.query(async ({ ctx }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);
      return adminDataRepo.getNotificationStats();
    }),
  });
}
