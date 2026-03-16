// Admin domain: admin user management, data access, notifications

import {
  adminAiMatchingRepo,
  adminDataRepo,
  adminNotificationService,
  adminUserRepo,
  auditLogRepo,
  gamificationRepo,
} from './services.js';

export const adminDeps = {
  adminUserRepo,
  adminDataRepo,
  adminNotificationService,
  gamificationRepo,
  auditLogRepo,
};

export const adminAiMatchingDeps = {
  adminAiMatchingRepo,
  auditLogRepo,
};
