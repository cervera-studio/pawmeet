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
  passkeyCredentials,
  postMedia,
  posts,
  reports,
  stories,
  users,
  walkSafetyCheckins,
  walks,
} from '@pawmeet/db';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  AdminBreedItem,
  AdminDataRepository,
  AdminDeletionItem,
  AdminDogDetail,
  AdminDogListItem,
  AdminEmergencyContactItem,
  AdminEventParticipant,
  AdminEventSponsorItem,
  AdminEventSponsorRow,
  AdminFeedPostsResult,
  AdminGroupEventDetail,
  AdminGroupEventItem,
  AdminGroupEventParticipantCount,
  AdminOrganizationDetail,
  AdminOrganizationItem,
  AdminOrganizationMember,
  AdminReportItem,
  AdminReportUserInfo,
  AdminSosAlertItem,
  AdminStoryItem,
  AdminUserDetail,
  AdminUserDog,
  AdminUserListItem,
  AdminUserRow,
  AnalyticsDbMetrics,
  AuditLogEntry,
  AuditLogFilters,
  DashboardStats,
  FeedStats,
  NotificationStats,
  PaginatedResult,
  PendingPhotoItem,
} from '../ports/admin-data-repository.js';

export class DrizzleAdminDataRepository implements AdminDataRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  // ── Dashboard ───────────────────────────────────────────────────────────────

  async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
      this.db.select({ value: count() }).from(users),
      this.db.select({ value: count() }).from(dogProfiles),
      this.db.select({ value: count() }).from(matches),
      this.db.select({ value: count() }).from(matches).where(eq(matches.isActive, true)),
      this.db
        .select({ value: count() })
        .from(dogPhotos)
        .where(eq(dogPhotos.moderationStatus, 'pending')),
      this.db.select({ value: count() }).from(reports).where(eq(reports.status, 'pending')),
      this.db
        .select({ value: count() })
        .from(posts)
        .where(and(eq(posts.moderationStatus, 'pending'), eq(posts.isDeleted, false))),
      this.db
        .select({
          date: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
          count: count(),
        })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo))
        .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`),
      this.db
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
  }

  async getAnalyticsDbMetrics(): Promise<AnalyticsDbMetrics> {
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(`${today}T00:00:00.000Z`);

    const [todayMetrics, [totalEventsRow], [eventsLast24hRow]] = await Promise.all([
      this.db
        .select({
          eventName: analyticsEvents.eventName,
          value: count(),
        })
        .from(analyticsEvents)
        .where(
          sql`${analyticsEvents.serverTimestamp} >= ${todayStart} AND ${analyticsEvents.eventName} IN ('auth_registration_completed', 'match_created')`,
        )
        .groupBy(analyticsEvents.eventName),
      this.db.select({ value: count() }).from(analyticsEvents),
      this.db
        .select({ value: count() })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.serverTimestamp, new Date(Date.now() - 24 * 60 * 60 * 1000))),
    ]);

    return {
      todayMetrics: todayMetrics.map((m) => ({ eventName: m.eventName, value: m.value })),
      totalEvents: totalEventsRow?.value ?? 0,
      eventsLast24h: eventsLast24hRow?.value ?? 0,
    };
  }

  // ── Audit log ───────────────────────────────────────────────────────────────

  async listAuditLog(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>> {
    const { page, pageSize, adminId, resourceType, action, from, to, search } = filters;
    const offset = (page - 1) * pageSize;

    const conditions: (SQL | undefined)[] = [];
    if (adminId) conditions.push(eq(adminAuditLog.adminId, adminId));
    if (resourceType) conditions.push(eq(adminAuditLog.resourceType, resourceType));
    if (action) conditions.push(ilike(adminAuditLog.action, `%${action}%`));
    if (from) conditions.push(gte(adminAuditLog.createdAt, new Date(from)));
    if (to) conditions.push(sql`${adminAuditLog.createdAt} <= ${new Date(to)}`);
    if (search) conditions.push(ilike(adminAuditLog.action, `%${search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
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
      this.db.select({ value: count() }).from(adminAuditLog).where(whereClause),
    ]);

    return {
      data: items as AuditLogEntry[],
      total: totalRow?.value ?? 0,
    };
  }

  // ── Dogs ────────────────────────────────────────────────────────────────────

  async listDogs(input: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<PaginatedResult<AdminDogListItem>> {
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
      this.db
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
      this.db
        .select({ value: count() })
        .from(dogProfiles)
        .leftJoin(users, eq(dogProfiles.ownerId, users.id))
        .where(searchCondition),
    ]);

    return {
      data: items as AdminDogListItem[],
      total: totalRow?.value ?? 0,
    };
  }

  async getDog(id: string): Promise<AdminDogDetail | null> {
    const [dog] = await this.db
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
      .where(eq(dogProfiles.id, id));

    if (!dog) return null;

    const photos = await this.db
      .select()
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, id))
      .orderBy(dogPhotos.position);

    return { ...dog, photos } as AdminDogDetail;
  }

  // ── Reports ─────────────────────────────────────────────────────────────────

  async listReports(input: {
    page: number;
    pageSize: number;
    status?: string;
  }): Promise<{ items: AdminReportItem[]; total: number }> {
    const { page, pageSize, status } = input;
    const offset = (page - 1) * pageSize;

    const statusCondition = status ? eq(reports.status, status) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
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
      this.db.select({ value: count() }).from(reports).where(statusCondition),
    ]);

    return {
      items: items as AdminReportItem[],
      total: totalRow?.value ?? 0,
    };
  }

  async getReportUserInfos(userIds: string[]): Promise<AdminReportUserInfo[]> {
    if (userIds.length === 0) return [];
    return this.db
      .select({ id: users.id, displayName: users.displayName, email: users.email })
      .from(users)
      .where(or(...userIds.map((uid) => eq(users.id, uid)))) as Promise<AdminReportUserInfo[]>;
  }

  async findReportById(
    id: string,
  ): Promise<{ id: string; status: string; reportedUserId: string } | null> {
    const [report] = await this.db.select().from(reports).where(eq(reports.id, id));
    if (!report) return null;
    return { id: report.id, status: report.status, reportedUserId: report.reportedUserId };
  }

  async resolveReport(
    id: string,
    status: string,
    resolvedBy: string,
    resolvedAction: string,
  ): Promise<void> {
    await this.db
      .update(reports)
      .set({
        status,
        resolvedBy,
        resolvedAction,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, id));
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.db.update(users).set({ isActive: false }).where(eq(users.id, userId));
  }

  // ── Feed ────────────────────────────────────────────────────────────────────

  async listFeedPosts(input: {
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
  }): Promise<AdminFeedPostsResult> {
    const { page, pageSize, status, search } = input;
    const offset = (page - 1) * pageSize;

    const conditions: (SQL | undefined)[] = [];
    if (status) conditions.push(eq(posts.moderationStatus, status));
    if (search) conditions.push(ilike(users.displayName, `%${search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
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
      this.db
        .select({ value: count() })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(whereClause),
    ]);

    const postIds = items.map((p) => p.id);

    const media =
      postIds.length > 0
        ? await this.db
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

    const reportCounts =
      postIds.length > 0
        ? await this.db
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

    return {
      posts: items.map((p) => ({
        id: p.id,
        caption: p.caption,
        moderationStatus: p.moderationStatus,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        isDeleted: p.isDeleted,
        createdAt: p.createdAt,
        authorId: p.authorId,
        authorName: p.authorName ?? null,
        authorEmail: p.authorEmail ?? null,
      })) satisfies AdminFeedPostsResult['posts'],
      total: totalRow?.value ?? 0,
      media: media.map((m) => ({
        id: m.id,
        postId: m.postId,
        url: m.url,
        mediaType: m.mediaType,
        thumbnailUrl: m.thumbnailUrl,
      })) satisfies AdminFeedPostsResult['media'],
      reportCounts: reportCounts.map((r) => ({ contentId: r.contentId, count: r.count })),
    };
  }

  async findPostById(id: string): Promise<{ id: string; moderationStatus: string } | null> {
    const [post] = await this.db.select().from(posts).where(eq(posts.id, id));
    if (!post) return null;
    return { id: post.id, moderationStatus: post.moderationStatus };
  }

  async updatePostModeration(postId: string, status: string): Promise<void> {
    await this.db
      .update(posts)
      .set({ moderationStatus: status, updatedAt: new Date() })
      .where(eq(posts.id, postId));
  }

  async softDeletePost(postId: string): Promise<void> {
    await this.db.update(posts).set({ isDeleted: true }).where(eq(posts.id, postId));
  }

  // ── Stories ─────────────────────────────────────────────────────────────────

  async listStories(input: {
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<AdminStoryItem>> {
    const { page, pageSize } = input;
    const offset = (page - 1) * pageSize;

    const [items, [totalRow]] = await Promise.all([
      this.db
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
      this.db.select({ value: count() }).from(stories),
    ]);

    return {
      data: items as AdminStoryItem[],
      total: totalRow?.value ?? 0,
    };
  }

  async findStoryById(id: string): Promise<{ id: string } | null> {
    const [story] = await this.db.select().from(stories).where(eq(stories.id, id));
    if (!story) return null;
    return { id: story.id };
  }

  async deleteStory(id: string): Promise<void> {
    await this.db.delete(stories).where(eq(stories.id, id));
  }

  async getFeedStats(): Promise<FeedStats> {
    const [[totalPosts], [pendingPosts], [rejectedPosts], [totalStories], [pendingReports]] =
      await Promise.all([
        this.db.select({ value: count() }).from(posts).where(eq(posts.isDeleted, false)),
        this.db
          .select({ value: count() })
          .from(posts)
          .where(and(eq(posts.moderationStatus, 'pending'), eq(posts.isDeleted, false))),
        this.db
          .select({ value: count() })
          .from(posts)
          .where(eq(posts.moderationStatus, 'rejected')),
        this.db.select({ value: count() }).from(stories),
        this.db
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
  }

  // ── Group events ────────────────────────────────────────────────────────────

  async listGroupEvents(input: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    category?: string;
  }): Promise<{
    items: AdminGroupEventItem[];
    total: number;
    participantCounts: AdminGroupEventParticipantCount[];
  }> {
    const { page, pageSize, search, status, category } = input;
    const offset = (page - 1) * pageSize;

    const conditions: (SQL | undefined)[] = [];
    if (search) conditions.push(ilike(groupEvents.title, `%${search}%`));
    if (status) conditions.push(eq(groupEvents.status, status));
    if (category) conditions.push(eq(groupEvents.category, category));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
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
      this.db.select({ value: count() }).from(groupEvents).where(whereClause),
    ]);

    const eventIds = items.map((e) => e.id);
    const participantCounts =
      eventIds.length > 0
        ? await this.db
            .select({
              eventId: groupEventParticipants.eventId,
              status: groupEventParticipants.status,
              count: count(),
            })
            .from(groupEventParticipants)
            .where(or(...eventIds.map((eid) => eq(groupEventParticipants.eventId, eid))))
            .groupBy(groupEventParticipants.eventId, groupEventParticipants.status)
        : [];

    return {
      items: items as AdminGroupEventItem[],
      total: totalRow?.value ?? 0,
      participantCounts: participantCounts as AdminGroupEventParticipantCount[],
    };
  }

  async getGroupEvent(id: string): Promise<{
    event: AdminGroupEventDetail;
    participants: AdminEventParticipant[];
  } | null> {
    const [event] = await this.db
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
      .where(eq(groupEvents.id, id));

    if (!event) return null;

    const participants = await this.db
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
      .where(eq(groupEventParticipants.eventId, id))
      .orderBy(groupEventParticipants.joinedAt);

    return {
      event: event as AdminGroupEventDetail,
      participants: participants as AdminEventParticipant[],
    };
  }

  async findGroupEventById(id: string): Promise<{ id: string; status: string } | null> {
    const [event] = await this.db.select().from(groupEvents).where(eq(groupEvents.id, id));
    if (!event) return null;
    return { id: event.id, status: event.status };
  }

  async cancelGroupEvent(id: string): Promise<void> {
    await this.db
      .update(groupEvents)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(groupEvents.id, id));
  }

  async findParticipantById(id: string): Promise<{ id: string } | null> {
    const [participant] = await this.db
      .select()
      .from(groupEventParticipants)
      .where(eq(groupEventParticipants.id, id));
    if (!participant) return null;
    return { id: participant.id };
  }

  async removeParticipant(id: string): Promise<void> {
    await this.db
      .update(groupEventParticipants)
      .set({ status: 'removed' })
      .where(eq(groupEventParticipants.id, id));
  }

  async createOfficialEvent(input: {
    createdBy: string;
    title: string;
    description: string | null;
    scheduledAt: Date;
    durationMin: number;
    location: string;
    latitude: number;
    longitude: number;
    maxParticipants: number;
    category: string;
    coverImageUrl: string | null;
    organizationId: string;
  }): Promise<AdminGroupEventDetail> {
    const [event] = await this.db
      .insert(groupEvents)
      .values({
        createdBy: input.createdBy,
        title: input.title,
        description: input.description,
        scheduledAt: input.scheduledAt,
        durationMin: input.durationMin,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        maxParticipants: input.maxParticipants,
        visibility: 'public',
        status: 'scheduled',
        category: input.category,
        requiresApproval: false,
        coverImageUrl: input.coverImageUrl,
        organizationId: input.organizationId,
        isOfficial: true,
      })
      .returning();

    return { ...event, creatorId: input.createdBy, creatorName: null } as AdminGroupEventDetail;
  }

  // ── Organizations ───────────────────────────────────────────────────────────

  async listOrganizations(input: {
    page: number;
    pageSize: number;
    search?: string;
    type?: string;
  }): Promise<{
    items: AdminOrganizationItem[];
    total: number;
    memberCounts: { organizationId: string; count: number }[];
  }> {
    const { page, pageSize, search, type } = input;
    const offset = (page - 1) * pageSize;

    const conditions: (SQL | undefined)[] = [];
    if (search) {
      conditions.push(
        or(ilike(organizations.name, `%${search}%`), ilike(organizations.slug, `%${search}%`)),
      );
    }
    if (type) conditions.push(eq(organizations.type, type));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
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
      this.db.select({ value: count() }).from(organizations).where(whereClause),
    ]);

    const orgIds = items.map((o) => o.id);
    const memberCounts =
      orgIds.length > 0
        ? await this.db
            .select({
              organizationId: organizationMembers.organizationId,
              count: count(),
            })
            .from(organizationMembers)
            .where(or(...orgIds.map((oid) => eq(organizationMembers.organizationId, oid))))
            .groupBy(organizationMembers.organizationId)
        : [];

    return {
      items: items as AdminOrganizationItem[],
      total: totalRow?.value ?? 0,
      memberCounts,
    };
  }

  async getOrganization(id: string): Promise<{
    organization: AdminOrganizationDetail;
    members: AdminOrganizationMember[];
  } | null> {
    const [org] = await this.db.select().from(organizations).where(eq(organizations.id, id));
    if (!org) return null;

    const members = await this.db
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
      .where(eq(organizationMembers.organizationId, id))
      .orderBy(organizationMembers.createdAt);

    return {
      organization: org as AdminOrganizationDetail,
      members: members as AdminOrganizationMember[],
    };
  }

  async findOrganizationById(id: string): Promise<AdminOrganizationDetail | null> {
    const [org] = await this.db.select().from(organizations).where(eq(organizations.id, id));
    return org ? (org as AdminOrganizationDetail) : null;
  }

  async verifyOrganization(id: string, verifiedBy: string): Promise<void> {
    await this.db
      .update(organizations)
      .set({
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id));
  }

  async revokeOrganization(id: string): Promise<void> {
    await this.db
      .update(organizations)
      .set({
        isVerified: false,
        verifiedAt: null,
        verifiedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id));
  }

  // ── Event sponsors ──────────────────────────────────────────────────────────

  async listEventSponsors(eventId: string): Promise<AdminEventSponsorItem[]> {
    const sponsors = await this.db
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
      .where(eq(eventSponsors.eventId, eventId))
      .orderBy(eventSponsors.createdAt);

    return sponsors as AdminEventSponsorItem[];
  }

  async findEventSponsor(eventId: string, organizationId: string): Promise<{ id: string } | null> {
    const [existing] = await this.db
      .select()
      .from(eventSponsors)
      .where(
        and(eq(eventSponsors.eventId, eventId), eq(eventSponsors.organizationId, organizationId)),
      );
    return existing ? { id: existing.id } : null;
  }

  async countEventSponsorsByTier(eventId: string, tier: string): Promise<number> {
    const [countRow] = await this.db
      .select({ value: count() })
      .from(eventSponsors)
      .where(and(eq(eventSponsors.eventId, eventId), eq(eventSponsors.tier, tier)));
    return countRow?.value ?? 0;
  }

  async addEventSponsor(input: {
    eventId: string;
    organizationId: string;
    tier: string;
    logoPlacement: string;
  }): Promise<AdminEventSponsorRow> {
    const [sponsor] = await this.db.insert(eventSponsors).values(input).returning();
    return sponsor as AdminEventSponsorRow;
  }

  async removeEventSponsor(eventId: string, organizationId: string): Promise<void> {
    await this.db
      .delete(eventSponsors)
      .where(
        and(eq(eventSponsors.eventId, eventId), eq(eventSponsors.organizationId, organizationId)),
      );
  }

  // ── Users ───────────────────────────────────────────────────────────────────

  async listUsers(input: {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    items: AdminUserListItem[];
    total: number;
    dogCounts: { ownerId: string; count: number }[];
  }> {
    const { page, pageSize, search, sortBy, sortOrder } = input;
    const offset = (page - 1) * pageSize;

    const searchCondition = search
      ? or(ilike(users.displayName, `%${search}%`), ilike(users.email, `%${search}%`))
      : undefined;

    const sortColumn = (() => {
      if (sortBy === 'name') return users.displayName;
      if (sortBy === 'email') return users.email;
      return users.createdAt;
    })();
    const orderFn = sortOrder === 'asc' ? sql`${sortColumn} asc` : desc(sortColumn);

    const [items, [totalRow]] = await Promise.all([
      this.db
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
      this.db.select({ value: count() }).from(users).where(searchCondition),
    ]);

    const userIds = items.map((u) => u.id);
    const dogCounts =
      userIds.length > 0
        ? await this.db
            .select({
              ownerId: dogProfiles.ownerId,
              count: count(),
            })
            .from(dogProfiles)
            .where(or(...userIds.map((uid) => eq(dogProfiles.ownerId, uid))))
            .groupBy(dogProfiles.ownerId)
        : [];

    return {
      items: items as AdminUserListItem[],
      total: totalRow?.value ?? 0,
      dogCounts,
    };
  }

  async getUser(id: string): Promise<{
    user: AdminUserDetail;
    dogs: AdminUserDog[];
    passkeys: {
      id: string;
      friendlyName: string | null;
      deviceType: string;
      backedUp: boolean;
      createdAt: Date;
      lastUsedAt: Date | null;
    }[];
    reportsCount: number;
    matchesCount: number;
  } | null> {
    const [user] = await this.db
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
      .where(eq(users.id, id));

    if (!user) return null;

    const dogs = await this.db
      .select({
        id: dogProfiles.id,
        name: dogProfiles.name,
        breed: dogProfiles.breed,
        isActive: dogProfiles.isActive,
      })
      .from(dogProfiles)
      .where(eq(dogProfiles.ownerId, id));

    const passkeys = await this.db
      .select({
        id: passkeyCredentials.id,
        friendlyName: passkeyCredentials.friendlyName,
        deviceType: passkeyCredentials.deviceType,
        backedUp: passkeyCredentials.backedUp,
        createdAt: passkeyCredentials.createdAt,
        lastUsedAt: passkeyCredentials.lastUsedAt,
      })
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, id));

    const [reportsRow] = await this.db
      .select({ value: count() })
      .from(reports)
      .where(eq(reports.reportedUserId, id));

    const dogIds = dogs.map((d) => d.id);
    const [matchesRow] =
      dogIds.length > 0
        ? await this.db
            .select({ value: count() })
            .from(matches)
            .where(
              or(...dogIds.flatMap((did) => [eq(matches.dogAId, did), eq(matches.dogBId, did)])),
            )
        : [{ value: 0 }];

    return {
      user: user as AdminUserDetail,
      dogs: dogs as AdminUserDog[],
      passkeys,
      reportsCount: reportsRow?.value ?? 0,
      matchesCount: matchesRow?.value ?? 0,
    };
  }

  async findUserById(id: string): Promise<{ id: string; isActive: boolean } | null> {
    const [user] = await this.db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, id));
    if (!user) return null;
    return user;
  }

  async setUserActive(userId: string, isActive: boolean): Promise<void> {
    await this.db.update(users).set({ isActive }).where(eq(users.id, userId));
  }

  async cancelDeletion(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ isActive: true, deletionScheduledAt: null })
      .where(eq(users.id, userId));
  }

  // ── Account deletions ──────────────────────────────────────────────────────

  async listPendingDeletions(input: {
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<AdminDeletionItem>> {
    const { page, pageSize } = input;
    const offset = (page - 1) * pageSize;

    const condition = and(eq(users.isActive, false), isNotNull(users.deletionScheduledAt));

    const [items, [totalRow]] = await Promise.all([
      this.db
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
      this.db.select({ value: count() }).from(users).where(condition),
    ]);

    return {
      data: items as AdminDeletionItem[],
      total: totalRow?.value ?? 0,
    };
  }

  // ── Safety ─────────────────────────────────────────────────────────────────

  async listSosAlerts(input: {
    page: number;
    pageSize: number;
    type?: string;
  }): Promise<PaginatedResult<AdminSosAlertItem>> {
    const { page, pageSize, type } = input;
    const offset = (page - 1) * pageSize;

    const conditions = type ? eq(walkSafetyCheckins.type, type) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
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
      this.db.select({ value: count() }).from(walkSafetyCheckins).where(conditions),
    ]);

    return {
      data: items as AdminSosAlertItem[],
      total: totalRow?.value ?? 0,
    };
  }

  async listEmergencyContacts(input: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<PaginatedResult<AdminEmergencyContactItem>> {
    const { page, pageSize, search } = input;
    const offset = (page - 1) * pageSize;

    const searchCondition = search
      ? or(ilike(emergencyContacts.name, `%${search}%`), ilike(users.displayName, `%${search}%`))
      : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
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
      this.db
        .select({ value: count() })
        .from(emergencyContacts)
        .leftJoin(users, eq(emergencyContacts.userId, users.id))
        .where(searchCondition),
    ]);

    return {
      data: items as AdminEmergencyContactItem[],
      total: totalRow?.value ?? 0,
    };
  }

  // ── Admin users ────────────────────────────────────────────────────────────

  async listAdminUsers(input: {
    page: number;
    pageSize: number;
    search?: string;
    role?: string;
  }): Promise<PaginatedResult<AdminUserRow>> {
    const { page, pageSize, search, role } = input;
    const offset = (page - 1) * pageSize;

    const conditions: (SQL | undefined)[] = [];
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
      this.db
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
      this.db.select({ value: count() }).from(adminUsers).where(whereClause),
    ]);

    return {
      data: items as AdminUserRow[],
      total: totalRow?.value ?? 0,
    };
  }

  async findAdminUserByEmail(email: string): Promise<{ id: string } | null> {
    const [existing] = await this.db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);
    return existing ?? null;
  }

  async createAdminUser(input: {
    email: string;
    displayName: string;
    role: string;
    passwordHash: string;
  }): Promise<AdminUserRow | null> {
    const [created] = await this.db.insert(adminUsers).values(input).returning({
      id: adminUsers.id,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
    });
    return (created as AdminUserRow) ?? null;
  }

  async findAdminUserById(
    id: string,
  ): Promise<{ id: string; role: string; isActive: boolean; displayName: string } | null> {
    const [target] = await this.db
      .select({
        id: adminUsers.id,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        displayName: adminUsers.displayName,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1);
    return target ?? null;
  }

  async updateAdminRole(
    id: string,
    role: string,
  ): Promise<{ id: string; email: string; displayName: string; role: string } | null> {
    const [updated] = await this.db
      .update(adminUsers)
      .set({ role, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning({
        id: adminUsers.id,
        email: adminUsers.email,
        displayName: adminUsers.displayName,
        role: adminUsers.role,
      });
    return updated ?? null;
  }

  async toggleAdminActive(
    id: string,
    isActive: boolean,
  ): Promise<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    isActive: boolean;
  } | null> {
    const [updated] = await this.db
      .update(adminUsers)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning({
        id: adminUsers.id,
        email: adminUsers.email,
        displayName: adminUsers.displayName,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
      });
    return updated ?? null;
  }

  async updateAdminPassword(id: string, passwordHash: string): Promise<void> {
    await this.db
      .update(adminUsers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(adminUsers.id, id));
  }

  // ── Breeds ─────────────────────────────────────────────────────────────────

  async listBreeds(input: {
    page: number;
    pageSize: number;
    search?: string;
    group?: string;
  }): Promise<PaginatedResult<AdminBreedItem>> {
    const { page, pageSize, search, group } = input;
    const offset = (page - 1) * pageSize;

    const conditions: (SQL | undefined)[] = [];
    if (search) {
      conditions.push(ilike(breeds.code, `%${search}%`));
    }
    if (group) {
      conditions.push(eq(breeds.group, group));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(breeds)
        .where(whereClause)
        .orderBy(asc(breeds.code))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(breeds).where(whereClause),
    ]);

    return {
      data: items as AdminBreedItem[],
      total: totalRow?.value ?? 0,
    };
  }

  async findBreedById(id: number): Promise<AdminBreedItem | null> {
    const [existing] = await this.db.select().from(breeds).where(eq(breeds.id, id));
    return (existing as AdminBreedItem) ?? null;
  }

  async createBreed(input: {
    code: string;
    group?: string;
    sizeCategory: string;
    avgWeightKg?: number;
  }): Promise<AdminBreedItem> {
    const [created] = await this.db.insert(breeds).values(input).returning();
    return created as AdminBreedItem;
  }

  async updateBreed(
    id: number,
    updates: Partial<Omit<AdminBreedItem, 'id'>>,
  ): Promise<AdminBreedItem | null> {
    const [updated] = await this.db
      .update(breeds)
      .set(updates)
      .where(eq(breeds.id, id))
      .returning();
    return updated ? (updated as AdminBreedItem) : null;
  }

  async deleteBreed(id: number): Promise<void> {
    await this.db.delete(breeds).where(eq(breeds.id, id));
  }

  async countDogsReferencingBreed(breedCode: string): Promise<number> {
    const [dogCount] = await this.db
      .select({ value: count() })
      .from(dogProfiles)
      .where(or(eq(dogProfiles.breed, breedCode), eq(dogProfiles.breedSecondary, breedCode)));
    return dogCount?.value ?? 0;
  }

  // ── Photos ─────────────────────────────────────────────────────────────────

  async listPendingPhotos(): Promise<PendingPhotoItem[]> {
    const rows = await this.db
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

    return rows as PendingPhotoItem[];
  }

  async findPhotoById(id: string): Promise<{ id: string; moderationStatus: string } | null> {
    const [photo] = await this.db.select().from(dogPhotos).where(eq(dogPhotos.id, id));
    if (!photo) return null;
    return { id: photo.id, moderationStatus: photo.moderationStatus };
  }

  async updatePhotoModeration(id: string, status: string): Promise<void> {
    await this.db.update(dogPhotos).set({ moderationStatus: status }).where(eq(dogPhotos.id, id));
  }

  async approveAllPendingPhotos(): Promise<void> {
    await this.db
      .update(dogPhotos)
      .set({ moderationStatus: 'approved' })
      .where(eq(dogPhotos.moderationStatus, 'pending'));
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  async getActiveUsersWithPushToken(): Promise<{ id: string }[]> {
    return this.db
      .select({ id: users.id })
      .from(users)
      .where(and(isNotNull(users.pushToken), eq(users.isActive, true)));
  }

  async getTargetedUsers(userIds: string[]): Promise<{ id: string; pushToken: string | null }[]> {
    return this.db
      .select({ id: users.id, pushToken: users.pushToken })
      .from(users)
      .where(and(inArray(users.id, userIds), eq(users.isActive, true)));
  }

  async getNotificationStats(): Promise<NotificationStats> {
    const [totalRow] = await this.db.select({ value: count() }).from(users);
    const [tokenRow] = await this.db
      .select({ value: count() })
      .from(users)
      .where(isNotNull(users.pushToken));

    const [prefStats] = await this.db
      .select({
        matches: count(
          sql`CASE WHEN (${users.notificationPrefs}->>'matches')::boolean = true THEN 1 END`,
        ),
        messages: count(
          sql`CASE WHEN (${users.notificationPrefs}->>'messages')::boolean = true THEN 1 END`,
        ),
        reminders: count(
          sql`CASE WHEN (${users.notificationPrefs}->>'reminders')::boolean = true THEN 1 END`,
        ),
        feed: count(
          sql`CASE WHEN (${users.notificationPrefs}->>'feed')::boolean = true THEN 1 END`,
        ),
      })
      .from(users)
      .where(eq(users.isActive, true));

    return {
      totalUsers: totalRow?.value ?? 0,
      usersWithToken: tokenRow?.value ?? 0,
      prefStats: {
        matches: prefStats?.matches ?? 0,
        messages: prefStats?.messages ?? 0,
        reminders: prefStats?.reminders ?? 0,
        feed: prefStats?.feed ?? 0,
      },
    };
  }
}
