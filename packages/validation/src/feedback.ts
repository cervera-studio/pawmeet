import { z } from 'zod';

export const submitFeedbackSchema = z.object({
  walkId: z.string().uuid(),
  toDogId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
