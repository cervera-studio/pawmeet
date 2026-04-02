export interface UserFollow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

export interface FollowSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface FriendSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export const FOLLOW_LIST_MODE = {
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
  FRIENDS: 'friends',
} as const;

export type FollowListMode = (typeof FOLLOW_LIST_MODE)[keyof typeof FOLLOW_LIST_MODE];
