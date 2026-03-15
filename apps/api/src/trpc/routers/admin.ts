import { DEFAULT_WEIGHTS } from '@pawmeet/config';
import {
  adminAuditLog,
  adminUsers,
  analyticsEvents,
  breeds,
  contentReports,
  dogPhotos,
  dogProfiles,
  emergencyContacts,
  eventSponsors,
  groupEventParticipants,
  groupEvents,
  matches,
  organizationMembers,
  organizations,
  postMedia,
  posts,
  reports,
  stories,
  users,
  walkSafetyCheckins,
  walks,
} from '@pawmeet/db';
import { TRPCError } from '@trpc/server';
import { hash } from 'bcryptjs';
import { and, asc, count, desc, eq, gte, ilike, isNotNull, or, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../lib/admin-audit.js';
import {
  AdminRole,
  type AdminRoleValue,
  hasMinRole,
  requireRole,
} from '../../lib/admin-permissions.js';
import { getDauCount, getDauTimeSeries } from '../../middleware/analytics-counters.js';
import { protectedProcedure, router } from '../trpc.js';

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
// Checks that the authenticated user has admin privileges.
// Uses the same JWT-based auth as protectedProcedure, then verifies admin status
// via a simple allowlist or DB flag. For MVP, we check an ADMIN_EMAILS env var
// and fall back to a DB column if it exists.

function createAdminProcedure(_db: NeonHttpDatabase) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.adminRole) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }

    return next({ ctx: { ...ctx, userId: ctx.userId, adminRole: ctx.adminRole } });
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
  name: z.string().min(1).max(100),
  nameIt: z.string().min(1).max(100),
  group: z.string().max(50).optional(),
  sizeCategory: sizeCategoryEnum,
  avgWeightKg: z.number().int().positive().optional(),
});

const updateBreedSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  nameIt: z.string().min(1).max(100).optional(),
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

// ── Router ─────────────────────────────────────────────────────────────────────

export function createAdminRouter(db: NeonHttpDatabase) {
  const adminProcedure = createAdminProcedure(db);

  return router({
    // ── Dashboard stats ──────────────────────────────────────────────────────
    getStats: adminProcedure.query(async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Run all counts in parallel
      const [
        [usersCount],
        [dogsCount],
        [matchesCount],
        [activeMatchesCount],
        [pendingPhotosCount],
        [reportsCount],
        [pendingPostsCount],
        registrations,
        dailyMatches,
      ] = await Promise.all([
        db.select({ value: count() }).from(users),
        db.select({ value: count() }).from(dogProfiles),
        db.select({ value: count() }).from(matches),
        db.select({ value: count() }).from(matches).where(eq(matches.isActive, true)),
        db
          .select({ value: count() })
          .from(dogPhotos)
          .where(eq(dogPhotos.moderationStatus, 'pending')),
        db.select({ value: count() }).from(reports).where(eq(reports.status, 'pending')),
        db
          .select({ value: count() })
          .from(posts)
          .where(and(eq(posts.moderationStatus, 'pending'), eq(posts.isDeleted, false))),
        // User registrations per day (last 30 days)
        db
          .select({
            date: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
            count: count(),
          })
          .from(users)
          .where(gte(users.createdAt, thirtyDaysAgo))
          .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`)
          .orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`),
        // Daily matches (last 30 days)
        db
          .select({
            date: sql<string>`to_char(${matches.createdAt}, 'YYYY-MM-DD')`,
            count: count(),
          })
          .from(matches)
          .where(gte(matches.createdAt, thirtyDaysAgo))
          .groupBy(sql`to_char(${matches.createdAt}, 'YYYY-MM-DD')`)
          .orderBy(sql`to_char(${matches.createdAt}, 'YYYY-MM-DD')`),
      ]);

      return {
        totalUsers: usersCount?.value ?? 0,
        totalDogs: dogsCount?.value ?? 0,
        totalMatches: matchesCount?.value ?? 0,
        activeMatches: activeMatchesCount?.value ?? 0,
        pendingPhotos: pendingPhotosCount?.value ?? 0,
        pendingReports: reportsCount?.value ?? 0,
        pendingFeedPosts: pendingPostsCount?.value ?? 0,
        userRegistrations: registrations,
        dailyMatches,
      };
    }),

    // ── Analytics KPIs ──────────────────────────────────────────────────────
    // Reads from: Redis HyperLogLog (DAU only) + Postgres (everything else).
    // Postgres is the single source of truth for event counts.
    getAnalyticsKpis: adminProcedure.query(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const todayStart = new Date(`${today}T00:00:00.000Z`);

      const [dauToday, dauTimeSeries, todayMetrics, [totalEventsRow], [eventsLast24hRow]] =
        await Promise.all([
          // Redis HLL — real-time DAU
          getDauCount(today),
          getDauTimeSeries(30),
          // Postgres — today's registrations & matches from analytics_events directly
          // (pre-aggregated table only has yesterday's data until 02:00 cron runs)
          db
            .select({
              eventName: analyticsEvents.eventName,
              value: count(),
            })
            .from(analyticsEvents)
            .where(
              sql`${analyticsEvents.serverTimestamp} >= ${todayStart} AND ${analyticsEvents.eventName} IN ('auth_registration_completed', 'match_created')`,
            )
            .groupBy(analyticsEvents.eventName),
          // Postgres — total event count
          db.select({ value: count() }).from(analyticsEvents),
          // Postgres — events in last 24h
          db
            .select({ value: count() })
            .from(analyticsEvents)
            .where(
              gte(analyticsEvents.serverTimestamp, new Date(Date.now() - 24 * 60 * 60 * 1000)),
            ),
        ]);

      const todayMap = new Map(todayMetrics.map((m) => [m.eventName, m.value]));

      return {
        dauToday,
        registrationsToday: todayMap.get('auth_registration_completed') ?? 0,
        matchesToday: todayMap.get('match_created') ?? 0,
        totalEvents: totalEventsRow?.value ?? 0,
        eventsLast24h: eventsLast24hRow?.value ?? 0,
        dauTimeSeries,
      };
    }),

    // ── Audit log ──────────────────────────────────────────────────────────
    listAuditLog: adminProcedure.input(listAuditLogSchema).query(async ({ input }) => {
      const { page, pageSize, adminId, resourceType, action, from, to, search } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (adminId) conditions.push(eq(adminAuditLog.adminId, adminId));
      if (resourceType) conditions.push(eq(adminAuditLog.resourceType, resourceType));
      if (action) conditions.push(ilike(adminAuditLog.action, `%${action}%`));
      if (from) conditions.push(gte(adminAuditLog.createdAt, new Date(from)));
      if (to) conditions.push(sql`${adminAuditLog.createdAt} <= ${new Date(to)}`);
      if (search) conditions.push(ilike(adminAuditLog.action, `%${search}%`));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [totalRow]] = await Promise.all([
        db
          .select({
            id: adminAuditLog.id,
            adminId: adminAuditLog.adminId,
            adminName: adminUsers.displayName,
            adminEmail: adminUsers.email,
            action: adminAuditLog.action,
            resourceType: adminAuditLog.resourceType,
            resourceId: adminAuditLog.resourceId,
            changes: adminAuditLog.changes,
            reason: adminAuditLog.reason,
            ipAddress: adminAuditLog.ipAddress,
            createdAt: adminAuditLog.createdAt,
          })
          .from(adminAuditLog)
          .leftJoin(adminUsers, eq(adminAuditLog.adminId, adminUsers.id))
          .where(whereClause)
          .orderBy(desc(adminAuditLog.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ value: count() }).from(adminAuditLog).where(whereClause),
      ]);

      const total = totalRow?.value ?? 0;

      return {
        data: items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    // ── Dogs management ──────────────────────────────────────────────────────
    listDogs: adminProcedure.input(listDogsSchema).query(async ({ input }) => {
      const { page, pageSize, search } = input;
      const offset = (page - 1) * pageSize;

      const searchCondition = search
        ? or(
            ilike(dogProfiles.name, `%${search}%`),
            ilike(dogProfiles.breed, `%${search}%`),
            ilike(users.displayName, `%${search}%`),
          )
        : undefined;

      const [items, [totalRow]] = await Promise.all([
        db
          .select({
            id: dogProfiles.id,
            name: dogProfiles.name,
            breed: dogProfiles.breed,
            size: dogProfiles.size,
            isActive: dogProfiles.isActive,
            createdAt: dogProfiles.createdAt,
            ownerName: users.displayName,
            ownerId: users.id,
          })
          .from(dogProfiles)
          .leftJoin(users, eq(dogProfiles.ownerId, users.id))
          .where(searchCondition)
          .orderBy(desc(dogProfiles.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ value: count() })
          .from(dogProfiles)
          .leftJoin(users, eq(dogProfiles.ownerId, users.id))
          .where(searchCondition),
      ]);

      const total = totalRow?.value ?? 0;

      return {
        data: items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    getDog: adminProcedure.input(getDogSchema).query(async ({ input }) => {
      const [dog] = await db
        .select({
          id: dogProfiles.id,
          name: dogProfiles.name,
          breed: dogProfiles.breed,
          breedSecondary: dogProfiles.breedSecondary,
          size: dogProfiles.size,
          weightKg: dogProfiles.weightKg,
          gender: dogProfiles.gender,
          isNeutered: dogProfiles.isNeutered,
          energyLevel: dogProfiles.energyLevel,
          behaviorWithDogs: dogProfiles.behaviorWithDogs,
          behaviorWithPeople: dogProfiles.behaviorWithPeople,
          leashBehavior: dogProfiles.leashBehavior,
          bio: dogProfiles.bio,
          isActive: dogProfiles.isActive,
          createdAt: dogProfiles.createdAt,
          ownerName: users.displayName,
          ownerId: users.id,
        })
        .from(dogProfiles)
        .leftJoin(users, eq(dogProfiles.ownerId, users.id))
        .where(eq(dogProfiles.id, input.id));

      if (!dog) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Dog not found' });
      }

      // Get photos
      const photos = await db
        .select()
        .from(dogPhotos)
        .where(eq(dogPhotos.dogId, input.id))
        .orderBy(dogPhotos.position);

      return { ...dog, photos };
    }),

    // ── Reports management ───────────────────────────────────────────────────
    listReports: adminProcedure.input(listReportsSchema).query(async ({ input }) => {
      const { page, pageSize, status } = input;
      const offset = (page - 1) * pageSize;

      const statusCondition = status ? eq(reports.status, status) : undefined;

      const [items, [totalRow]] = await Promise.all([
        db
          .select({
            id: reports.id,
            reason: reports.reason,
            description: reports.description,
            status: reports.status,
            resolvedAction: reports.resolvedAction,
            resolvedAt: reports.resolvedAt,
            createdAt: reports.createdAt,
            reporterId: reports.reporterId,
            reportedUserId: reports.reportedUserId,
          })
          .from(reports)
          .where(statusCondition)
          .orderBy(desc(reports.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ value: count() }).from(reports).where(statusCondition),
      ]);

      // Collect unique user IDs to fetch names
      const userIds = [...new Set(items.flatMap((r) => [r.reporterId, r.reportedUserId]))];
      const userRows =
        userIds.length > 0
          ? await db
              .select({ id: users.id, displayName: users.displayName, email: users.email })
              .from(users)
              .where(or(...userIds.map((uid) => eq(users.id, uid))))
          : [];

      const userMap = new Map(userRows.map((u) => [u.id, u]));

      const total = totalRow?.value ?? 0;

      return {
        data: items.map((r) => ({
          ...r,
          reporterName: userMap.get(r.reporterId)?.displayName ?? 'Utente sconosciuto',
          reporterEmail: maskEmail(userMap.get(r.reporterId)?.email),
          reportedName: userMap.get(r.reportedUserId)?.displayName ?? 'Utente sconosciuto',
          reportedEmail: maskEmail(userMap.get(r.reportedUserId)?.email),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    resolveReport: adminProcedure.input(resolveReportSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);
      const [report] = await db.select().from(reports).where(eq(reports.id, input.id));
      if (!report) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
      }

      if (report.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Report already resolved' });
      }

      const newStatus = input.action === 'dismiss' ? 'dismissed' : 'resolved';

      await db
        .update(reports)
        .set({
          status: newStatus,
          resolvedBy: ctx.userId,
          resolvedAction: input.action,
          resolvedAt: new Date(),
        })
        .where(eq(reports.id, input.id));

      // Apply action to reported user if needed
      if (input.action === 'suspend' || input.action === 'ban') {
        await db.update(users).set({ isActive: false }).where(eq(users.id, report.reportedUserId));
      }

      void logAdminAction(db, {
        adminId: ctx.userId,
        action: `report.${input.action}`,
        resourceType: RESOURCE_TYPE.report,
        resourceId: input.id,
        changes: { before: { status: 'pending' }, after: { status: newStatus } },
      });

      return { success: true };
    }),

    // ── Feed management ──────────────────────────────────────────────────────
    listFeedPosts: adminProcedure.input(listFeedPostsSchema).query(async ({ input }) => {
      const { page, pageSize, status, search } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (status) conditions.push(eq(posts.moderationStatus, status));
      if (search) conditions.push(ilike(users.displayName, `%${search}%`));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [totalRow]] = await Promise.all([
        db
          .select({
            id: posts.id,
            caption: posts.caption,
            moderationStatus: posts.moderationStatus,
            likesCount: posts.likesCount,
            commentsCount: posts.commentsCount,
            isDeleted: posts.isDeleted,
            createdAt: posts.createdAt,
            authorId: posts.authorId,
            authorName: users.displayName,
            authorEmail: users.email,
          })
          .from(posts)
          .leftJoin(users, eq(posts.authorId, users.id))
          .where(whereClause)
          .orderBy(desc(posts.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ value: count() })
          .from(posts)
          .leftJoin(users, eq(posts.authorId, users.id))
          .where(whereClause),
      ]);

      // Fetch media for each post
      const postIds = items.map((p) => p.id);
      const media =
        postIds.length > 0
          ? await db
              .select({
                id: postMedia.id,
                postId: postMedia.postId,
                url: postMedia.url,
                mediaType: postMedia.mediaType,
                thumbnailUrl: postMedia.thumbnailUrl,
              })
              .from(postMedia)
              .where(or(...postIds.map((pid) => eq(postMedia.postId, pid))))
          : [];

      const mediaByPost = new Map<string, typeof media>();
      for (const m of media) {
        const list = mediaByPost.get(m.postId) ?? [];
        list.push(m);
        mediaByPost.set(m.postId, list);
      }

      // Fetch report counts per post
      const reportCounts =
        postIds.length > 0
          ? await db
              .select({
                contentId: contentReports.contentId,
                count: count(),
              })
              .from(contentReports)
              .where(
                and(
                  eq(contentReports.contentType, 'post'),
                  or(...postIds.map((pid) => eq(contentReports.contentId, pid))),
                ),
              )
              .groupBy(contentReports.contentId)
          : [];

      const reportCountMap = new Map(reportCounts.map((r) => [r.contentId, r.count]));

      const total = totalRow?.value ?? 0;

      return {
        data: items.map((p) => ({
          ...p,
          authorEmail: maskEmail(p.authorEmail),
          media: mediaByPost.get(p.id) ?? [],
          reportCount: reportCountMap.get(p.id) ?? 0,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    updatePostModeration: adminProcedure
      .input(updatePostModerationSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);
        const [post] = await db.select().from(posts).where(eq(posts.id, input.postId));
        if (!post) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
        }

        await db
          .update(posts)
          .set({ moderationStatus: input.status, updatedAt: new Date() })
          .where(eq(posts.id, input.postId));

        // If rejected, soft-delete the post
        if (input.status === 'rejected') {
          await db.update(posts).set({ isDeleted: true }).where(eq(posts.id, input.postId));
        }

        void logAdminAction(db, {
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
        const { page, pageSize } = input;
        const offset = (page - 1) * pageSize;

        const [items, [totalRow]] = await Promise.all([
          db
            .select({
              id: stories.id,
              mediaUrl: stories.mediaUrl,
              mediaType: stories.mediaType,
              viewCount: stories.viewCount,
              createdAt: stories.createdAt,
              expiresAt: stories.expiresAt,
              authorId: stories.authorId,
              authorName: users.displayName,
            })
            .from(stories)
            .leftJoin(users, eq(stories.authorId, users.id))
            .orderBy(desc(stories.createdAt))
            .limit(pageSize)
            .offset(offset),
          db.select({ value: count() }).from(stories),
        ]);

        const total = totalRow?.value ?? 0;
        return {
          data: items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      }),

    deleteStory: adminProcedure
      .input(z.object({ storyId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);
        const [story] = await db.select().from(stories).where(eq(stories.id, input.storyId));
        if (!story) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' });
        }
        await db.delete(stories).where(eq(stories.id, input.storyId));

        void logAdminAction(db, {
          adminId: ctx.userId,
          action: 'story.delete',
          resourceType: RESOURCE_TYPE.story,
          resourceId: input.storyId,
        });

        return { success: true };
      }),

    getFeedStats: adminProcedure.query(async () => {
      const [[totalPosts], [pendingPosts], [rejectedPosts], [totalStories], [pendingReports]] =
        await Promise.all([
          db.select({ value: count() }).from(posts).where(eq(posts.isDeleted, false)),
          db
            .select({ value: count() })
            .from(posts)
            .where(and(eq(posts.moderationStatus, 'pending'), eq(posts.isDeleted, false))),
          db.select({ value: count() }).from(posts).where(eq(posts.moderationStatus, 'rejected')),
          db.select({ value: count() }).from(stories),
          db
            .select({ value: count() })
            .from(contentReports)
            .where(eq(contentReports.status, 'pending')),
        ]);

      return {
        totalPosts: totalPosts?.value ?? 0,
        pendingPosts: pendingPosts?.value ?? 0,
        rejectedPosts: rejectedPosts?.value ?? 0,
        totalStories: totalStories?.value ?? 0,
        pendingReports: pendingReports?.value ?? 0,
      };
    }),

    // ── Group events management ───────────────────────────────────────────────
    listGroupEvents: adminProcedure.input(listGroupEventsSchema).query(async ({ input }) => {
      const { page, pageSize, search, status, category } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) conditions.push(ilike(groupEvents.title, `%${search}%`));
      if (status) conditions.push(eq(groupEvents.status, status));
      if (category) conditions.push(eq(groupEvents.category, category));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [totalRow]] = await Promise.all([
        db
          .select({
            id: groupEvents.id,
            title: groupEvents.title,
            category: groupEvents.category,
            visibility: groupEvents.visibility,
            status: groupEvents.status,
            scheduledAt: groupEvents.scheduledAt,
            location: groupEvents.location,
            maxParticipants: groupEvents.maxParticipants,
            requiresApproval: groupEvents.requiresApproval,
            createdAt: groupEvents.createdAt,
            creatorId: groupEvents.createdBy,
            creatorName: users.displayName,
            recurrenceRule: groupEvents.recurrenceRule,
            parentEventId: groupEvents.parentEventId,
          })
          .from(groupEvents)
          .leftJoin(users, eq(groupEvents.createdBy, users.id))
          .where(whereClause)
          .orderBy(desc(groupEvents.scheduledAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ value: count() }).from(groupEvents).where(whereClause),
      ]);

      // Get participant + pending counts per event
      const eventIds = items.map((e) => e.id);
      const participantCounts =
        eventIds.length > 0
          ? await db
              .select({
                eventId: groupEventParticipants.eventId,
                status: groupEventParticipants.status,
                count: count(),
              })
              .from(groupEventParticipants)
              .where(or(...eventIds.map((eid) => eq(groupEventParticipants.eventId, eid))))
              .groupBy(groupEventParticipants.eventId, groupEventParticipants.status)
          : [];

      const countMap = new Map<string, { participants: number; pending: number }>();
      for (const row of participantCounts) {
        const entry = countMap.get(row.eventId) ?? { participants: 0, pending: 0 };
        if (row.status === 'accepted') entry.participants = row.count;
        if (row.status === 'pending') entry.pending = row.count;
        countMap.set(row.eventId, entry);
      }

      const total = totalRow?.value ?? 0;

      return {
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
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    getGroupEvent: adminProcedure.input(getGroupEventSchema).query(async ({ input }) => {
      const [event] = await db
        .select({
          id: groupEvents.id,
          title: groupEvents.title,
          description: groupEvents.description,
          category: groupEvents.category,
          visibility: groupEvents.visibility,
          status: groupEvents.status,
          scheduledAt: groupEvents.scheduledAt,
          durationMin: groupEvents.durationMin,
          location: groupEvents.location,
          latitude: groupEvents.latitude,
          longitude: groupEvents.longitude,
          maxParticipants: groupEvents.maxParticipants,
          requiresApproval: groupEvents.requiresApproval,
          recurrenceRule: groupEvents.recurrenceRule,
          recurrenceEnd: groupEvents.recurrenceEnd,
          parentEventId: groupEvents.parentEventId,
          coverImageUrl: groupEvents.coverImageUrl,
          createdAt: groupEvents.createdAt,
          updatedAt: groupEvents.updatedAt,
          creatorId: groupEvents.createdBy,
          creatorName: users.displayName,
        })
        .from(groupEvents)
        .leftJoin(users, eq(groupEvents.createdBy, users.id))
        .where(eq(groupEvents.id, input.id));

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      // Get participants with user + dog info
      const participants = await db
        .select({
          id: groupEventParticipants.id,
          userId: groupEventParticipants.userId,
          userName: users.displayName,
          dogId: groupEventParticipants.dogId,
          dogName: dogProfiles.name,
          status: groupEventParticipants.status,
          isOrganizer: groupEventParticipants.isOrganizer,
          joinedAt: groupEventParticipants.joinedAt,
        })
        .from(groupEventParticipants)
        .leftJoin(users, eq(groupEventParticipants.userId, users.id))
        .leftJoin(dogProfiles, eq(groupEventParticipants.dogId, dogProfiles.id))
        .where(eq(groupEventParticipants.eventId, input.id))
        .orderBy(groupEventParticipants.joinedAt);

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
        const [event] = await db
          .select()
          .from(groupEvents)
          .where(eq(groupEvents.id, input.eventId));

        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
        }

        if (event.status === 'cancelled' || event.status === 'completed') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Event already cancelled or completed',
          });
        }

        await db
          .update(groupEvents)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(groupEvents.id, input.eventId));

        void logAdminAction(db, {
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
        const [participant] = await db
          .select()
          .from(groupEventParticipants)
          .where(eq(groupEventParticipants.id, input.participantId));

        if (!participant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Participant not found' });
        }

        await db
          .update(groupEventParticipants)
          .set({ status: 'removed' })
          .where(eq(groupEventParticipants.id, input.participantId));

        void logAdminAction(db, {
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
        const { page, pageSize, search, type } = input;
        const offset = (page - 1) * pageSize;

        const conditions = [];
        if (search) {
          conditions.push(
            or(ilike(organizations.name, `%${search}%`), ilike(organizations.slug, `%${search}%`)),
          );
        }
        if (type) conditions.push(eq(organizations.type, type));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [items, [totalRow]] = await Promise.all([
          db
            .select({
              id: organizations.id,
              name: organizations.name,
              slug: organizations.slug,
              type: organizations.type,
              description: organizations.description,
              logoUrl: organizations.logoUrl,
              websiteUrl: organizations.websiteUrl,
              contactEmail: organizations.contactEmail,
              isVerified: organizations.isVerified,
              verifiedAt: organizations.verifiedAt,
              isActive: organizations.isActive,
              createdAt: organizations.createdAt,
            })
            .from(organizations)
            .where(whereClause)
            .orderBy(desc(organizations.createdAt))
            .limit(pageSize)
            .offset(offset),
          db.select({ value: count() }).from(organizations).where(whereClause),
        ]);

        // Get member counts per org
        const orgIds = items.map((o) => o.id);
        const memberCounts =
          orgIds.length > 0
            ? await db
                .select({
                  organizationId: organizationMembers.organizationId,
                  count: count(),
                })
                .from(organizationMembers)
                .where(or(...orgIds.map((oid) => eq(organizationMembers.organizationId, oid))))
                .groupBy(organizationMembers.organizationId)
            : [];

        const memberCountMap = new Map(memberCounts.map((m) => [m.organizationId, m.count]));
        const total = totalRow?.value ?? 0;

        return {
          data: items.map((o) => ({
            ...o,
            memberCount: memberCountMap.get(o.id) ?? 0,
          })),
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      }),

    getOrganization: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, input.id));

        if (!org) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }

        const members = await db
          .select({
            id: organizationMembers.id,
            userId: organizationMembers.userId,
            userName: users.displayName,
            userEmail: users.email,
            role: organizationMembers.role,
            createdAt: organizationMembers.createdAt,
          })
          .from(organizationMembers)
          .leftJoin(users, eq(organizationMembers.userId, users.id))
          .where(eq(organizationMembers.organizationId, input.id))
          .orderBy(organizationMembers.createdAt);

        return { ...org, members };
      }),

    verifyOrganization: adminProcedure
      .input(z.object({ organizationId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, input.organizationId));

        if (!org) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }

        await db
          .update(organizations)
          .set({
            isVerified: true,
            verifiedAt: new Date(),
            verifiedBy: ctx.userId,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, input.organizationId));

        void logAdminAction(db, {
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
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, input.organizationId));

        if (!org) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }

        await db
          .update(organizations)
          .set({
            isVerified: false,
            verifiedAt: null,
            verifiedBy: null,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, input.organizationId));

        void logAdminAction(db, {
          adminId: ctx.userId,
          action: 'organization.revoke',
          resourceType: RESOURCE_TYPE.organization,
          resourceId: input.organizationId,
        });

        return { success: true };
      }),

    // ── Event sponsors management ────────────────────────────────────────────
    listEventSponsors: adminProcedure.input(listEventSponsorsSchema).query(async ({ input }) => {
      const sponsors = await db
        .select({
          id: eventSponsors.id,
          eventId: eventSponsors.eventId,
          organizationId: eventSponsors.organizationId,
          tier: eventSponsors.tier,
          logoPlacement: eventSponsors.logoPlacement,
          createdAt: eventSponsors.createdAt,
          organizationName: organizations.name,
          organizationLogoUrl: organizations.logoUrl,
        })
        .from(eventSponsors)
        .innerJoin(organizations, eq(eventSponsors.organizationId, organizations.id))
        .where(eq(eventSponsors.eventId, input.eventId))
        .orderBy(eventSponsors.createdAt);

      return { data: sponsors };
    }),

    addEventSponsor: adminProcedure.input(addSponsorSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);
      // Check event exists
      const [event] = await db.select().from(groupEvents).where(eq(groupEvents.id, input.eventId));
      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      // Check org exists and is verified
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.organizationId));
      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }
      if (!org.isVerified || !org.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization must be verified and active',
        });
      }

      // Check tier limit
      const tierLimits: Record<string, number> = { title: 1, gold: 2, silver: 5 };
      const limit = tierLimits[input.tier];
      if (limit !== undefined) {
        const [countRow] = await db
          .select({ value: count() })
          .from(eventSponsors)
          .where(and(eq(eventSponsors.eventId, input.eventId), eq(eventSponsors.tier, input.tier)));
        if ((countRow?.value ?? 0) >= limit) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Tier limit reached (max ${limit} for ${input.tier})`,
          });
        }
      }

      const [sponsor] = await db.insert(eventSponsors).values(input).returning();

      void logAdminAction(db, {
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
        const [existing] = await db
          .select()
          .from(eventSponsors)
          .where(
            and(
              eq(eventSponsors.eventId, input.eventId),
              eq(eventSponsors.organizationId, input.organizationId),
            ),
          );

        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Sponsor not found for this event' });
        }

        await db
          .delete(eventSponsors)
          .where(
            and(
              eq(eventSponsors.eventId, input.eventId),
              eq(eventSponsors.organizationId, input.organizationId),
            ),
          );

        void logAdminAction(db, {
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
        const { page, pageSize, search, sortBy, sortOrder } = input;
        const offset = (page - 1) * pageSize;

        const searchCondition = search
          ? or(ilike(users.displayName, `%${search}%`), ilike(users.email, `%${search}%`))
          : undefined;

        // Determine sort column
        const sortColumn =
          sortBy === 'name'
            ? users.displayName
            : sortBy === 'email'
              ? users.email
              : users.createdAt;
        const orderFn = sortOrder === 'asc' ? sql`${sortColumn} asc` : desc(sortColumn);

        const [items, [totalRow]] = await Promise.all([
          db
            .select({
              id: users.id,
              name: users.displayName,
              email: users.email,
              isActive: users.isActive,
              followersCount: users.followersCount,
              followingCount: users.followingCount,
              createdAt: users.createdAt,
            })
            .from(users)
            .where(searchCondition)
            .orderBy(orderFn)
            .limit(pageSize)
            .offset(offset),
          db.select({ value: count() }).from(users).where(searchCondition),
        ]);

        // Get dog counts per user
        const userIds = items.map((u) => u.id);
        const dogCounts =
          userIds.length > 0
            ? await db
                .select({
                  ownerId: dogProfiles.ownerId,
                  count: count(),
                })
                .from(dogProfiles)
                .where(or(...userIds.map((uid) => eq(dogProfiles.ownerId, uid))))
                .groupBy(dogProfiles.ownerId)
            : [];

        const dogCountMap = new Map(dogCounts.map((d) => [d.ownerId, d.count]));
        const total = totalRow?.value ?? 0;

        return {
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
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      }),

    getUser: adminProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
      const [user] = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl,
          isActive: users.isActive,
          authProvider: users.authProvider,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
          followersCount: users.followersCount,
          followingCount: users.followingCount,
        })
        .from(users)
        .where(eq(users.id, input.id));

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const dogs = await db
        .select({
          id: dogProfiles.id,
          name: dogProfiles.name,
          breed: dogProfiles.breed,
          isActive: dogProfiles.isActive,
        })
        .from(dogProfiles)
        .where(eq(dogProfiles.ownerId, input.id));

      const [reportsRow] = await db
        .select({ value: count() })
        .from(reports)
        .where(eq(reports.reportedUserId, input.id));

      // Count matches through the user's dogs
      const dogIds = dogs.map((d) => d.id);
      const [matchesRow] =
        dogIds.length > 0
          ? await db
              .select({ value: count() })
              .from(matches)
              .where(
                or(...dogIds.flatMap((did) => [eq(matches.dogAId, did), eq(matches.dogBId, did)])),
              )
          : [{ value: 0 }];

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
        reportsReceived: reportsRow?.value ?? 0,
        matchesCount: matchesRow?.value ?? 0,
      };
    }),

    suspendUser: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);
        const [user] = await db.select().from(users).where(eq(users.id, input.userId));
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }
        await db.update(users).set({ isActive: false }).where(eq(users.id, input.userId));

        void logAdminAction(db, {
          adminId: ctx.userId,
          action: 'user.suspend',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
          changes: { before: { isActive: true }, after: { isActive: false } },
        });

        return { success: true };
      }),

    banUser: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);
        const [user] = await db.select().from(users).where(eq(users.id, input.userId));
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }
        await db.update(users).set({ isActive: false }).where(eq(users.id, input.userId));

        void logAdminAction(db, {
          adminId: ctx.userId,
          action: 'user.ban',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
          changes: { before: { isActive: true }, after: { isActive: false } },
        });

        return { success: true };
      }),

    reactivateUser: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);
        const [user] = await db.select().from(users).where(eq(users.id, input.userId));
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }
        await db.update(users).set({ isActive: true }).where(eq(users.id, input.userId));

        void logAdminAction(db, {
          adminId: ctx.userId,
          action: 'user.reactivate',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
          changes: { before: { isActive: false }, after: { isActive: true } },
        });

        return { success: true };
      }),

    // ── Photo moderation ─────────────────────────────────────────────────────
    listPendingPhotos: adminProcedure.query(async () => {
      const rows = await db
        .select({
          id: dogPhotos.id,
          dogId: dogPhotos.dogId,
          imageUrl: dogPhotos.url,
          uploadedAt: dogPhotos.uploadedAt,
          dogName: dogProfiles.name,
          userId: dogProfiles.ownerId,
          userName: users.displayName,
        })
        .from(dogPhotos)
        .innerJoin(dogProfiles, eq(dogPhotos.dogId, dogProfiles.id))
        .innerJoin(users, eq(dogProfiles.ownerId, users.id))
        .where(eq(dogPhotos.moderationStatus, 'pending'))
        .orderBy(dogPhotos.uploadedAt);

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
        const [photo] = await db.select().from(dogPhotos).where(eq(dogPhotos.id, input.photoId));
        if (!photo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
        }
        await db
          .update(dogPhotos)
          .set({ moderationStatus: 'approved' })
          .where(eq(dogPhotos.id, input.photoId));

        void logAdminAction(db, {
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
        const [photo] = await db.select().from(dogPhotos).where(eq(dogPhotos.id, input.photoId));
        if (!photo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
        }
        await db
          .update(dogPhotos)
          .set({ moderationStatus: 'rejected' })
          .where(eq(dogPhotos.id, input.photoId));

        void logAdminAction(db, {
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
      await db
        .update(dogPhotos)
        .set({ moderationStatus: 'approved' })
        .where(eq(dogPhotos.moderationStatus, 'pending'));

      void logAdminAction(db, {
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
        const { page, pageSize } = input;
        const offset = (page - 1) * pageSize;

        const condition = and(eq(users.isActive, false), isNotNull(users.deletionScheduledAt));

        const [items, [totalRow]] = await Promise.all([
          db
            .select({
              id: users.id,
              displayName: users.displayName,
              email: users.email,
              createdAt: users.createdAt,
              deletionScheduledAt: users.deletionScheduledAt,
            })
            .from(users)
            .where(condition)
            .orderBy(users.deletionScheduledAt)
            .limit(pageSize)
            .offset(offset),
          db.select({ value: count() }).from(users).where(condition),
        ]);

        const total = totalRow?.value ?? 0;

        return {
          data: items.map((u) => ({
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
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      }),

    cancelDeletion: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);
        const [user] = await db
          .select({ id: users.id, isActive: users.isActive })
          .from(users)
          .where(eq(users.id, input.userId));

        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        await db
          .update(users)
          .set({ isActive: true, deletionScheduledAt: null })
          .where(eq(users.id, input.userId));

        void logAdminAction(db, {
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
        const { page, pageSize, type } = input;
        const offset = (page - 1) * pageSize;

        const conditions = type ? eq(walkSafetyCheckins.type, type) : undefined;

        const [items, [totalRow]] = await Promise.all([
          db
            .select({
              id: walkSafetyCheckins.id,
              walkId: walkSafetyCheckins.walkId,
              userId: walkSafetyCheckins.userId,
              userName: users.displayName,
              type: walkSafetyCheckins.type,
              latitude: walkSafetyCheckins.latitude,
              longitude: walkSafetyCheckins.longitude,
              createdAt: walkSafetyCheckins.createdAt,
              walkTitle: walks.title,
              walkStatus: walks.status,
              walkScheduledAt: walks.scheduledAt,
            })
            .from(walkSafetyCheckins)
            .leftJoin(users, eq(walkSafetyCheckins.userId, users.id))
            .leftJoin(walks, eq(walkSafetyCheckins.walkId, walks.id))
            .where(conditions)
            .orderBy(desc(walkSafetyCheckins.createdAt))
            .limit(pageSize)
            .offset(offset),
          db.select({ value: count() }).from(walkSafetyCheckins).where(conditions),
        ]);

        const total = totalRow?.value ?? 0;
        return {
          data: items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
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
        const { page, pageSize, search } = input;
        const offset = (page - 1) * pageSize;

        const searchCondition = search
          ? or(
              ilike(emergencyContacts.name, `%${search}%`),
              ilike(users.displayName, `%${search}%`),
            )
          : undefined;

        const [items, [totalRow]] = await Promise.all([
          db
            .select({
              id: emergencyContacts.id,
              userId: emergencyContacts.userId,
              userName: users.displayName,
              contactName: emergencyContacts.name,
              phone: emergencyContacts.phone,
              relationship: emergencyContacts.relationship,
              createdAt: emergencyContacts.createdAt,
            })
            .from(emergencyContacts)
            .leftJoin(users, eq(emergencyContacts.userId, users.id))
            .where(searchCondition)
            .orderBy(desc(emergencyContacts.createdAt))
            .limit(pageSize)
            .offset(offset),
          db
            .select({ value: count() })
            .from(emergencyContacts)
            .leftJoin(users, eq(emergencyContacts.userId, users.id))
            .where(searchCondition),
        ]);

        const total = totalRow?.value ?? 0;
        return {
          data: items.map((item) => ({
            ...item,
            phone: maskPhone(item.phone),
          })),
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      }),

    // ── Settings (MVP: in-memory defaults, no DB persistence) ────────────────
    getSettings: adminProcedure.query(async () => {
      // MVP: return defaults. Real persistence via key-value table or Redis later.
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
      // MVP: accept the input and return it. No persistence yet.
      // In production, store in a settings table or Redis.

      // Validate matching weights sum to 1.0 if any are provided
      const weightSize = input.matchWeightSize ?? DEFAULT_WEIGHTS.size;
      const weightEnergy = input.matchWeightEnergy ?? DEFAULT_WEIGHTS.energy;
      const weightBehavior = input.matchWeightBehavior ?? DEFAULT_WEIGHTS.behavior;
      const weightWalk = input.matchWeightWalk ?? DEFAULT_WEIGHTS.walk;
      const weightDistance = input.matchWeightDistance ?? DEFAULT_WEIGHTS.distance;
      const weightLeash = input.matchWeightLeash ?? DEFAULT_WEIGHTS.leash;

      const weightsSum =
        weightSize + weightEnergy + weightBehavior + weightWalk + weightDistance + weightLeash;
      if (Math.abs(weightsSum - 1.0) > 0.01) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Matching weights must sum to 1.0 (current sum: ${weightsSum.toFixed(4)})`,
        });
      }

      void logAdminAction(db, {
        adminId: ctx.userId,
        action: 'settings.update',
        resourceType: RESOURCE_TYPE.settings,
        changes: { after: input as unknown as Record<string, unknown> },
      });

      return {
        appName: input.appName ?? 'PawMeet',
        supportEmail: input.supportEmail ?? 'support@pawmeet.io',
        photoConfidenceThreshold: input.photoConfidenceThreshold ?? 95,
        maxReportsBeforeSuspension: input.maxReportsBeforeSuspension ?? 5,
        matchWeightSize: weightSize,
        matchWeightEnergy: weightEnergy,
        matchWeightBehavior: weightBehavior,
        matchWeightWalk: weightWalk,
        matchWeightDistance: weightDistance,
        matchWeightLeash: weightLeash,
      };
    }),

    // ── Admin user management ─────────────────────────────────────────────────

    listAdminUsers: adminProcedure.input(listAdminUsersSchema).query(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const { page, pageSize, search, role } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) {
        conditions.push(
          or(ilike(adminUsers.email, `%${search}%`), ilike(adminUsers.displayName, `%${search}%`)),
        );
      }
      if (role) {
        conditions.push(eq(adminUsers.role, role));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [totalRow]] = await Promise.all([
        db
          .select({
            id: adminUsers.id,
            email: adminUsers.email,
            displayName: adminUsers.displayName,
            role: adminUsers.role,
            isActive: adminUsers.isActive,
            lastLoginAt: adminUsers.lastLoginAt,
            createdAt: adminUsers.createdAt,
          })
          .from(adminUsers)
          .where(whereClause)
          .orderBy(desc(adminUsers.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ value: count() }).from(adminUsers).where(whereClause),
      ]);

      const total = totalRow?.value ?? 0;

      return {
        data: items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    createAdminUser: adminProcedure
      .input(createAdminUserSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.SuperAdmin);

        // Cannot set role higher than own role
        if (!hasMinRole(ctx.adminRole, input.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot create a user with a role higher than your own',
          });
        }

        // Check if email already exists
        const [existing] = await db
          .select({ id: adminUsers.id })
          .from(adminUsers)
          .where(eq(adminUsers.email, input.email))
          .limit(1);

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An admin user with this email already exists',
          });
        }

        const passwordHash = await hash(input.temporaryPassword, 10);

        const [created] = await db
          .insert(adminUsers)
          .values({
            email: input.email,
            displayName: input.displayName,
            role: input.role,
            passwordHash,
          })
          .returning({
            id: adminUsers.id,
            email: adminUsers.email,
            displayName: adminUsers.displayName,
            role: adminUsers.role,
            isActive: adminUsers.isActive,
            createdAt: adminUsers.createdAt,
          });

        if (!created) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create admin' });
        }

        void logAdminAction(db, {
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

        if (input.adminId === ctx.userId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot change your own role',
          });
        }

        // Cannot set role higher than caller's role
        if (!hasMinRole(ctx.adminRole, input.newRole)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot set a role higher than your own',
          });
        }

        const [target] = await db
          .select({
            id: adminUsers.id,
            role: adminUsers.role,
            displayName: adminUsers.displayName,
          })
          .from(adminUsers)
          .where(eq(adminUsers.id, input.adminId))
          .limit(1);

        if (!target) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin user not found' });
        }

        // Cannot modify a user with equal or higher role
        if (hasMinRole(target.role, ctx.adminRole as AdminRoleValue)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot modify a user with equal or higher role',
          });
        }

        const [updated] = await db
          .update(adminUsers)
          .set({ role: input.newRole, updatedAt: new Date() })
          .where(eq(adminUsers.id, input.adminId))
          .returning({
            id: adminUsers.id,
            email: adminUsers.email,
            displayName: adminUsers.displayName,
            role: adminUsers.role,
          });

        if (!updated) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin user not found' });
        }

        void logAdminAction(db, {
          adminId: ctx.userId,
          action: 'update_admin_role',
          resourceType: RESOURCE_TYPE.admin,
          resourceId: input.adminId,
          changes: {
            before: { role: target.role },
            after: { role: input.newRole },
          },
        });

        return updated;
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

        const [target] = await db
          .select({
            id: adminUsers.id,
            role: adminUsers.role,
            isActive: adminUsers.isActive,
            displayName: adminUsers.displayName,
          })
          .from(adminUsers)
          .where(eq(adminUsers.id, input.adminId))
          .limit(1);

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

        const [updated] = await db
          .update(adminUsers)
          .set({ isActive: newStatus, updatedAt: new Date() })
          .where(eq(adminUsers.id, input.adminId))
          .returning({
            id: adminUsers.id,
            email: adminUsers.email,
            displayName: adminUsers.displayName,
            role: adminUsers.role,
            isActive: adminUsers.isActive,
          });

        if (!updated) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin user not found' });
        }

        void logAdminAction(db, {
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

        const [target] = await db
          .select({
            id: adminUsers.id,
            role: adminUsers.role,
            displayName: adminUsers.displayName,
          })
          .from(adminUsers)
          .where(eq(adminUsers.id, input.adminId))
          .limit(1);

        if (!target) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin user not found' });
        }

        // Cannot reset password for a user with equal or higher role
        if (hasMinRole(target.role, ctx.adminRole as AdminRoleValue)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot reset password for a user with equal or higher role',
          });
        }

        const passwordHash = await hash(input.newPassword, 10);

        await db
          .update(adminUsers)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(adminUsers.id, input.adminId));

        void logAdminAction(db, {
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

      const { page, pageSize, search, group } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) {
        conditions.push(or(ilike(breeds.name, `%${search}%`), ilike(breeds.nameIt, `%${search}%`)));
      }
      if (group) {
        conditions.push(eq(breeds.group, group));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [totalRow]] = await Promise.all([
        db
          .select()
          .from(breeds)
          .where(whereClause)
          .orderBy(asc(breeds.name))
          .limit(pageSize)
          .offset(offset),
        db.select({ value: count() }).from(breeds).where(whereClause),
      ]);

      const total = totalRow?.value ?? 0;

      return {
        data: items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    createBreed: adminProcedure.input(createBreedSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const [created] = await db
        .insert(breeds)
        .values({
          name: input.name,
          nameIt: input.nameIt,
          group: input.group,
          sizeCategory: input.sizeCategory,
          avgWeightKg: input.avgWeightKg,
        })
        .returning();

      void logAdminAction(db, {
        adminId: ctx.userId,
        action: 'create_breed',
        resourceType: RESOURCE_TYPE.breed,
        resourceId: String(created?.id),
        changes: { after: input as unknown as Record<string, unknown> },
      });

      return created;
    }),

    updateBreed: adminProcedure.input(updateBreedSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const { id, ...updates } = input;

      const [existing] = await db.select().from(breeds).where(eq(breeds.id, id));
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Breed not found' });
      }

      const setValues: Record<string, unknown> = {};
      if (updates.name !== undefined) setValues.name = updates.name;
      if (updates.nameIt !== undefined) setValues.nameIt = updates.nameIt;
      if (updates.group !== undefined) setValues.group = updates.group;
      if (updates.sizeCategory !== undefined) setValues.sizeCategory = updates.sizeCategory;
      if (updates.avgWeightKg !== undefined) setValues.avgWeightKg = updates.avgWeightKg;

      if (Object.keys(setValues).length === 0) {
        return existing;
      }

      const [updated] = await db.update(breeds).set(setValues).where(eq(breeds.id, id)).returning();

      void logAdminAction(db, {
        adminId: ctx.userId,
        action: 'update_breed',
        resourceType: RESOURCE_TYPE.breed,
        resourceId: String(id),
        changes: {
          before: existing as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        },
      });

      return updated;
    }),

    deleteBreed: adminProcedure.input(deleteBreedSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const [existing] = await db.select().from(breeds).where(eq(breeds.id, input.id));
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Breed not found' });
      }

      // Check if any dogs reference this breed
      const [dogCount] = await db
        .select({ value: count() })
        .from(dogProfiles)
        .where(
          or(eq(dogProfiles.breed, existing.name), eq(dogProfiles.breedSecondary, existing.name)),
        );

      if ((dogCount?.value ?? 0) > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot delete breed "${existing.name}": ${dogCount?.value} dog(s) still reference it`,
        });
      }

      await db.delete(breeds).where(eq(breeds.id, input.id));

      void logAdminAction(db, {
        adminId: ctx.userId,
        action: 'delete_breed',
        resourceType: RESOURCE_TYPE.breed,
        resourceId: String(input.id),
        changes: { before: existing as unknown as Record<string, unknown> },
      });

      return { success: true };
    }),
  });
}
