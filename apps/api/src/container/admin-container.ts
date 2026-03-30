// Admin domain: admin user management, data access, notifications

import {
  adminAiMatchingRepo,
  adminDataRepo,
  adminNotificationService,
  adminUserRepo,
  auditLogRepo,
  gamificationRepo,
  gdprExportRepo,
  posthogQueryService,
  tokenRepo,
} from './services.js';

export const adminDeps = {
  adminUserRepo,
  adminDataRepo,
  adminNotificationService,
  gamificationRepo,
  auditLogRepo,
  gdprExportRepo,
  tokenRepo,
  posthogQueryService,
};

export const adminAiMatchingDeps = {
  adminAiMatchingRepo,
  auditLogRepo,
};
