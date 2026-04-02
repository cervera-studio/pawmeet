import type { AdminDataRepository } from '../../../ports/admin-data-repository.js';
import type { AuditLogRepository } from '../../../ports/audit-log-repository.js';

export interface ModerationRouterDeps {
  adminDataRepo: AdminDataRepository;
  auditLogRepo: AuditLogRepository;
}
