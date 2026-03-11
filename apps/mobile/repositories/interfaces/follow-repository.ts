export interface FollowUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowingMe: boolean;
  isFollowedByMe: boolean;
}

export interface FollowPage {
  users: FollowUser[];
  nextCursor: string | null;
}

export interface FollowStatus {
  isFollowing: boolean;
  isFollowedByMe: boolean;
  isFollowingMe: boolean;
}

export interface BlockedUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  blockedAt: string;
}

export interface BlockedPage {
  users: BlockedUser[];
  nextCursor: string | null;
}

export interface FollowRepository {
  follow(userId: string): Promise<{ success: boolean }>;
  unfollow(userId: string): Promise<{ success: boolean }>;
  listFollowers(userId: string, cursor?: string, limit?: number): Promise<FollowPage>;
  listFollowing(userId: string, cursor?: string, limit?: number): Promise<FollowPage>;
  listFriends(cursor?: string, limit?: number): Promise<FollowPage>;
  getFollowStatus(userId: string): Promise<FollowStatus>;
  searchUsers(query: string, limit?: number): Promise<FollowUser[]>;
  block(userId: string): Promise<{ success: boolean }>;
  unblock(userId: string): Promise<{ success: boolean }>;
  listBlocked(cursor?: string, limit?: number): Promise<BlockedPage>;
}
