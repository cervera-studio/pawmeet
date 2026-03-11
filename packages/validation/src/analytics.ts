import { z } from 'zod';

const analyticsEventSchema = z.object({
  clientEventId: z.string().min(1).max(64),
  eventName: z.string().min(1).max(100),
  properties: z.record(z.string(), z.unknown()).optional(),
  clientTimestamp: z.string().datetime(),
  sessionId: z.string().max(64).optional(),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().max(20).optional(),
  screenName: z.string().max(100).optional(),
});

export const batchEventsSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(100),
});

export type BatchEventsInput = z.infer<typeof batchEventsSchema>;
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
