import { WALK_DURATION_MAX, WALK_DURATION_MIN } from '@dogwalk/config';
import { z } from 'zod';

export const proposeWalkSchema = z.object({
  matchId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(WALK_DURATION_MIN).max(WALK_DURATION_MAX).default(30),
  title: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().max(500).optional(),
});

export const respondWalkSchema = z.object({
  walkId: z.string().uuid(),
  accept: z.boolean(),
});

export const cancelWalkSchema = z.object({
  walkId: z.string().uuid(),
});

export const listByMatchSchema = z.object({
  matchId: z.string().uuid(),
});

export type ProposeWalkInput = z.infer<typeof proposeWalkSchema>;
export type RespondWalkInput = z.infer<typeof respondWalkSchema>;
export type CancelWalkInput = z.infer<typeof cancelWalkSchema>;
export type ListByMatchInput = z.infer<typeof listByMatchSchema>;
