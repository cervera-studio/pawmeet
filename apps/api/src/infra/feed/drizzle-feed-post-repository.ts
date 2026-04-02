import { dogProfiles, postLikes, postMedia, posts, postTags, users } from '@pawmeet/db';
import type { FeedItem, Post, PostMedia, ResolvedPostTag } from '@pawmeet/types';
import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { CreatePostInput, FeedPage, FeedPostRepository } from '../../ports/feed-repository.js';
import { decodeCursor, encodeCursor } from './cursor.js';

export class DrizzleFeedPostRepository implements FeedPostRepository {
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

  async getConnectedUserIds(userId: string): Promise<string[]> {
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

  private async findMediaByPost(postId: string): Promise<PostMedia[]> {
    return (await this.db
      .select()
      .from(postMedia)
      .where(eq(postMedia.postId, postId))
      .orderBy(postMedia.position)) as PostMedia[];
  }

  private async hasLiked(postId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    return row !== undefined;
  }

  private async getResolvedTags(postId: string): Promise<ResolvedPostTag[]> {
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
}
