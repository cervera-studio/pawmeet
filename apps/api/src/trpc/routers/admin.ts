import type { AdminDataRepository } from '../../ports/admin-data-repository.js';
import type { AdminNotificationService } from '../../ports/admin-notification-service.js';
import type { AuditLogRepository } from '../../ports/audit-log-repository.js';
import type { GamificationRepository } from '../../ports/gamification-repository.js';
import type { GdprExportRepository } from '../../ports/gdpr-export-repository.js';
import type { TokenRepository } from '../../ports/token-repository.js';
import { router } from '../trpc.js';
import { createAdminDashboardRouter } from './admin-dashboard.js';
import { createAdminGamificationRouter } from './admin-gamification.js';
import { createAdminModerationRouter } from './admin-moderation.js';
import { createAdminSettingsRouter } from './admin-settings.js';
import { createAdminUsersRouter } from './admin-users.js';

// Re-export PersistedSettings so existing imports keep working
export type { PersistedSettings } from './admin-settings.js';

interface AdminRouterDeps {
  adminDataRepo: AdminDataRepository;
  adminNotificationService: AdminNotificationService;
  auditLogRepo: AuditLogRepository;
  gamificationRepo?: GamificationRepository;
  gdprExportRepo?: GdprExportRepository;
  tokenRepo?: TokenRepository;
}

/**
 * Composition root for all admin sub-routers.
 *
 * Each sub-router is mounted as a flat merge so that the
 * public API shape (`admin.getStats`, `admin.listUsers`, etc.)
 * remains identical to the pre-split version.
 */
export function createAdminRouter(deps: AdminRouterDeps) {
  const {
    adminDataRepo,
    adminNotificationService,
    auditLogRepo,
    gamificationRepo,
    gdprExportRepo,
    tokenRepo,
  } = deps;

  const dashboard = createAdminDashboardRouter({ adminDataRepo, auditLogRepo });
  const users = createAdminUsersRouter({
    adminDataRepo,
    adminNotificationService,
    auditLogRepo,
    gdprExportRepo,
    tokenRepo,
  });
  const moderation = createAdminModerationRouter({ adminDataRepo, auditLogRepo });
  const settings = createAdminSettingsRouter({ auditLogRepo });
  const gamification = createAdminGamificationRouter({ auditLogRepo, gamificationRepo });

  return router({
    ...dashboard._def.procedures,
    ...users._def.procedures,
    ...moderation._def.procedures,
    ...settings._def.procedures,
    ...gamification._def.procedures,
  });
}
