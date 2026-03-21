import { MOOD_MAX_TAGS, MOOD_NOTES_MAX_LENGTH, MOOD_TAGS } from '@pawmeet/config';
import { z } from 'zod';

export const submitMoodLogSchema = z.object({
  dogId: z.uuid(),
  trackId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.enum(MOOD_TAGS)).max(MOOD_MAX_TAGS),
  notes: z.string().max(MOOD_NOTES_MAX_LENGTH).optional(),
});

export const listDogMoodLogsSchema = z.object({
  dogId: z.uuid(),
  cursor: z.uuid().nullish(),
  limit: z.number().int().min(1).max(50).optional(),
});

export type SubmitMoodLogInput = z.infer<typeof submitMoodLogSchema>;
