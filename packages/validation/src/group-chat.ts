import { z } from 'zod';

export const sendGroupMessageSchema = z.object({
  eventId: z.uuid(),
  content: z.string().min(1).max(2000),
  mediaUrl: z.url().optional(),
});

export const getGroupMessagesSchema = z.object({
  eventId: z.uuid(),
  cursor: z.uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const markGroupMessagesReadSchema = z.object({
  eventId: z.uuid(),
});

export type SendGroupMessageInput = z.infer<typeof sendGroupMessageSchema>;
export type GetGroupMessagesInput = z.infer<typeof getGroupMessagesSchema>;
export type MarkGroupMessagesReadInput = z.infer<typeof markGroupMessagesReadSchema>;
