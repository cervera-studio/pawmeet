import {
  contentReports,
  dogPhotos,
  dogProfiles,
  postMedia,
  posts,
  reports,
  stories,
  users,
} from '@pawmeet/db';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminFeedPostsResult,
  AdminModerationRepository,
  AdminReportItem,
  AdminReportUserInfo,
  AdminStoryItem,
  FeedStats,
  PaginatedResult,
  PendingPhotoItem,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminModerationRepository implements AdminModerationRepository {
  constructor(private readonly db: NodePgDatabase) {}

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
}
