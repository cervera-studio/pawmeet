import { z } from 'zod';

export const sendGroupMessageSchema = z.object({
  eventId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  mediaUrl: z.string().url().optional(),
});

export const getGroupMessagesSchema = z.object({
  eventId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const markGroupMessagesReadSchema = z.object({
  eventId: z.string().uuid(),
});

export type SendGroupMessageInput = z.infer<typeof sendGroupMessageSchema>;
export type GetGroupMessagesInput = z.infer<typeof getGroupMessagesSchema>;
export type MarkGroupMessagesReadInput = z.infer<typeof markGroupMessagesReadSchema>;
