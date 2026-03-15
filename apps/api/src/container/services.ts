// Shared infrastructure: repositories, services, and external integrations

import { createOrganizationAuthorizer } from '../domain/organization-authorizer.js';
import { BullMQNotificationService } from '../infra/bullmq-notification-service.js';
import { DrizzleActivityRepository } from '../infra/drizzle-activity-repository.js';
import { DrizzleAdminDataRepository } from '../infra/drizzle-admin-data-repository.js';
import { DrizzleAnalyticsRepository } from '../infra/drizzle-analytics-repository.js';
import { DrizzleAdminUserRepository } from '../infra/drizzle-admin-user-repository.js';
import { DrizzleBadgeRepository } from '../infra/drizzle-badge-repository.js';
import { DrizzleBreedRepository } from '../infra/drizzle-breed-repository.js';
import { DrizzleConsentRepository } from '../infra/drizzle-consent-repository.js';
import { DrizzleContentReportRepository } from '../infra/drizzle-content-report-repository.js';
import { DrizzleDogRepository } from '../infra/drizzle-dog-repository.js';
import { DrizzleEmergencyContactRepository } from '../infra/drizzle-emergency-contact-repository.js';
import { DrizzleEventSponsorRepository } from '../infra/drizzle-event-sponsor-repository.js';
import { DrizzleFeedRepository } from '../infra/drizzle-feed-repository.js';
import { DrizzleFeedbackRepository } from '../infra/drizzle-feedback-repository.js';
import { DrizzleFollowRepository } from '../infra/drizzle-follow-repository.js';
import { DrizzleGamificationRepository } from '../infra/drizzle-gamification-repository.js';
import { DrizzleGdprExportRepository } from '../infra/drizzle-gdpr-export-repository.js';
import { DrizzleGroupEventRepository } from '../infra/drizzle-group-event-repository.js';
import { DrizzleGroupMessageRepository } from '../infra/drizzle-group-message-repository.js';
import { DrizzleMatchRepository } from '../infra/drizzle-match-repository.js';
import { DrizzleMatchingAiRepository } from '../infra/drizzle-matching-ai-repository.js';
import { DrizzleMessageRepository } from '../infra/drizzle-message-repository.js';
import { DrizzleOrganizationRepository } from '../infra/drizzle-organization-repository.js';
import { DrizzleStoryRepository } from '../infra/drizzle-story-repository.js';
import { DrizzleTokenRepository } from '../infra/drizzle-token-repository.js';
import { DrizzleUserRepository } from '../infra/drizzle-user-repository.js';
import { DrizzleWalkAlbumRepository } from '../infra/drizzle-walk-album-repository.js';
import { DrizzleWalkRepository } from '../infra/drizzle-walk-repository.js';
import { DrizzleWalkTrackRepository } from '../infra/drizzle-walk-track-repository.js';
import { EmailAdminNotificationService } from '../infra/email-admin-notification-service.js';
import { JwksSocialAuthVerifier } from '../infra/jwks-social-auth-verifier.js';
import { JwtAuthService } from '../infra/jwt-auth-service.js';
import { PostHogAnalyticsProvider } from '../infra/posthog-analytics-provider.js';
import { R2StorageService } from '../infra/r2-storage-service.js';
import { ResendEmailService } from '../infra/resend-email-service.js';
import { StatsigExperimentService } from '../infra/statsig-experiment-service.js';
import { WsChatService } from '../infra/ws-chat-service.js';
import { WsFeedRealtimeService } from '../infra/ws-feed-realtime-service.js';
import { db } from '../lib/db.js';
import type { AnalyticsProvider } from '../ports/analytics-provider.js';

// ── Repositories ────────────────────────────────────────────────────────────────

export const adminDataRepo = new DrizzleAdminDataRepository(db);
export const adminUserRepo = new DrizzleAdminUserRepository(db);
export const analyticsRepo = new DrizzleAnalyticsRepository(db);
export const userRepo = new DrizzleUserRepository(db);
export const dogRepo = new DrizzleDogRepository(db);
export const matchRepo = new DrizzleMatchRepository(db);
export const messageRepo = new DrizzleMessageRepository(db);
export const tokenRepo = new DrizzleTokenRepository(db);
export const breedRepo = new DrizzleBreedRepository(db);
export const walkRepo = new DrizzleWalkRepository(db);
export const feedbackRepo = new DrizzleFeedbackRepository(db);
export const groupEventRepo = new DrizzleGroupEventRepository(db);
export const groupMessageRepo = new DrizzleGroupMessageRepository(db);
export const badgeRepo = new DrizzleBadgeRepository(db);
export const gamificationRepo = new DrizzleGamificationRepository(db);
export const feedRepo = new DrizzleFeedRepository(db);
export const storyRepo = new DrizzleStoryRepository(db);
export const consentRepo = new DrizzleConsentRepository(db);
export const contentReportRepo = new DrizzleContentReportRepository(db);
export const followRepo = new DrizzleFollowRepository(db);
export const walkAlbumRepo = new DrizzleWalkAlbumRepository(db);
export const walkTrackRepo = new DrizzleWalkTrackRepository(db);
export const activityRepo = new DrizzleActivityRepository(db);
export const matchingAiRepo = new DrizzleMatchingAiRepository(db);
export const organizationRepo = new DrizzleOrganizationRepository(db);
export const eventSponsorRepo = new DrizzleEventSponsorRepository(db);
export const gdprExportRepo = new DrizzleGdprExportRepository(db);
export const emergencyContactRepo = new DrizzleEmergencyContactRepository(db);

// ── Services ────────────────────────────────────────────────────────────────────

export const authService = new JwtAuthService();
export const socialAuthVerifier = new JwksSocialAuthVerifier(
  process.env.APPLE_BUNDLE_ID ?? '',
  process.env.GOOGLE_CLIENT_ID ?? '',
);
export const emailService = new ResendEmailService();
export const adminNotificationService = new EmailAdminNotificationService(emailService);
export const storage = new R2StorageService();
export const chat = new WsChatService();
export const notificationService = new BullMQNotificationService();
export const feedRealtime = new WsFeedRealtimeService();
export const organizationAuthorizer = createOrganizationAuthorizer();
export const experimentService = new StatsigExperimentService(
  process.env.STATSIG_SERVER_SECRET ?? '',
  consentRepo,
);

// ── Analytics providers (dual-write: Neon + external) ───────────────────────

export const analyticsProviders: AnalyticsProvider[] = process.env.POSTHOG_API_KEY
  ? [
      new PostHogAnalyticsProvider(
        process.env.POSTHOG_API_KEY,
        process.env.POSTHOG_HOST ?? 'https://eu.i.posthog.com',
        process.env.POSTHOG_PERSONAL_API_KEY,
        process.env.POSTHOG_PROJECT_ID,
      ),
    ]
  : [];

// ── AI services (optional — degrade gracefully if env vars missing) ──────────

function tryCreateContentModerationService() {
  if (!process.env.ANTHROPIC_API_KEY) return undefined;
  // Lazy import to avoid loading SDK when not configured
  const {
    ClaudeContentModerationService,
  } = require('../infra/claude-content-moderation-service.js');
  return new ClaudeContentModerationService();
}

function tryCreateBreedDetectionService() {
  if (!process.env.GOOGLE_VISION_API_KEY) return undefined;
  const { GoogleBreedDetectionService } = require('../infra/google-breed-detection-service.js');
  return new GoogleBreedDetectionService();
}

function tryCreateToxicityService() {
  if (!process.env.PERSPECTIVE_API_KEY) return undefined;
  const { PerspectiveToxicityService } = require('../infra/perspective-toxicity-service.js');
  return new PerspectiveToxicityService();
}

export const contentModerationService = tryCreateContentModerationService();
export const breedDetectionService = tryCreateBreedDetectionService();
export const toxicityService = tryCreateToxicityService();

// Re-export db for containers that need it directly
export { db };
