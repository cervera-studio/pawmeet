import { dogPhotos, dogProfiles, matches, reports, users } from '@dogwalk/db';
import { TRPCError } from '@trpc/server';
import { count, desc, eq, gte, ilike, or, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';

// ── Admin middleware ────────────────────────────────────────────────────────────
// Checks that the authenticated user has admin privileges.
// Uses the same JWT-based auth as protectedProcedure, then verifies admin status
// via a simple allowlist or DB flag. For MVP, we check an ADMIN_EMAILS env var
// and fall back to a DB column if it exists.

function createAdminProcedure(db: NeonHttpDatabase) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    // Check ADMIN_EMAILS env var first (comma-separated list)
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(',').map((email: string) => email.trim()) ?? [];

    const [user] = await db.select().from(users).where(eq(users.id, ctx.userId));
    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
    }

    if (!adminEmails.includes(user.email)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }

    return next({ ctx: { ...ctx, userId: ctx.userId, adminEmail: user.email } });
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

const updateSettingsSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  supportEmail: z.string().email().optional(),
  photoConfidenceThreshold: z.number().int().min(0).max(100).optional(),
  maxReportsBeforeSuspension: z.number().int().min(1).optional(),
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
        userRegistrations: registrations,
        dailyMatches,
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
          reporterEmail: userMap.get(r.reporterId)?.email ?? '',
          reportedName: userMap.get(r.reportedUserId)?.displayName ?? 'Utente sconosciuto',
          reportedEmail: userMap.get(r.reportedUserId)?.email ?? '',
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    resolveReport: adminProcedure.input(resolveReportSchema).mutation(async ({ ctx, input }) => {
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

      return { success: true };
    }),

    // ── Settings (MVP: in-memory defaults, no DB persistence) ────────────────
    getSettings: adminProcedure.query(async () => {
      // MVP: return defaults. Real persistence via key-value table or Redis later.
      return {
        appName: 'DogWalk',
        supportEmail: 'support@dogwalk.app',
        photoConfidenceThreshold: 95,
        maxReportsBeforeSuspension: 5,
      };
    }),

    updateSettings: adminProcedure.input(updateSettingsSchema).mutation(async ({ input }) => {
      // MVP: accept the input and return it. No persistence yet.
      // In production, store in a settings table or Redis.
      return {
        appName: input.appName ?? 'DogWalk',
        supportEmail: input.supportEmail ?? 'support@dogwalk.app',
        photoConfidenceThreshold: input.photoConfidenceThreshold ?? 95,
        maxReportsBeforeSuspension: input.maxReportsBeforeSuspension ?? 5,
      };
    }),
  });
}
