import type { ApiClient } from '@pawmeet/api-client';
import type { FollowRepository } from '../interfaces/follow-repository';

export function createTrpcFollowRepository(api: ApiClient): FollowRepository {
  return {
    async follow(userId) {
      await api.follows.follow.mutate({ targetUserId: userId });
      return { success: true };
    },
    async unfollow(userId) {
      await api.follows.unfollow.mutate({ targetUserId: userId });
      return { success: true };
    },
    async listFollowers(userId, _cursor?, limit = 20) {
      const data = await api.follows.listFollowers.query({ userId, limit, offset: 0 });
      return {
        users: data.map((u) => ({
          id: u.id,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isFollowingMe: false,
          isFollowedByMe: false,
        })),
        nextCursor: null,
      };
    },
    async listFollowing(userId, _cursor?, limit = 20) {
      const data = await api.follows.listFollowing.query({ userId, limit, offset: 0 });
      return {
        users: data.map((u) => ({
          id: u.id,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isFollowingMe: false,
          isFollowedByMe: true,
        })),
        nextCursor: null,
      };
    },
    async listFriends(_cursor?, limit = 20) {
      const data = await api.follows.listFriends.query({ limit, offset: 0 });
      return {
        users: data.map((u) => ({
          id: u.id,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isFollowingMe: true,
          isFollowedByMe: true,
        })),
        nextCursor: null,
      };
    },
    async getFollowStatus(userId) {
      const data = await api.follows.getFollowStatus.query({ targetUserId: userId });
      return {
        isFollowing: data.isFollowing,
        isFollowedByMe: data.isFollowing,
        isFollowingMe: data.isFollowedBy,
      };
    },
    async searchUsers(query, limit = 20) {
      const data = await api.follows.search.query({ query, limit, offset: 0 });
      return data.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        isFollowingMe: false,
        isFollowedByMe: false,
      }));
    },
    async block(userId) {
      await api.follows.block.mutate({ targetUserId: userId });
      return { success: true };
    },
    async unblock(userId) {
      await api.follows.unblock.mutate({ targetUserId: userId });
      return { success: true };
    },
    async listBlocked(_cursor?, limit = 20) {
      const data = await api.follows.listBlocked.query({ limit, offset: 0 });
      return {
        users: data.map((u) => ({
          id: u.id,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          blockedAt: String(u.createdAt),
        })),
        nextCursor: null,
      };
    },
  };
}
