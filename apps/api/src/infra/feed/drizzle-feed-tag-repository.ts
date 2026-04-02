import { dogProfiles, postTags, users } from '@pawmeet/db';
import type { PostTag, ResolvedPostTag } from '@pawmeet/types';
import { eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { FeedTagRepository } from '../../ports/feed-repository.js';

export class DrizzleFeedTagRepository implements FeedTagRepository {
  constructor(private readonly db: NodePgDatabase) {}

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
}
