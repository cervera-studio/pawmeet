import { z } from 'zod';

export const submitFeedbackSchema = z.object({
  walkId: z.uuid(),
  toDogId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
