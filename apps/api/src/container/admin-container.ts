// Admin domain: admin user management, data access, notifications

import { adminDataRepo, adminNotificationService, adminUserRepo } from './services.js';

export const adminDeps = {
  adminUserRepo,
  adminDataRepo,
  adminNotificationService,
};
