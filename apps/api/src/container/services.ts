// Shared infrastructure: repositories, services, and external integrations

import { createOrganizationAuthorizer } from '../domain/organization-authorizer.js';
import { BullMQNotificationService } from '../infra/bullmq-notification-service.js';
import { CachedBreedRepository } from '../infra/cached-breed-repository.js';
import { CachedDogRepository } from '../infra/cached-dog-repository.js';
import { CachedUserRepository } from '../infra/cached-user-repository.js';
import { DrizzleActivityRepository } from '../infra/drizzle-activity-repository.js';
import { DrizzleAdminAiMatchingRepository } from '../infra/drizzle-admin-ai-matching-repository.js';
import { DrizzleAdminDataRepository } from '../infra/drizzle-admin-data-repository.js';
import { DrizzleAdminUserRepository } from '../infra/drizzle-admin-user-repository.js';
import { DrizzleAnalyticsJobRepository } from '../infra/drizzle-analytics-job-repository.js';
import { DrizzleAnalyticsRepository } from '../infra/drizzle-analytics-repository.js';
import { DrizzleAuditLogRepository } from '../infra/drizzle-audit-log-repository.js';
import { DrizzleBadgeRepository } from '../infra/drizzle-badge-repository.js';
import { DrizzleBreedRepository } from '../infra/drizzle-breed-repository.js';
import { DrizzleConsentRepository } from '../infra/drizzle-consent-repository.js';
import { DrizzleContentReportRepository } from '../infra/drizzle-content-report-repository.js';
import { DrizzleDataCleanupRepository } from '../infra/drizzle-data-cleanup-repository.js';
import { DrizzleDogRepository } from '../infra/drizzle-dog-repository.js';
import { DrizzleEmergencyContactRepository } from '../infra/drizzle-emergency-contact-repository.js';
import { DrizzleEventSponsorRepository } from '../infra/drizzle-event-sponsor-repository.js';
import { DrizzleExperimentGuardrailsRepository } from '../infra/drizzle-experiment-guardrails-repository.js';
import { DrizzleExperimentMetricsJobRepository } from '../infra/drizzle-experiment-metrics-job-repository.js';
import { DrizzleFeedRepository } from '../infra/drizzle-feed-repository.js';
import { DrizzleFeedbackRepository } from '../infra/drizzle-feedback-repository.js';
import { DrizzleFollowRepository } from '../infra/drizzle-follow-repository.js';
import { DrizzleGamificationRepository } from '../infra/drizzle-gamification-repository.js';
import { DrizzleGdprExportRepository } from '../infra/drizzle-gdpr-export-repository.js';
import { DrizzleGpsRetentionRepository } from '../infra/drizzle-gps-retention-repository.js';
import { DrizzleGroupEventRepository } from '../infra/drizzle-group-event-repository.js';
import { DrizzleGroupMessageRepository } from '../infra/drizzle-group-message-repository.js';
import { DrizzleMatchRepository } from '../infra/drizzle-match-repository.js';
import { DrizzleMatchingAiRepository } from '../infra/drizzle-matching-ai-repository.js';
import { DrizzleMessageRepository } from '../infra/drizzle-message-repository.js';
import { DrizzleMlFeatureRepository } from '../infra/drizzle-ml-feature-repository.js';
import { DrizzleMlOptimalTimesRepository } from '../infra/drizzle-ml-optimal-times-repository.js';
import { DrizzleMlRecommendationsRepository } from '../infra/drizzle-ml-recommendations-repository.js';
import { DrizzleMlTrainingRepository } from '../infra/drizzle-ml-training-repository.js';
import { DrizzleMoodLogRepository } from '../infra/drizzle-mood-log-repository.js';
import { DrizzleNearbyJobRepository } from '../infra/drizzle-nearby-job-repository.js';
import { DrizzleOAuthAccountRepository } from '../infra/drizzle-oauth-account-repository.js';
import { DrizzleOrganizationRepository } from '../infra/drizzle-organization-repository.js';
import { DrizzleRisingCompatibilityRepository } from '../infra/drizzle-rising-compatibility-repository.js';
import { DrizzleStoryRepository } from '../infra/drizzle-story-repository.js';
import { DrizzleSupportRepository } from '../infra/drizzle-support-repository.js';
import { DrizzleTokenRepository } from '../infra/drizzle-token-repository.js';
import { DrizzleUserRepository } from '../infra/drizzle-user-repository.js';
import { DrizzleWalkAlbumRepository } from '../infra/drizzle-walk-album-repository.js';
import { DrizzleWalkJobRepository } from '../infra/drizzle-walk-job-repository.js';
import { DrizzleWalkRepository } from '../infra/drizzle-walk-repository.js';
import { DrizzleWalkTrackRepository } from '../infra/drizzle-walk-track-repository.js';
import { EmailAdminNotificationService } from '../infra/email-admin-notification-service.js';
import { JwksSocialAuthVerifier } from '../infra/jwks-social-auth-verifier.js';
import { JwtAuthService } from '../infra/jwt-auth-service.js';
import { PostHogAnalyticsProvider } from '../infra/posthog-analytics-provider.js';
import { R2StorageService } from '../infra/r2-storage-service.js';
import { RedisExperimentService } from '../infra/redis-experiment-service.js';
import { ResendEmailService } from '../infra/resend-email-service.js';
import { WsChatService } from '../infra/ws-chat-service.js';
import { WsFeedRealtimeService } from '../infra/ws-feed-realtime-service.js';
import { db } from '../lib/db.js';
import type { AnalyticsProvider } from '../ports/analytics-provider.js';

// ── Repositories ────────────────────────────────────────────────────────────────

export const adminAiMatchingRepo = new DrizzleAdminAiMatchingRepository(db);
export const analyticsJobRepo = new DrizzleAnalyticsJobRepository(db);
export const auditLogRepo = new DrizzleAuditLogRepository(db);
export const adminDataRepo = new DrizzleAdminDataRepository(db);
export const adminUserRepo = new DrizzleAdminUserRepository(db);
export const analyticsRepo = new DrizzleAnalyticsRepository(db);
export const dataCleanupRepo = new DrizzleDataCleanupRepository(db);
export const experimentGuardrailsRepo = new DrizzleExperimentGuardrailsRepository(db);
export const experimentMetricsJobRepo = new DrizzleExperimentMetricsJobRepository(db);
export const gpsRetentionRepo = new DrizzleGpsRetentionRepository(db);
export const mlFeatureRepo = new DrizzleMlFeatureRepository(db);
export const mlOptimalTimesRepo = new DrizzleMlOptimalTimesRepository(db);
export const mlRecommendationsRepo = new DrizzleMlRecommendationsRepository(db);
export const mlTrainingRepo = new DrizzleMlTrainingRepository(db);
export const nearbyJobRepo = new DrizzleNearbyJobRepository(db);
export const risingCompatibilityRepo = new DrizzleRisingCompatibilityRepository(db);
export const walkJobRepo = new DrizzleWalkJobRepository(db);
const _userRepo = new DrizzleUserRepository(db);
const _dogRepo = new DrizzleDogRepository(db);
const _breedRepo = new DrizzleBreedRepository(db);

// Wrap with cache-aside (lazy redis import to avoid import-time crash in tests)
const { redis } = await import('../lib/redis.js');
export const userRepo = new CachedUserRepository(_userRepo, redis);
export const dogRepo = new CachedDogRepository(_dogRepo, redis);
export const matchRepo = new DrizzleMatchRepository(db);
export const messageRepo = new DrizzleMessageRepository(db);
export const tokenRepo = new DrizzleTokenRepository(db);
export const breedRepo = new CachedBreedRepository(_breedRepo, redis);
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
export const moodLogRepo = new DrizzleMoodLogRepository(db);
export const organizationRepo = new DrizzleOrganizationRepository(db);
export const eventSponsorRepo = new DrizzleEventSponsorRepository(db);
export const gdprExportRepo = new DrizzleGdprExportRepository(db);
export const oauthAccountRepo = new DrizzleOAuthAccountRepository(db);
export const emergencyContactRepo = new DrizzleEmergencyContactRepository(db);
export const supportRepo = new DrizzleSupportRepository(db);

// ── Embedding (pgvector) ─────────────────────────────────────────────────────

import process from 'node:process';
import { DrizzleEmbeddingRepository } from '../infra/drizzle-embedding-repository.js';
import { LocalEmbeddingService } from '../infra/embedding-service.js';

export const embeddingRepo = new DrizzleEmbeddingRepository(db);
export const embeddingService = new LocalEmbeddingService();

// ── Services ────────────────────────────────────────────────────────────────────

export const authService = new JwtAuthService();
export const socialAuthVerifier = new JwksSocialAuthVerifier(
  process.env.APPLE_BUNDLE_ID ?? '',
  process.env.GOOGLE_CLIENT_ID ?? '',
);

// Apple token revocation — degrades gracefully if env vars missing
// Lazy import to avoid adding to the import cycle in this file
export const appleAuthService = await (async () => {
  if (!process.env.APPLE_TEAM_ID) return undefined;
  const { AppleTokenRevocationService } = await import(
    '../infra/apple-token-revocation-service.js'
  );
  return new AppleTokenRevocationService(
    process.env.APPLE_TEAM_ID,
    process.env.APPLE_BUNDLE_ID ?? '',
    process.env.APPLE_KEY_ID ?? '',
    process.env.APPLE_PRIVATE_KEY ?? '',
  );
})();
export const emailService = new ResendEmailService();
export const adminNotificationService = new EmailAdminNotificationService(emailService);
export const storage = new R2StorageService();
export const chat = new WsChatService();
export const notificationService = new BullMQNotificationService();
export const feedRealtime = new WsFeedRealtimeService();
export const organizationAuthorizer = createOrganizationAuthorizer();
export const experimentService = new RedisExperimentService(consentRepo);

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

// ── Anthropic client (shared, optional) ──────────────────────────────────────

async function tryCreateAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return;
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic() as import('@anthropic-ai/sdk').default;
}

const anthropicClient = await tryCreateAnthropicClient();

// ── AI services (optional — degrade gracefully if env vars missing) ──────────

async function tryCreateContentModerationService() {
  if (!anthropicClient) return;
  const { ClaudeContentModerationService } = await import(
    '../infra/claude-content-moderation-service.js'
  );
  return new ClaudeContentModerationService(anthropicClient);
}

async function tryCreateBioGenerationService() {
  if (!anthropicClient) return;
  const { ClaudeBioGenerationService } = await import('../infra/claude-bio-generation-service.js');
  return new ClaudeBioGenerationService(
    anthropicClient,
  ) as import('../ports/bio-generation-service.js').BioGenerationService;
}

async function tryCreateDogPhotoAnalysisService() {
  if (!anthropicClient) return;
  const { ClaudeDogPhotoAnalysisService } = await import(
    '../infra/claude-dog-photo-analysis-service.js'
  );
  return new ClaudeDogPhotoAnalysisService(
    anthropicClient,
  ) as import('../ports/dog-photo-analysis-service.js').DogPhotoAnalysisService;
}

async function tryCreateBreedDetectionService() {
  if (!process.env.GOOGLE_VISION_API_KEY) return;
  const { GoogleBreedDetectionService } = await import(
    '../infra/google-breed-detection-service.js'
  );
  return new GoogleBreedDetectionService();
}

async function tryCreateToxicityService() {
  if (!process.env.PERSPECTIVE_API_KEY) return;
  const { PerspectiveToxicityService } = await import('../infra/perspective-toxicity-service.js');
  return new PerspectiveToxicityService();
}

export const contentModerationService = await tryCreateContentModerationService();
export const breedDetectionService = await tryCreateBreedDetectionService();
export const toxicityService = await tryCreateToxicityService();
export const bioGenerationService = await tryCreateBioGenerationService();
export const dogPhotoAnalysisService = await tryCreateDogPhotoAnalysisService();
