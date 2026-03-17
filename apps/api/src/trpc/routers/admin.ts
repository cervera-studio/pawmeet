import { CHALLENGE_TYPE, DEFAULT_WEIGHTS } from '@pawmeet/config';
import { TRPCError } from '@trpc/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { enqueueNotification } from '../../jobs/queue.js';
import { logAdminAction, RESOURCE_TYPE } from '../../lib/admin-audit.js';
import {
  AdminRole,
  type AdminRoleValue,
  hasMinRole,
  requireRole,
} from '../../lib/admin-permissions.js';
import { toAuditChanges } from '../../lib/audit-helpers.js';
import { paginate } from '../../lib/pagination.js';
import { trackEvent } from '../../lib/track-event.js';
import { getDauCount, getDauTimeSeries } from '../../middleware/analytics-counters.js';
import type { AdminDataRepository } from '../../ports/admin-data-repository.js';
import type { AuditLogRepository } from '../../ports/audit-log-repository.js';
import type { GamificationRepository } from '../../ports/gamification-repository.js';
import { createAddEventSponsor } from '../../use-cases/admin/add-event-sponsor.js';
import { createCreateAdminUser } from '../../use-cases/admin/create-admin-user.js';
import { createResolveContentReport } from '../../use-cases/admin/resolve-content-report.js';
import { createUpdateAdminRole } from '../../use-cases/admin/update-admin-role.js';
import { validateMatchWeights } from '../../use-cases/admin/validate-match-weights.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Mask an email address: `user@example.com` -> `u***@example.com` */
function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
}

/** Mask a phone number: `+39 333 1234567` -> `+39 ***4567` */
function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (phone.length <= 4) return '***';
  return `***${phone.slice(-4)}`;
}

// ── Admin middleware ────────────────────────────────────────────────────────────

function createAdminProcedure() {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.adminRole) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }

    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
        adminRole: ctx.adminRole as AdminRoleValue,
      },
    });
  });
}

// ── Input schemas ──────────────────────────────────────────────────────────────

const listDogsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const getDogSchema = z.object({
  id: z.string().uuid(),
});

const listReportsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'resolved', 'dismissed']).optional(),
});

const resolveReportSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['dismiss', 'warn', 'suspend', 'ban']),
});

const listGroupEventsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'template']).optional(),
  category: z.enum(['walk', 'meetup', 'training']).optional(),
});

const getGroupEventSchema = z.object({
  id: z.string().uuid(),
});

const cancelGroupEventSchema = z.object({
  eventId: z.string().uuid(),
});

const removeParticipantSchema = z.object({
  participantId: z.string().uuid(),
});

const updateSettingsSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  supportEmail: z.string().email().optional(),
  photoConfidenceThreshold: z.number().int().min(0).max(100).optional(),
  maxReportsBeforeSuspension: z.number().int().min(1).optional(),
  matchWeightSize: z.number().min(0).max(1).optional(),
  matchWeightEnergy: z.number().min(0).max(1).optional(),
  matchWeightBehavior: z.number().min(0).max(1).optional(),
  matchWeightWalk: z.number().min(0).max(1).optional(),
  matchWeightDistance: z.number().min(0).max(1).optional(),
  matchWeightLeash: z.number().min(0).max(1).optional(),
});

const listFeedPostsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  search: z.string().optional(),
});

const updatePostModerationSchema = z.object({
  postId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
});

const addSponsorSchema = z.object({
  eventId: z.string().uuid(),
  organizationId: z.string().uuid(),
  tier: z.enum(['title', 'gold', 'silver', 'partner']),
  logoPlacement: z.enum(['header', 'footer', 'banner']).default('footer'),
});

const removeSponsorSchema = z.object({
  eventId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

const listEventSponsorsSchema = z.object({
  eventId: z.string().uuid(),
});

const listAuditLogSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  adminId: z.string().uuid().optional(),
  resourceType: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().optional(),
});

const sizeCategoryEnum = z.enum(['toy', 'piccola', 'media', 'grande', 'gigante']);

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

const adminRoleEnum = z.enum(['viewer', 'moderator', 'admin', 'super_admin']);

const listAdminUsersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: adminRoleEnum.optional(),
});

const createAdminUserSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase().trim()),
  displayName: z.string().min(1).max(100),
  role: adminRoleEnum,
  temporaryPassword: z.string().min(8),
});

const updateAdminRoleSchema = z.object({
  adminId: z.string().uuid(),
  newRole: adminRoleEnum,
});

const toggleAdminActiveSchema = z.object({
  adminId: z.string().uuid(),
});

const resetAdminPasswordSchema = z.object({
  adminId: z.string().uuid(),
  newPassword: z.string().min(8),
});

// ── Deps type ──────────────────────────────────────────────────────────────────

interface AdminRouterDeps {
  adminDataRepo: AdminDataRepository;
  auditLogRepo: AuditLogRepository;
  gamificationRepo?: GamificationRepository;
}

// ── Router ─────────────────────────────────────────────────────────────────────

export function createAdminRouter(deps: AdminRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, auditLogRepo, gamificationRepo } = deps;

  // ── Use cases ───────────────────────────────────────────────────────────────
  const resolveContentReport = createResolveContentReport({ adminDataRepo });
  const addEventSponsor = createAddEventSponsor({ adminDataRepo });
  const createAdminUserUc = createCreateAdminUser({ adminDataRepo });
  const updateAdminRoleUc = createUpdateAdminRole({ adminDataRepo });

  return router({
    // ── Dashboard stats ──────────────────────────────────────────────────────
    getStats: adminProcedure.query(async () => {
      return adminDataRepo.getStats();
    }),

    // ── Analytics KPIs ──────────────────────────────────────────────────────
    getAnalyticsKpis: adminProcedure.query(async () => {
      const [dauToday, dauTimeSeries, dbMetrics] = await Promise.all([
        getDauCount(new Date().toISOString().slice(0, 10)),
        getDauTimeSeries(30),
        adminDataRepo.getAnalyticsDbMetrics(),
      ]);

      const todayMap = new Map(dbMetrics.todayMetrics.map((m) => [m.eventName, m.value]));

      return {
        dauToday,
        registrationsToday: todayMap.get('auth_registration_completed') ?? 0,
        matchesToday: todayMap.get('match_created') ?? 0,
        totalEvents: dbMetrics.totalEvents,
        eventsLast24h: dbMetrics.eventsLast24h,
        dauTimeSeries,
      };
    }),

    // ── Audit log ──────────────────────────────────────────────────────────
    listAuditLog: adminProcedure.input(listAuditLogSchema).query(async ({ input }) => {
      const result = await adminDataRepo.listAuditLog(input);
      return paginate(result, input);
    }),

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
      .input(z.object({ storyId: z.string().uuid() }))
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

        if (event.status === 'cancelled' || event.status === 'completed') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Event already cancelled or completed',
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
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        const result = await adminDataRepo.getOrganization(input.id);
        if (!result) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }
        return { ...result.organization, members: result.members };
      }),

    verifyOrganization: adminProcedure
      .input(z.object({ organizationId: z.string().uuid() }))
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
      .input(z.object({ organizationId: z.string().uuid() }))
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
          scheduledAt: z.string().datetime(),
          durationMin: z.number().int().min(15).max(180).default(60),
          location: z.string().min(1),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          maxParticipants: z.number().int().min(2).max(500).default(100),
          organizationId: z.string().uuid(),
          coverImageUrl: z.string().url().optional(),
          category: z.enum(['walk', 'meetup', 'training']).default('meetup'),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const org = await adminDataRepo.findOrganizationById(input.organizationId);
        if (!org) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }
        if (!org.isVerified || !org.isActive) {
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

    // ── Users management ────────────────────────────────────────────────────
    listUsers: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
          sortBy: z.string().optional(),
          sortOrder: z.enum(['asc', 'desc']).optional(),
        }),
      )
      .query(async ({ input }) => {
        const { items, total, dogCounts } = await adminDataRepo.listUsers(input);

        const dogCountMap = new Map(dogCounts.map((d) => [d.ownerId, d.count]));

        return paginate(
          {
            data: items.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              status: u.isActive ? 'active' : 'suspended',
              dogsCount: dogCountMap.get(u.id) ?? 0,
              followersCount: u.followersCount,
              followingCount: u.followingCount,
              createdAt: u.createdAt,
            })),
            total,
          },
          input,
        );
      }),

    getUser: adminProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
      const result = await adminDataRepo.getUser(input.id);
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const { user, dogs, reportsCount, matchesCount } = result;

      return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        status: user.isActive ? ('active' as const) : ('suspended' as const),
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        dogs,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        reportsReceived: reportsCount,
        matchesCount,
      };
    }),

    suspendUser: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const user = await adminDataRepo.findUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        await adminDataRepo.setUserActive(input.userId, false);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'user.suspend',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
          changes: { before: { isActive: true }, after: { isActive: false } },
        });

        trackEvent('admin_user_suspended', ctx.userId, { targetUserId: input.userId });

        return { success: true };
      }),

    banUser: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const user = await adminDataRepo.findUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        await adminDataRepo.setUserActive(input.userId, false);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'user.ban',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
          changes: { before: { isActive: true }, after: { isActive: false } },
        });

        trackEvent('admin_user_banned', ctx.userId, { targetUserId: input.userId });

        return { success: true };
      }),

    reactivateUser: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const user = await adminDataRepo.findUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        await adminDataRepo.setUserActive(input.userId, true);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'user.reactivate',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
          changes: { before: { isActive: false }, after: { isActive: true } },
        });

        trackEvent('admin_user_reactivated', ctx.userId, { targetUserId: input.userId });

        return { success: true };
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
      .input(z.object({ photoId: z.string().uuid() }))
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
      .input(z.object({ photoId: z.string().uuid() }))
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

    // ── Account deletions monitoring ──────────────────────────────────────────
    listPendingDeletions: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        }),
      )
      .query(async ({ input }) => {
        const result = await adminDataRepo.listPendingDeletions(input);
        return paginate(
          {
            data: result.data.map((u) => ({
              id: u.id,
              displayName: u.displayName,
              email: maskEmail(u.email),
              createdAt: u.createdAt,
              deletionScheduledAt: u.deletionScheduledAt,
              daysRemaining: u.deletionScheduledAt
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(u.deletionScheduledAt).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                    ),
                  )
                : 0,
            })),
            total: result.total,
          },
          input,
        );
      }),

    cancelDeletion: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const user = await adminDataRepo.findUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        await adminDataRepo.cancelDeletion(input.userId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'deletion.cancel',
          resourceType: RESOURCE_TYPE.deletion,
          resourceId: input.userId,
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

    // ── Settings (MVP: in-memory defaults, no DB persistence) ────────────────
    getSettings: adminProcedure.query(async () => {
      return {
        appName: 'PawMeet',
        supportEmail: 'support@pawmeet.io',
        photoConfidenceThreshold: 95,
        maxReportsBeforeSuspension: 5,
        matchWeightSize: DEFAULT_WEIGHTS.size,
        matchWeightEnergy: DEFAULT_WEIGHTS.energy,
        matchWeightBehavior: DEFAULT_WEIGHTS.behavior,
        matchWeightWalk: DEFAULT_WEIGHTS.walk,
        matchWeightDistance: DEFAULT_WEIGHTS.distance,
        matchWeightLeash: DEFAULT_WEIGHTS.leash,
      };
    }),

    updateSettings: adminProcedure.input(updateSettingsSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.SuperAdmin);

      const weights = unwrapResult(validateMatchWeights(input));

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'settings.update',
        resourceType: RESOURCE_TYPE.settings,
        changes: { after: toAuditChanges(input) },
      });

      trackEvent('admin_settings_updated', ctx.userId, {
        changedFields: Object.keys(input),
      });

      return {
        appName: input.appName ?? 'PawMeet',
        supportEmail: input.supportEmail ?? 'support@pawmeet.io',
        photoConfidenceThreshold: input.photoConfidenceThreshold ?? 95,
        maxReportsBeforeSuspension: input.maxReportsBeforeSuspension ?? 5,
        matchWeightSize: weights.size,
        matchWeightEnergy: weights.energy,
        matchWeightBehavior: weights.behavior,
        matchWeightWalk: weights.walk,
        matchWeightDistance: weights.distance,
        matchWeightLeash: weights.leash,
      };
    }),

    // ── Admin user management ─────────────────────────────────────────────────

    listAdminUsers: adminProcedure.input(listAdminUsersSchema).query(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const result = await adminDataRepo.listAdminUsers(input);
      return paginate(result, input);
    }),

    createAdminUser: adminProcedure
      .input(createAdminUserSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.SuperAdmin);

        const result = await createAdminUserUc({
          email: input.email,
          displayName: input.displayName,
          role: input.role,
          temporaryPassword: input.temporaryPassword,
          callerRole: ctx.adminRole,
        });
        const created = unwrapResult(result);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'create_admin',
          resourceType: RESOURCE_TYPE.admin,
          resourceId: created.id,
          changes: {
            after: {
              email: input.email,
              displayName: input.displayName,
              role: input.role,
            },
          },
        });

        return created;
      }),

    updateAdminRole: adminProcedure
      .input(updateAdminRoleSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.SuperAdmin);

        const result = await updateAdminRoleUc({
          adminId: input.adminId,
          newRole: input.newRole,
          callerUserId: ctx.userId,
          callerRole: ctx.adminRole,
        });
        const updated = unwrapResult(result);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'update_admin_role',
          resourceType: RESOURCE_TYPE.admin,
          resourceId: input.adminId,
          changes: {
            before: { role: updated.previousRole },
            after: { role: input.newRole },
          },
        });

        return {
          id: updated.id,
          email: updated.email,
          displayName: updated.displayName,
          role: updated.role,
        };
      }),

    toggleAdminActive: adminProcedure
      .input(toggleAdminActiveSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.SuperAdmin);

        if (input.adminId === ctx.userId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot deactivate yourself',
          });
        }

        const target = await adminDataRepo.findAdminUserById(input.adminId);
        if (!target) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin user not found' });
        }

        if (target.role === AdminRole.SuperAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot deactivate a super admin',
          });
        }

        const newStatus = !target.isActive;

        const updated = await adminDataRepo.toggleAdminActive(input.adminId, newStatus);
        if (!updated) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin user not found' });
        }

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: newStatus ? 'activate_admin' : 'deactivate_admin',
          resourceType: RESOURCE_TYPE.admin,
          resourceId: input.adminId,
          changes: {
            before: { isActive: target.isActive },
            after: { isActive: newStatus },
          },
        });

        return updated;
      }),

    resetAdminPassword: adminProcedure
      .input(resetAdminPasswordSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.SuperAdmin);

        if (input.adminId === ctx.userId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot reset your own password here, use profile settings',
          });
        }

        const target = await adminDataRepo.findAdminUserById(input.adminId);
        if (!target) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin user not found' });
        }

        if (hasMinRole(target.role, ctx.adminRole)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot reset password for a user with equal or higher role',
          });
        }

        const passwordHash = await hash(input.newPassword, 10);
        await adminDataRepo.updateAdminPassword(input.adminId, passwordHash);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'reset_admin_password',
          resourceType: RESOURCE_TYPE.admin,
          resourceId: input.adminId,
        });

        return { success: true };
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
          data: z.record(z.string(), z.string()).optional(),
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
          userIds: z.array(z.string().uuid()).min(1).max(100),
          title: z.string().min(1).max(100),
          body: z.string().min(1).max(500),
          data: z.record(z.string(), z.string()).optional(),
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

    // ── Challenges management ───────────────────────────────────────────────

    listChallenges: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        }),
      )
      .query(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        if (!gamificationRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Gamification repository not configured',
          });
        }

        const offset = (input.page - 1) * input.pageSize;
        const result = await gamificationRepo.listAllChallenges(input.pageSize, offset);

        return paginate(result, input);
      }),

    createChallenge: adminProcedure
      .input(
        z.object({
          type: z.enum([
            CHALLENGE_TYPE.WALK_COUNT,
            CHALLENGE_TYPE.WALK_DISTANCE_KM,
            CHALLENGE_TYPE.NEW_MATCHES,
            CHALLENGE_TYPE.GROUP_EVENTS_JOINED,
          ]),
          title: z.string().min(1).max(200),
          description: z.string().min(1).max(1000),
          targetValue: z.number().int().positive(),
          xpReward: z.number().int().positive(),
          startsAt: z.string().datetime(),
          endsAt: z.string().datetime(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        if (!gamificationRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Gamification repository not configured',
          });
        }

        const startsAt = new Date(input.startsAt);
        const endsAt = new Date(input.endsAt);

        if (startsAt >= endsAt) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Start date must be before end date',
          });
        }

        const challenge = await gamificationRepo.createChallenge({
          type: input.type,
          title: input.title,
          description: input.description,
          targetValue: input.targetValue,
          xpReward: input.xpReward,
          startsAt,
          endsAt,
        });

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'challenge.create',
          resourceType: RESOURCE_TYPE.challenge,
          resourceId: challenge.id,
          changes: {
            after: {
              type: input.type,
              title: input.title,
              targetValue: input.targetValue,
              xpReward: input.xpReward,
            },
          },
        });

        trackEvent('admin_challenge_created', ctx.userId, {
          challengeId: challenge.id,
          type: input.type,
        });

        return challenge;
      }),

    deleteChallenge: adminProcedure
      .input(z.object({ challengeId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        if (!gamificationRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Gamification repository not configured',
          });
        }

        await gamificationRepo.deleteChallenge(input.challengeId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'challenge.delete',
          resourceType: RESOURCE_TYPE.challenge,
          resourceId: input.challengeId,
        });

        return { success: true };
      }),

    // ── Fitness stats (admin) ───────────────────────────────────────────────

    getFitnessStats: adminProcedure.query(async ({ ctx }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);

      if (!gamificationRepo) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Gamification repository not configured',
        });
      }

      return gamificationRepo.getAggregateFitnessStats();
    }),
  });
}
