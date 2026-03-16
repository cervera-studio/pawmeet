// Worker deps: BullMQ worker dependencies for background jobs

import { createExportUserData } from '../use-cases/export-user-data.js';
import {
  analyticsJobRepo,
  analyticsProviders,
  badgeRepo,
  breedDetectionService,
  consentRepo,
  contentModerationService,
  dataCleanupRepo,
  dogRepo,
  emailService,
  experimentGuardrailsRepo,
  experimentMetricsJobRepo,
  feedRepo,
  gamificationRepo,
  gdprExportRepo,
  gpsRetentionRepo,
  groupEventRepo,
  mlFeatureRepo,
  mlOptimalTimesRepo,
  mlRecommendationsRepo,
  mlTrainingRepo,
  nearbyJobRepo,
  notificationService,
  risingCompatibilityRepo,
  storage,
  storyRepo,
  toxicityService,
  userRepo,
  walkJobRepo,
} from './services.js';

export const analyticsWorkerDeps = {
  providers: analyticsProviders,
  consentRepo,
  analyticsJobRepo,
};

export const analyticsAggregationDeps = {
  analyticsJobRepo,
};

export const dataCleanupDeps = {
  dataCleanupRepo,
  storage,
};

export const gdprExportWorkerDeps = {
  exportUserData: createExportUserData({ gdprExportRepo }),
  gdprExportRepo,
  storage,
  emailService,
};

export const eventStatusDeps = {
  groupEventRepo,
  notificationService,
  badgeRepo,
};

export const recurringEventDeps = {
  groupEventRepo,
};

export const photoModerationDeps = {
  dogRepo,
  notificationService,
  contentModerationService,
  breedDetectionService,
};

export const contentModerationWorkerDeps = {
  feedRepo,
  notificationService,
  contentModerationService,
};

export const messageToxicityDeps = toxicityService
  ? { toxicityService, notificationService }
  : undefined;

export const storyCleanupWorkerDeps = {
  storyRepo,
  storage,
};

export const gpsRetentionDeps = {
  gpsRetentionRepo,
};

export const walkReminderDeps = {
  walkJobRepo,
  notificationService,
};

export const walkSafetyAlertDeps = {
  walkJobRepo,
  notificationService,
};

export const nearbySuggestionDeps = {
  nearbyJobRepo,
  notificationService,
};

export const mlTrainingLabelsDeps = {
  mlTrainingRepo,
};

export const mlFeatureComputeDeps = {
  mlFeatureRepo,
};

export const mlOptimalTimesDeps = {
  mlOptimalTimesRepo,
};

export const mlRecommendationsDeps = {
  mlRecommendationsRepo,
};

export const risingCompatibilityDeps = {
  risingCompatibilityRepo,
};

export const experimentMetricsDeps = {
  experimentMetricsJobRepo,
};

export const experimentGuardrailsDeps = {
  experimentGuardrailsRepo,
};

export const sendNotificationDeps = {
  userRepo,
};

export const streakCheckDeps = {
  gamificationRepo,
};

export const weeklyChallengeRotationDeps = {
  gamificationRepo,
};
