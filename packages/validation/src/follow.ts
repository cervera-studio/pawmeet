import { z } from 'zod';

export const followUserSchema = z.object({
  targetUserId: z.uuid(),
});

export const unfollowUserSchema = z.object({
  targetUserId: z.uuid(),
});

export const blockUserSchema = z.object({
  targetUserId: z.uuid(),
});

export const unblockUserSchema = z.object({
  targetUserId: z.uuid(),
});

export const getFollowStatusSchema = z.object({
  targetUserId: z.uuid(),
});

export const listFollowsSchema = z.object({
  userId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type GetFollowStatusInput = z.infer<typeof getFollowStatusSchema>;
export type FollowUserInput = z.infer<typeof followUserSchema>;
export type UnfollowUserInput = z.infer<typeof unfollowUserSchema>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type UnblockUserInput = z.infer<typeof unblockUserSchema>;
export type ListFollowsInput = z.infer<typeof listFollowsSchema>;
