// ── Event Categories ─────────────────────────────────────────────────────────

export const ANALYTICS_EVENT_CATEGORIES = {
  Auth: 'auth',
  Onboarding: 'onboarding',
  Dog: 'dog',
  Match: 'match',
  Chat: 'chat',
  Walk: 'walk',
  Gamification: 'gamification',
  Group: 'group',
  Social: 'social',
  Event: 'event',
  Feed: 'feed',
  App: 'app',
  Permission: 'permission',
  Privacy: 'privacy',
} as const;

export type AnalyticsEventCategory =
  (typeof ANALYTICS_EVENT_CATEGORIES)[keyof typeof ANALYTICS_EVENT_CATEGORIES];

// ── Event Map ────────────────────────────────────────────────────────────────

export interface AnalyticsEventMap {
  // Auth
  auth_registration_started: { method: 'email' | 'google' | 'apple' };
  auth_registration_completed: { method: 'email' | 'google' | 'apple'; durationMs: number };
  auth_registration_failed: { method: string; errorCode: string };
  auth_login_completed: { method: string };
  auth_login_failed: { method: string; errorCode: string };
  auth_email_verified: { method: 'link' | 'otp'; delayMs: number };
  auth_logout: { reason: 'manual' | 'token_expired' | 'forced' };
  auth_account_deleted: { accountAgeDays: number; dogCount: number; matchCount: number };

  // Onboarding
  onboarding_started: { source: 'organic' | 'referral' | 'ad' | 'unknown' };
  onboarding_step_viewed: { stepNumber: number; stepName: string };
  onboarding_step_completed: { stepNumber: number; stepName: string; durationMs: number };
  onboarding_step_skipped: { stepNumber: number; stepName: string };
  onboarding_completed: { totalDurationMs: number; stepsCompleted: number; authMethod: string };
  onboarding_abandoned: { lastStepNumber: number; lastStepName: string; totalDurationMs: number };

  // Dog
  dog_profile_created: {
    breed: string;
    size: string;
    energyLevel: string;
    photoCount: number;
    isNeutered: boolean;
  };
  dog_profile_updated: { fieldsChanged: string[] };
  dog_photo_uploaded: { position: number; fileSizeKb: number };

  // Matching
  match_feed_loaded: { cardsAvailable: number; avgCompatibilityScore: number };
  match_card_viewed: {
    compatibilityScore: number;
    distanceKm: number;
    viewDurationMs: number;
  };
  match_swipe_performed: {
    direction: 'right' | 'left';
    compatibilityScore: number;
    distanceKm: number;
    viewDurationMs: number;
    sizePair: string;
    energyPair: string;
  };
  match_created: {
    compatibilityScore: number;
    distanceKm: number;
    sizePair: string;
    energyPair: string;
  };
  match_unmatched: {
    reason: 'manual' | 'block' | 'account_deleted';
    matchAgeDays: number;
    messageCount: number;
  };
  match_feed_exhausted: { totalSwipesSession: number; searchRadiusKm: number };

  // Chat
  chat_opened: { matchAgeDays: number; isFirstOpen: boolean };
  chat_message_sent: {
    messageType: 'text' | 'image';
    chatAgeHours: number;
    messageCountInChat: number;
  };

  // Walk
  walk_proposed: { matchAgeHours: number; messageCountBeforeProposal: number };
  walk_response: { response: 'accepted' | 'declined' | 'counter'; proposalAgeHours: number };
  walk_completed: { durationMinutes: number; distanceKm: number; participantCount: number };
  walk_feedback_submitted: { rating: number; hasComment: boolean };

  // Gamification
  gamification_badge_earned: { badgeId: string; badgeName: string; badgeCategory: string };
  gamification_xp_awarded: { amount: number; source: string };
  gamification_level_up: { newLevel: number; totalXp: number };
  gamification_streak_broken: { streakLength: number; streakType: string };

  // Group Events
  group_event_created: {
    maxParticipants: number;
    distanceFromCreatorKm: number;
    category: 'walk' | 'meetup' | 'training' | 'official' | 'sponsored';
    visibility: 'public' | 'friends_only' | 'invite_only';
    requiresApproval: boolean;
    isRecurring: boolean;
  };
  group_event_joined: { participantNumber: number; distanceKm: number };
  group_event_request_sent: { eventCategory: string; isHostFriend: boolean };
  group_event_request_approved: { requestAgeHours: number; participantNumber: number };
  group_event_request_declined: { requestAgeHours: number; reason?: string };
  group_event_request_cancelled: { requestAgeHours: number };
  group_event_recurring_created: {
    recurrenceFrequency: 'daily' | 'weekly' | 'monthly';
    category: string;
  };
  group_event_occurrence_generated: { parentEventId: string; occurrenceNumber: number };

  // Social (Friend System)
  social_follow_created: { isReciprocal: boolean };
  social_follow_removed: { wasMutual: boolean; followAgeDays: number };
  social_user_blocked: { hadPriorFollow: boolean };
  social_user_unblocked: Record<string, never>;
  social_user_searched: { resultCount: number; queryLength: number };

  // Main Events & Brands
  event_main_created: {
    organizationType: 'pawmeet_team' | 'association' | 'educator' | 'brand';
    maxParticipants: number;
    hasSponsor: boolean;
  };
  event_main_joined: {
    participantNumber: number;
    capacityPercent: number;
    organizationType: string;
  };
  event_main_completed: {
    participantCount: number;
    capacityPercent: number;
    hasSponsor: boolean;
  };
  event_sponsor_viewed: {
    sponsorTier: 'title' | 'gold' | 'silver' | 'partner';
    placement: string;
  };

  // Feed
  feed_post_created: {
    mediaCount: number;
    hasCaption: boolean;
    hasLocation: boolean;
    tagCount: number;
  };
  feed_post_liked: { postAgeHours: number };
  feed_comment_created: { postAgeHours: number; isReply: boolean };
  feed_post_deleted: { postAgeHours: number; mediaCount: number };
  feed_story_created: { mediaType: 'photo' | 'video' };
  feed_story_viewed: { storyAgeHours: number };
  feed_content_reported: { contentType: 'post' | 'comment' | 'story'; reason: string };

  // App
  app_opened: {
    hoursSinceLastOpen: number;
    isNotificationDriven: boolean;
    notificationType?: string;
  };
  app_backgrounded: { sessionDurationMs: number; screenCount: number };

  // Permissions
  permission_location_changed: { newStatus: string; wasPrompted: boolean };
  permission_notification_changed: { newStatus: string; wasPrompted: boolean };

  // Privacy
  privacy_consent_updated: {
    analytics: boolean;
    abTesting: boolean;
    errorTracking: boolean;
    marketing: boolean;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

// ── Service Interface ────────────────────────────────────────────────────────

export interface AnalyticsService {
  /** Identify user (call after login). Never pass PII like email. */
  identify(userId: string, traits?: Record<string, unknown>): void;

  /** Track a typed event. */
  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]): void;

  /** Reset identity (call on logout). */
  reset(): void;

  /** Opt in to tracking (after consent). */
  optIn(): void;

  /** Opt out of tracking (consent withdrawn). */
  optOut(): void;

  /** Flush any queued events. */
  flush(): Promise<void>;
}

// ── Consent Types ────────────────────────────────────────────────────────────

export const CONSENT_TYPES = {
  Analytics: 'analytics',
  AbTesting: 'ab_testing',
  ErrorTracking: 'error_tracking',
  Marketing: 'marketing',
} as const;

export type ConsentType = (typeof CONSENT_TYPES)[keyof typeof CONSENT_TYPES];

export interface ConsentState {
  analytics: boolean;
  abTesting: boolean;
  errorTracking: boolean;
  marketing: boolean;
}

export const DEFAULT_CONSENT_STATE: ConsentState = {
  analytics: false,
  abTesting: false,
  errorTracking: false,
  marketing: false,
};
