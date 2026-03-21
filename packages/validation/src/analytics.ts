import { z } from 'zod';

/**
 * Allowlist of event names that clients are permitted to submit.
 * Server-authoritative events (auth_*, match_created, etc.) are tracked
 * via trackEvent() and should NOT be accepted from clients.
 */
const CLIENT_ALLOWED_EVENTS = [
  // Onboarding
  'onboarding_started',
  'onboarding_step_viewed',
  'onboarding_step_completed',
  'onboarding_step_skipped',
  'onboarding_completed',
  'onboarding_abandoned',
  // Matching (client-exclusive view events)
  'match_feed_loaded',
  'match_card_viewed',
  'match_swipe_performed',
  'match_feed_exhausted',
  // Chat (client-exclusive)
  'chat_opened',
  // App lifecycle
  'app_opened',
  'app_backgrounded',
  // Permissions
  'permission_location_changed',
  'permission_notification_changed',
  // Privacy
  'privacy_consent_updated',
  // Gamification (client-exclusive view events)
  'gamification_badge_earned',
  'gamification_xp_awarded',
  'gamification_level_up',
  'gamification_streak_broken',
  // Social (client-exclusive)
  'social_user_searched',
  // Event sponsor views
  'event_sponsor_viewed',
] as const;

const clientEventNameSchema = z.enum(CLIENT_ALLOWED_EVENTS);

const analyticsEventSchema = z.object({
  clientEventId: z.string().min(1).max(64),
  eventName: clientEventNameSchema,
  properties: z.record(z.string(), z.unknown()).optional(),
  clientTimestamp: z.iso.datetime(),
  sessionId: z.string().max(64).optional(),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().max(20).optional(),
  screenName: z.string().max(100).optional(),
});

export const batchEventsSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(100),
  consentGiven: z.boolean(),
});

export type BatchEventsInput = z.infer<typeof batchEventsSchema>;
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
