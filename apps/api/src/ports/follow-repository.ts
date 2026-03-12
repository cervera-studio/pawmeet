import type { FollowSummary, FriendSummary, UserBlock, UserFollow } from '@pawmeet/types';

export interface PaginatedQuery {
  limit: number;
  offset: number;
}

export interface FollowRepository {
  follow(followerId: string, followingId: string): Promise<UserFollow>;
  unfollow(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  areFriends(userA: string, userB: string): Promise<boolean>;
  listFollowers(userId: string, query: PaginatedQuery): Promise<FollowSummary[]>;
  listFollowing(userId: string, query: PaginatedQuery): Promise<FollowSummary[]>;
  listFriends(userId: string, query: PaginatedQuery): Promise<FriendSummary[]>;

  block(blockerId: string, blockedId: string): Promise<UserBlock>;
  unblock(blockerId: string, blockedId: string): Promise<boolean>;
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  isBlockedEitherWay(userA: string, userB: string): Promise<boolean>;
  listBlocked(userId: string, query: PaginatedQuery): Promise<FollowSummary[]>;
}
