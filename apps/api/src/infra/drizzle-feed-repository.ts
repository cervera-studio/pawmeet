import {
  contentReactions,
  dogProfiles,
  hashtags,
  postComments,
  postHashtags,
  postLikes,
  postMedia,
  posts,
  postTags,
  users,
} from '@pawmeet/db';
import type {
  ContentReaction,
  ContentType,
  FeedItem,
  Hashtag,
  Post,
  PostComment,
  PostLike,
  PostMedia,
  PostTag,
  ResolvedPostTag,
} from '@pawmeet/types';
import { and, count, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
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
    if (!(iso && id)) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return { createdAt: date, id };
  } catch {
    return null;
  }
}

export class DrizzleFeedRepository implements FeedRepository {
  constructor(private readonly db: NodePgDatabase) {}

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

    const [media, liked, tags] = await Promise.all([
      this.findMediaByPost(id),
      this.hasLiked(id, currentUserId),
      this.getResolvedTags(id),
    ]);

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
    const [allMedia, likedPostIds, tagsByPost] = await Promise.all([
      postIds.length > 0
        ? this.db.select().from(postMedia).where(inArray(postMedia.postId, postIds))
        : Promise.resolve([]),
      postIds.length > 0
        ? this.db
            .select({ postId: postLikes.postId })
            .from(postLikes)
            .where(and(inArray(postLikes.postId, postIds), eq(postLikes.userId, userId)))
            .then((rows) => new Set(rows.map((r) => r.postId)))
        : Promise.resolve(new Set<string>()),
      this.getResolvedTagsForPosts(postIds),
    ]);

    const mediaByPost = new Map<string, PostMedia[]>();
    for (const m of allMedia) {
      const list = mediaByPost.get(m.postId) ?? [];
      list.push(m as PostMedia);
      mediaByPost.set(m.postId, list);
    }

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

    const lastRow = pageRows.at(-1);
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
    const [allMedia, likedPostIds, tagsByPost] = await Promise.all([
      postIds.length > 0
        ? this.db.select().from(postMedia).where(inArray(postMedia.postId, postIds))
        : Promise.resolve([]),
      postIds.length > 0
        ? this.db
            .select({ postId: postLikes.postId })
            .from(postLikes)
            .where(and(inArray(postLikes.postId, postIds), eq(postLikes.userId, currentUserId)))
            .then((rows) => new Set(rows.map((r) => r.postId)))
        : Promise.resolve(new Set<string>()),
      this.getResolvedTagsForPosts(postIds),
    ]);

    const mediaByPost = new Map<string, PostMedia[]>();
    for (const m of allMedia) {
      const list = mediaByPost.get(m.postId) ?? [];
      list.push(m as PostMedia);
      mediaByPost.set(m.postId, list);
    }

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

    const lastRow = pageRows.at(-1);
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
      .select({ count: count() })
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
    return await this.db.transaction(async (tx) => {
      const rows = await tx.insert(postLikes).values({ postId, userId }).returning();
      await tx
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} + 1` })
        .where(eq(posts.id, postId));
      return rows[0] as PostLike;
    });
  }

  async removeLike(postId: string, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
        .returning();
      if (deleted.length > 0) {
        await tx
          .update(posts)
          .set({ likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)` })
          .where(eq(posts.id, postId));
      }
    });
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
    return await this.db.transaction(async (tx) => {
      const rows = await tx.insert(postComments).values(input).returning();
      await tx
        .update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} + 1` })
        .where(eq(posts.id, input.postId));
      return rows[0] as PostComment;
    });
  }

  async findCommentById(id: string): Promise<PostComment | null> {
    const [row] = await this.db.select().from(postComments).where(eq(postComments.id, id));
    return (row as PostComment | undefined) ?? null;
  }

  async softDeleteComment(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [comment] = await tx
        .select({ postId: postComments.postId })
        .from(postComments)
        .where(eq(postComments.id, id));
      await tx.update(postComments).set({ isDeleted: true }).where(eq(postComments.id, id));
      if (comment) {
        await tx
          .update(posts)
          .set({ commentsCount: sql`GREATEST(${posts.commentsCount} - 1, 0)` })
          .where(eq(posts.id, comment.postId));
      }
    });
  }

  async getComments(postId: string, cursor: string | null, limit: number): Promise<CommentsPage> {
    // Paginate only parent (top-level) comments, then fetch all their replies.
    // This prevents orphan replies appearing without their parent on a page.
    const parentWhere = and(
      eq(postComments.postId, postId),
      eq(postComments.isDeleted, false),
      sql`${postComments.parentId} IS NULL`,
    );

    let cursorWhere = parentWhere;
    if (cursor) {
      const parsed = decodeCursor(cursor);
      if (parsed) {
        cursorWhere = and(
          parentWhere,
          or(
            lt(postComments.createdAt, parsed.createdAt),
            and(eq(postComments.createdAt, parsed.createdAt), lt(postComments.id, parsed.id)),
          ),
        );
      }
    }

    // Fetch parent comments for this page
    const parentRows = await this.db
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

    const hasMore = parentRows.length > limit;
    const pageParents = hasMore ? parentRows.slice(0, limit) : parentRows;
    const parentIds = pageParents.map((r) => r.comment.id);

    // Fetch all replies for these parents
    let replyRows: typeof parentRows = [];
    if (parentIds.length > 0) {
      replyRows = await this.db
        .select({
          comment: postComments,
          authorId: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(postComments)
        .innerJoin(users, eq(postComments.authorId, users.id))
        .where(and(inArray(postComments.parentId, parentIds), eq(postComments.isDeleted, false)))
        .orderBy(postComments.createdAt, postComments.id);
    }

    // Interleave: parent → its replies → next parent → its replies
    const repliesByParent = new Map<string, typeof parentRows>();
    for (const row of replyRows) {
      const pid = row.comment.parentId as string;
      const list = repliesByParent.get(pid) ?? [];
      list.push(row);
      repliesByParent.set(pid, list);
    }

    const allRows: typeof parentRows = [];
    for (const parent of pageParents) {
      allRows.push(parent);
      const replies = repliesByParent.get(parent.comment.id);
      if (replies) allRows.push(...replies);
    }

    const comments = allRows.map((row) => ({
      ...(row.comment as PostComment),
      author: {
        id: row.authorId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      },
    }));

    const lastParent = pageParents.at(-1);
    const nextCursor =
      hasMore && lastParent
        ? encodeCursor(lastParent.comment.createdAt, lastParent.comment.id)
        : null;

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

  async addReaction(
    contentType: ContentType,
    contentId: string,
    userId: string,
    emoji: string,
  ): Promise<ContentReaction> {
    const rows = await this.db
      .insert(contentReactions)
      .values({ contentType, contentId, userId, emoji })
      .returning();
    return rows[0] as ContentReaction;
  }

  async removeReaction(
    contentType: ContentType,
    contentId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    await this.db
      .delete(contentReactions)
      .where(
        and(
          eq(contentReactions.contentType, contentType),
          eq(contentReactions.contentId, contentId),
          eq(contentReactions.userId, userId),
          eq(contentReactions.emoji, emoji),
        ),
      );
  }

  async searchPostsByHashtag(
    hashtag: string,
    cursor: string | null,
    limit: number,
  ): Promise<FeedPage> {
    const normalized = hashtag.toLowerCase();

    const [hashtagRow] = await this.db
      .select()
      .from(hashtags)
      .where(eq(hashtags.name, normalized))
      .limit(1);

    if (!hashtagRow) {
      return { items: [], nextCursor: null };
    }

    const baseWhere = and(
      eq(postHashtags.hashtagId, hashtagRow.id),
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
      .from(postHashtags)
      .innerJoin(posts, eq(postHashtags.postId, posts.id))
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(cursorWhere)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const postIds = pageRows.map((r) => r.post.id);
    const [allMedia, tagsByPost] = await Promise.all([
      postIds.length > 0
        ? this.db.select().from(postMedia).where(inArray(postMedia.postId, postIds))
        : Promise.resolve([]),
      this.getResolvedTagsForPosts(postIds),
    ]);

    const mediaByPost = new Map<string, PostMedia[]>();
    for (const m of allMedia) {
      const list = mediaByPost.get(m.postId) ?? [];
      list.push(m as PostMedia);
      mediaByPost.set(m.postId, list);
    }

    const items: FeedItem[] = pageRows.map((row) => ({
      ...(row.post as Post),
      media: (mediaByPost.get(row.post.id) ?? []).sort((a, b) => a.position - b.position),
      author: {
        id: row.authorId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      },
      tags: tagsByPost.get(row.post.id) ?? [],
      isLikedByMe: false,
    }));

    const lastRow = pageRows.at(-1);
    const nextCursor =
      hasMore && lastRow ? encodeCursor(lastRow.post.createdAt, lastRow.post.id) : null;

    return { items, nextCursor };
  }

  async getTrendingHashtags(limit: number): Promise<Hashtag[]> {
    const rows = await this.db
      .select()
      .from(hashtags)
      .orderBy(desc(hashtags.usageCount))
      .limit(limit);
    return rows as Hashtag[];
  }

  async getConnectedUserIds(userId: string): Promise<string[]> {
    // Single CTE query: get all connected user IDs from matches + group events
    const result = await this.db.execute(sql`
      WITH user_dogs AS (
        SELECT id FROM dog_profiles
        WHERE owner_id = ${userId} AND is_active = true
      ),
      match_partner_owners AS (
        SELECT DISTINCT dp.owner_id AS connected_user_id
        FROM matches m
        JOIN user_dogs ud ON (m.dog_a_id = ud.id OR m.dog_b_id = ud.id)
        JOIN dog_profiles dp ON dp.id = CASE
          WHEN m.dog_a_id = ud.id THEN m.dog_b_id
          ELSE m.dog_a_id
        END
        WHERE m.is_active = true
      ),
      event_co_participants AS (
        SELECT DISTINCT gep2.user_id AS connected_user_id
        FROM group_event_participants gep1
        JOIN group_event_participants gep2 ON gep2.event_id = gep1.event_id
        WHERE gep1.user_id = ${userId}
          AND gep2.user_id != ${userId}
      )
      SELECT connected_user_id FROM match_partner_owners
      UNION
      SELECT connected_user_id FROM event_co_participants
    `);

    return (result.rows as { connected_user_id: string }[]).map((r) => r.connected_user_id);
  }
}
