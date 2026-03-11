import { userBlocks, userFollows, users } from '@dogwalk/db';
import type { FollowSummary, FriendSummary, UserBlock, UserFollow } from '@dogwalk/types';
import { and, eq, or, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { FollowRepository, PaginatedQuery } from '../ports/follow-repository.js';
import { firstRow, rowsAs } from './drizzle-helpers.js';

export class DrizzleFollowRepository implements FollowRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async follow(followerId: string, followingId: string): Promise<UserFollow> {
    const rows = await this.db.insert(userFollows).values({ followerId, followingId }).returning();

    // Increment counters
    await Promise.all([
      this.db
        .update(users)
        .set({ followingCount: sql`${users.followingCount} + 1` })
        .where(eq(users.id, followerId)),
      this.db
        .update(users)
        .set({ followersCount: sql`${users.followersCount} + 1` })
        .where(eq(users.id, followingId)),
    ]);

    return firstRow<UserFollow>(rows);
  }

  async unfollow(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.db
      .delete(userFollows)
      .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)))
      .returning();

    if (result.length === 0) return false;

    // Decrement counters
    await Promise.all([
      this.db
        .update(users)
        .set({ followingCount: sql`GREATEST(${users.followingCount} - 1, 0)` })
        .where(eq(users.id, followerId)),
      this.db
        .update(users)
        .set({ followersCount: sql`GREATEST(${users.followersCount} - 1, 0)` })
        .where(eq(users.id, followingId)),
    ]);

    return true;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
    return rows.length > 0;
  }

  async areFriends(userA: string, userB: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(
        or(
          and(eq(userFollows.followerId, userA), eq(userFollows.followingId, userB)),
          and(eq(userFollows.followerId, userB), eq(userFollows.followingId, userA)),
        ),
      );
    return rows.length === 2;
  }

  async listFollowers(userId: string, query: PaginatedQuery): Promise<FollowSummary[]> {
    const rows = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        createdAt: userFollows.createdAt,
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followerId, users.id))
      .where(eq(userFollows.followingId, userId))
      .orderBy(userFollows.createdAt)
      .limit(query.limit)
      .offset(query.offset);

    return rowsAs<FollowSummary>(rows);
  }

  async listFollowing(userId: string, query: PaginatedQuery): Promise<FollowSummary[]> {
    const rows = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        createdAt: userFollows.createdAt,
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followingId, users.id))
      .where(eq(userFollows.followerId, userId))
      .orderBy(userFollows.createdAt)
      .limit(query.limit)
      .offset(query.offset);

    return rowsAs<FollowSummary>(rows);
  }

  async listFriends(userId: string, query: PaginatedQuery): Promise<FriendSummary[]> {
    // Friends = mutual follows: I follow them AND they follow me
    const rows = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followingId, users.id))
      .where(
        and(
          eq(userFollows.followerId, userId),
          sql`EXISTS (
            SELECT 1 FROM user_follows f2
            WHERE f2.follower_id = ${userFollows.followingId}
            AND f2.following_id = ${userId}
          )`,
        ),
      )
      .limit(query.limit)
      .offset(query.offset);

    return rowsAs<FriendSummary>(rows);
  }

  async block(blockerId: string, blockedId: string): Promise<UserBlock> {
    // Remove any existing follows in both directions
    await this.db
      .delete(userFollows)
      .where(
        or(
          and(eq(userFollows.followerId, blockerId), eq(userFollows.followingId, blockedId)),
          and(eq(userFollows.followerId, blockedId), eq(userFollows.followingId, blockerId)),
        ),
      );

    const rows = await this.db.insert(userBlocks).values({ blockerId, blockedId }).returning();
    return firstRow<UserBlock>(rows);
  }

  async unblock(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.db
      .delete(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
      .returning();
    return result.length > 0;
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)));
    return rows.length > 0;
  }

  async isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, userA), eq(userBlocks.blockedId, userB)),
          and(eq(userBlocks.blockerId, userB), eq(userBlocks.blockedId, userA)),
        ),
      );
    return rows.length > 0;
  }

  async listBlocked(userId: string, query: PaginatedQuery): Promise<FollowSummary[]> {
    const rows = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        createdAt: userBlocks.createdAt,
      })
      .from(userBlocks)
      .innerJoin(users, eq(userBlocks.blockedId, users.id))
      .where(eq(userBlocks.blockerId, userId))
      .orderBy(userBlocks.createdAt)
      .limit(query.limit)
      .offset(query.offset);

    return rowsAs<FollowSummary>(rows);
  }
}
