import { z } from 'zod';

export const scoreBreakdownSchema = z.object({
  sizeScore: z.number().min(0).max(1),
  energyScore: z.number().min(0).max(1),
  behaviorScore: z.number().min(0).max(1),
  walkScore: z.number().min(0).max(1),
  distanceScore: z.number().min(0).max(1),
  leashScore: z.number().min(0).max(1),
  overallScore: z.number().min(0).max(1),
});

export const logSwipeScoreSchema = z.object({
  dogId: z.uuid(),
  targetDogId: z.uuid(),
  direction: z.enum(['like', 'pass']),
  scores: scoreBreakdownSchema,
});

export const recordMatchInteractionSchema = z.object({
  matchId: z.uuid(),
  interactionType: z.enum([
    'walk_completed',
    'chat_started',
    'feedback_positive',
    'feedback_negative',
    'unmatch',
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const recordActivityWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  hourOfDay: z.number().int().min(0).max(23),
});

export const getOptimalTimesSchema = z.object({
  dogId: z.uuid(),
  limit: z.number().int().min(1).max(10).optional(),
});

export const getMatchingInsightsSchema = z.object({
  dogId: z.uuid(),
});

export const getMatchExplanationSchema = z.object({
  matchId: z.uuid(),
});

export const getNearbyActiveCountSchema = z.object({
  dogId: z.uuid(),
});

export const suggestWalksSchema = z.object({
  dogId: z.uuid(),
  limit: z.number().int().min(1).max(5).optional(),
});
