import {
  dogProfiles,
  hashtags,
  postHashtags,
  postMedia,
  posts,
  postTags,
  users,
} from '@pawmeet/db';
import type { FeedItem, Hashtag, Post, PostMedia, ResolvedPostTag } from '@pawmeet/types';
import { and, desc, eq, inArray, lt, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { FeedHashtagRepository, FeedPage } from '../../ports/feed-repository.js';
import { decodeCursor, encodeCursor } from './cursor.js';

export class DrizzleFeedHashtagRepository implements FeedHashtagRepository {
  constructor(private readonly db: NodePgDatabase) {}

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
