import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaUrl: z.string().url().optional(),
});

export const getMessagesSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const markReadSchema = z.object({
  matchId: z.string().uuid(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
