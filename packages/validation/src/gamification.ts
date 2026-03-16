import { DEFAULT_LEADERBOARD_LIMIT, MAX_LEADERBOARD_LIMIT } from '@pawmeet/config';
import { z } from 'zod';

export const awardXpSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum([
    'walk_completed',
    'match_made',
    'feedback_given',
    'group_event_joined',
    'group_event_created',
    'challenge_completed',
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const getXpSummarySchema = z.object({
  userId: z.string().uuid(),
});

export const getLeaderboardSchema = z.object({
  type: z.enum(['weekly', 'allTime']),
  limit: z.number().int().min(1).max(MAX_LEADERBOARD_LIMIT).default(DEFAULT_LEADERBOARD_LIMIT),
});

export const listActiveChallengesSchema = z.object({
  userId: z.string().uuid(),
});

export const updateChallengeProgressSchema = z.object({
  userId: z.string().uuid(),
  challengeType: z.enum(['walk_count', 'walk_distance_km', 'new_matches', 'group_events_joined']),
  incrementBy: z.number().int().min(1).default(1),
});

export const listAchievementsSchema = z.object({
  userId: z.string().uuid(),
});

export const getStreakSchema = z.object({
  type: z.string(),
});

export type AwardXpInput = z.infer<typeof awardXpSchema>;
export type GetXpSummaryInput = z.infer<typeof getXpSummarySchema>;
export type GetLeaderboardInput = z.infer<typeof getLeaderboardSchema>;
export type ListActiveChallengesInput = z.infer<typeof listActiveChallengesSchema>;
export type UpdateChallengeProgressInput = z.infer<typeof updateChallengeProgressSchema>;
export type ListAchievementsInput = z.infer<typeof listAchievementsSchema>;
