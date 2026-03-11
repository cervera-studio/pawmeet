import {
  dogProfiles,
  groupEventParticipants,
  matches,
  postComments,
  postLikes,
  postMedia,
  posts,
  postTags,
  users,
} from '@dogwalk/db';
import type {
  FeedItem,
  Post,
  PostComment,
  PostLike,
  PostMedia,
  PostTag,
  ResolvedPostTag,
} from '@dogwalk/types';
import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  AddPostMediaInput,
  CommentsPage,
  CreatePostInput,
  FeedPage,
  FeedRepository,
} from '../ports/feed-repository.js';

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [iso, id] = decoded.split('|');
    if (!iso || !id) return null;
    return { createdAt: new Date(iso), id };
  } catch {
    return null;
  }
}

export class DrizzleFeedRepository implements FeedRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async createPost(input: CreatePostInput): Promise<Post> {
    const rows = await this.db.insert(posts).values(input).returning();
    return rows[0] as Post;
  }

  async findPostById(id: string): Promise<Post | null> {
    const [row] = await this.db.select().from(posts).where(eq(posts.id, id));
    return (row as Post | undefined) ?? null;
  }

  async findPostWithAuthor(id: string, currentUserId: string): Promise<FeedItem | null> {
    const row = await this.db
      .select({
        post: posts,
        authorId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.id, id), eq(posts.isDeleted, false)))
      .then((rows) => rows[0]);

    if (!row) return null;

    const media = await this.findMediaByPost(id);
    const liked = await this.hasLiked(id, currentUserId);
    const tags = await this.getResolvedTags(id);

    return {
      ...(row.post as Post),
      media,
      author: {
        id: row.authorId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      },
      tags,
      isLikedByMe: liked,
    };
  }

  async softDeletePost(id: string): Promise<void> {
    await this.db.update(posts).set({ isDeleted: true }).where(eq(posts.id, id));
  }

  async getFeedForUser(userId: string, cursor: string | null, limit: number): Promise<FeedPage> {
    // Find connected user IDs through matches and group events
    const connectedUserIds = await this.getConnectedUserIds(userId);
    const allAuthorIds = [userId, ...connectedUserIds];

    if (allAuthorIds.length === 0) {
      return { items: [], nextCursor: null };
    }

    let query = this.db
      .select({
        post: posts,
        authorId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          inArray(posts.authorId, allAuthorIds),
          eq(posts.isDeleted, false),
          eq(posts.moderationStatus, 'approved'),
        ),
      )
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit + 1);

    if (cursor) {
      const parsed = decodeCursor(cursor);
      if (parsed) {
        query = this.db
          .select({
            post: posts,
            authorId: users.id,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
          })
          .from(posts)
          .innerJoin(users, eq(posts.authorId, users.id))
          .where(
            and(
              inArray(posts.authorId, allAuthorIds),
              eq(posts.isDeleted, false),
              eq(posts.moderationStatus, 'approved'),
              or(
                lt(posts.createdAt, parsed.createdAt),
                and(eq(posts.createdAt, parsed.createdAt), lt(posts.id, parsed.id)),
              ),
            ),
          )
          .orderBy(desc(posts.createdAt), desc(posts.id))
          .limit(limit + 1);
      }
    }

    const rows = await query;

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const postIds = pageRows.map((r) => r.post.id);
    const allMedia =
      postIds.length > 0
        ? await this.db.select().from(postMedia).where(inArray(postMedia.postId, postIds))
        : [];

    const likedPostIds =
      postIds.length > 0
        ? await this.db
            .select({ postId: postLikes.postId })
            .from(postLikes)
            .where(and(inArray(postLikes.postId, postIds), eq(postLikes.userId, userId)))
            .then((rows) => new Set(rows.map((r) => r.postId)))
        : new Set<string>();

    const mediaByPost = new Map<string, PostMedia[]>();
    for (const m of allMedia) {
      const list = mediaByPost.get(m.postId) ?? [];
      list.push(m as PostMedia);
      mediaByPost.set(m.postId, list);
    }

    const tagsByPost = await this.getResolvedTagsForPosts(postIds);

    const items: FeedItem[] = pageRows.map((row) => ({
      ...(row.post as Post),
      media: (mediaByPost.get(row.post.id) ?? []).sort((a, b) => a.position - b.position),
      author: {
        id: row.authorId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      },
      tags: tagsByPost.get(row.post.id) ?? [],
      isLikedByMe: likedPostIds.has(row.post.id),
    }));

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && lastRow ? encodeCursor(lastRow.post.createdAt, lastRow.post.id) : null;

    return { items, nextCursor };
  }

  async getUserPosts(
    targetUserId: string,
    currentUserId: string,
    cursor: string | null,
    limit: number,
  ): Promise<FeedPage> {
    const baseWhere = and(
      eq(posts.authorId, targetUserId),
      eq(posts.isDeleted, false),
      eq(posts.moderationStatus, 'approved'),
    );

    let cursorWhere = baseWhere;
    if (cursor) {
      const parsed = decodeCursor(cursor);
      if (parsed) {
        cursorWhere = and(
          baseWhere,
          or(
            lt(posts.createdAt, parsed.createdAt),
            and(eq(posts.createdAt, parsed.createdAt), lt(posts.id, parsed.id)),
          ),
        );
      }
    }

    const rows = await this.db
      .select({
        post: posts,
        authorId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(cursorWhere)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const postIds = pageRows.map((r) => r.post.id);
    const allMedia =
      postIds.length > 0
        ? await this.db.select().from(postMedia).where(inArray(postMedia.postId, postIds))
        : [];

    const likedPostIds =
      postIds.length > 0
        ? await this.db
            .select({ postId: postLikes.postId })
            .from(postLikes)
            .where(and(inArray(postLikes.postId, postIds), eq(postLikes.userId, currentUserId)))
            .then((rows) => new Set(rows.map((r) => r.postId)))
        : new Set<string>();

    const mediaByPost = new Map<string, PostMedia[]>();
    for (const m of allMedia) {
      const list = mediaByPost.get(m.postId) ?? [];
      list.push(m as PostMedia);
      mediaByPost.set(m.postId, list);
    }

    const tagsByPost = await this.getResolvedTagsForPosts(postIds);

    const items: FeedItem[] = pageRows.map((row) => ({
      ...(row.post as Post),
      media: (mediaByPost.get(row.post.id) ?? []).sort((a, b) => a.position - b.position),
      author: {
        id: row.authorId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      },
      tags: tagsByPost.get(row.post.id) ?? [],
      isLikedByMe: likedPostIds.has(row.post.id),
    }));

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && lastRow ? encodeCursor(lastRow.post.createdAt, lastRow.post.id) : null;

    return { items, nextCursor };
  }

  async addMedia(input: AddPostMediaInput): Promise<PostMedia> {
    const rows = await this.db.insert(postMedia).values(input).returning();
    return rows[0] as PostMedia;
  }

  async findMediaByPost(postId: string): Promise<PostMedia[]> {
    return (await this.db
      .select()
      .from(postMedia)
      .where(eq(postMedia.postId, postId))
      .orderBy(postMedia.position)) as PostMedia[];
  }

  async countMediaByPost(postId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(postMedia)
      .where(eq(postMedia.postId, postId));
    return row?.count ?? 0;
  }

  async updateMediaModerationStatus(
    mediaId: string,
    status: 'approved' | 'rejected',
  ): Promise<void> {
    await this.db
      .update(postMedia)
      .set({ moderationStatus: status })
      .where(eq(postMedia.id, mediaId));
  }

  async addLike(postId: string, userId: string): Promise<PostLike> {
    const rows = await this.db.insert(postLikes).values({ postId, userId }).returning();
    await this.db
      .update(posts)
      .set({ likesCount: sql`${posts.likesCount} + 1` })
      .where(eq(posts.id, postId));
    return rows[0] as PostLike;
  }

  async removeLike(postId: string, userId: string): Promise<void> {
    const deleted = await this.db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .returning();
    if (deleted.length > 0) {
      await this.db
        .update(posts)
        .set({ likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)` })
        .where(eq(posts.id, postId));
    }
  }

  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    return row !== undefined;
  }

  async addComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentId: string | null;
  }): Promise<PostComment> {
    const rows = await this.db.insert(postComments).values(input).returning();
    await this.db
      .update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, input.postId));
    return rows[0] as PostComment;
  }

  async findCommentById(id: string): Promise<PostComment | null> {
    const [row] = await this.db.select().from(postComments).where(eq(postComments.id, id));
    return (row as PostComment | undefined) ?? null;
  }

  async softDeleteComment(id: string): Promise<void> {
    const [comment] = await this.db
      .select({ postId: postComments.postId })
      .from(postComments)
      .where(eq(postComments.id, id));
    await this.db.update(postComments).set({ isDeleted: true }).where(eq(postComments.id, id));
    if (comment) {
      await this.db
        .update(posts)
        .set({ commentsCount: sql`GREATEST(${posts.commentsCount} - 1, 0)` })
        .where(eq(posts.id, comment.postId));
    }
  }

  async getComments(postId: string, cursor: string | null, limit: number): Promise<CommentsPage> {
    const baseWhere = and(eq(postComments.postId, postId), eq(postComments.isDeleted, false));

    let cursorWhere = baseWhere;
    if (cursor) {
      const parsed = decodeCursor(cursor);
      if (parsed) {
        cursorWhere = and(
          baseWhere,
          or(
            lt(postComments.createdAt, parsed.createdAt),
            and(eq(postComments.createdAt, parsed.createdAt), lt(postComments.id, parsed.id)),
          ),
        );
      }
    }

    const rows = await this.db
      .select({
        comment: postComments,
        authorId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(postComments)
      .innerJoin(users, eq(postComments.authorId, users.id))
      .where(cursorWhere)
      .orderBy(desc(postComments.createdAt), desc(postComments.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const comments = pageRows.map((row) => ({
      ...(row.comment as PostComment),
      author: {
        id: row.authorId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      },
    }));

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && lastRow ? encodeCursor(lastRow.comment.createdAt, lastRow.comment.id) : null;

    return { comments, nextCursor };
  }

  async addTags(
    postId: string,
    tags: { taggedUserId?: string | null; taggedDogId?: string | null }[],
  ): Promise<PostTag[]> {
    const values = tags.map((t) => ({
      postId,
      taggedUserId: t.taggedUserId ?? null,
      taggedDogId: t.taggedDogId ?? null,
    }));
    const rows = await this.db.insert(postTags).values(values).returning();
    return rows as PostTag[];
  }

  async removeTags(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    await this.db.delete(postTags).where(inArray(postTags.id, tagIds));
  }

  async getResolvedTags(postId: string): Promise<ResolvedPostTag[]> {
    const rows = await this.db
      .select({
        id: postTags.id,
        taggedUserId: postTags.taggedUserId,
        taggedDogId: postTags.taggedDogId,
        userName: users.displayName,
        userAvatar: users.avatarUrl,
        dogName: dogProfiles.name,
      })
      .from(postTags)
      .leftJoin(users, eq(postTags.taggedUserId, users.id))
      .leftJoin(dogProfiles, eq(postTags.taggedDogId, dogProfiles.id))
      .where(eq(postTags.postId, postId));

    return rows.map((r) => ({
      id: r.id,
      taggedUser: r.taggedUserId
        ? { id: r.taggedUserId, displayName: r.userName ?? '', avatarUrl: r.userAvatar }
        : null,
      taggedDog: r.taggedDogId ? { id: r.taggedDogId, name: r.dogName ?? '' } : null,
    }));
  }

  async findTagById(id: string): Promise<PostTag | null> {
    const [row] = await this.db.select().from(postTags).where(eq(postTags.id, id));
    return (row as PostTag | undefined) ?? null;
  }

  private async getResolvedTagsForPosts(
    postIds: string[],
  ): Promise<Map<string, ResolvedPostTag[]>> {
    if (postIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        id: postTags.id,
        postId: postTags.postId,
        taggedUserId: postTags.taggedUserId,
        taggedDogId: postTags.taggedDogId,
        userName: users.displayName,
        userAvatar: users.avatarUrl,
        dogName: dogProfiles.name,
      })
      .from(postTags)
      .leftJoin(users, eq(postTags.taggedUserId, users.id))
      .leftJoin(dogProfiles, eq(postTags.taggedDogId, dogProfiles.id))
      .where(inArray(postTags.postId, postIds));

    const tagsByPost = new Map<string, ResolvedPostTag[]>();
    for (const r of rows) {
      const list = tagsByPost.get(r.postId) ?? [];
      list.push({
        id: r.id,
        taggedUser: r.taggedUserId
          ? { id: r.taggedUserId, displayName: r.userName ?? '', avatarUrl: r.userAvatar }
          : null,
        taggedDog: r.taggedDogId ? { id: r.taggedDogId, name: r.dogName ?? '' } : null,
      });
      tagsByPost.set(r.postId, list);
    }
    return tagsByPost;
  }

  async getConnectedUserIds(userId: string): Promise<string[]> {
    // Get user's dog IDs
    const userDogs = await this.db
      .select({ id: dogProfiles.id })
      .from(dogProfiles)
      .where(and(eq(dogProfiles.ownerId, userId), eq(dogProfiles.isActive, true)));

    const dogIds = userDogs.map((d) => d.id);
    if (dogIds.length === 0) return [];

    // Get match partners: owners of dogs matched with user's dogs
    const matchPartners = await this.db
      .select({ dogAId: matches.dogAId, dogBId: matches.dogBId })
      .from(matches)
      .where(
        and(
          eq(matches.isActive, true),
          or(inArray(matches.dogAId, dogIds), inArray(matches.dogBId, dogIds)),
        ),
      );

    const partnerDogIds = new Set<string>();
    for (const m of matchPartners) {
      if (dogIds.includes(m.dogAId)) partnerDogIds.add(m.dogBId);
      if (dogIds.includes(m.dogBId)) partnerDogIds.add(m.dogAId);
    }

    const partnerDogArray = [...partnerDogIds];
    const ownerIds = new Set<string>();

    if (partnerDogArray.length > 0) {
      const owners = await this.db
        .select({ ownerId: dogProfiles.ownerId })
        .from(dogProfiles)
        .where(inArray(dogProfiles.id, partnerDogArray));
      for (const o of owners) ownerIds.add(o.ownerId);
    }

    // Get group event co-participants
    const userEvents = await this.db
      .select({ eventId: groupEventParticipants.eventId })
      .from(groupEventParticipants)
      .where(eq(groupEventParticipants.userId, userId));

    const eventIds = userEvents.map((e) => e.eventId);
    if (eventIds.length > 0) {
      const coParticipants = await this.db
        .select({ userId: groupEventParticipants.userId })
        .from(groupEventParticipants)
        .where(inArray(groupEventParticipants.eventId, eventIds));
      for (const p of coParticipants) {
        if (p.userId !== userId) ownerIds.add(p.userId);
      }
    }

    return [...ownerIds];
  }
}
