import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaUrl: z.url().optional(),
  replyToId: z.uuid().optional(),
});

export const getMessagesSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const markReadSchema = z.object({
  matchId: z.uuid(),
});

export const addReactionSchema = z.object({
  messageId: z.uuid(),
  emoji: z.string().min(1).max(10),
});

export const removeReactionSchema = z.object({
  messageId: z.uuid(),
  emoji: z.string().min(1).max(10),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type RemoveReactionInput = z.infer<typeof removeReactionSchema>;
