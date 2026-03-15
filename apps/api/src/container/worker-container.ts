// Worker deps: BullMQ worker dependencies for background jobs

import { createExportUserData } from '../use-cases/export-user-data.js';
import {
  analyticsProviders,
  badgeRepo,
  breedDetectionService,
  consentRepo,
  contentModerationService,
  db,
  dogRepo,
  emailService,
  feedRepo,
  gdprExportRepo,
  groupEventRepo,
  notificationService,
  storage,
  storyRepo,
  toxicityService,
} from './services.js';

export const analyticsWorkerDeps = {
  providers: analyticsProviders,
  consentRepo,
};

export const dataCleanupDeps = {
  db,
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
  db,
};
