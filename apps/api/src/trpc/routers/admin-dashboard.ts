import { z } from 'zod';
import type { PostHogQueryService } from '../../infra/posthog-query-service.js';
import { paginate } from '../../lib/pagination.js';
import type {
  AdminAuditLogRepository,
  AdminDashboardRepository,
} from '../../ports/admin-data-repository.js';
import type { AuditLogRepository } from '../../ports/audit-log-repository.js';
import { router } from '../trpc.js';
import { createAdminProcedure } from './admin-procedure.js';

const listAuditLogSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  adminId: z.uuid().optional(),
  resourceType: z.string().optional(),
  action: z.string().optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  search: z.string().optional(),
});

interface DashboardRouterDeps {
  adminDataRepo: AdminDashboardRepository & AdminAuditLogRepository;
  auditLogRepo: AuditLogRepository;
  posthogQueryService?: PostHogQueryService;
}

export function createAdminDashboardRouter(deps: DashboardRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, posthogQueryService } = deps;

  return router({
    getStats: adminProcedure.query(async () => {
      return adminDataRepo.getStats();
    }),

    getAnalyticsKpis: adminProcedure.query(async () => {
      const [posthogMetrics, domainMetrics] = await Promise.all([
        posthogQueryService?.getDauMauMetrics(30) ??
          { dauToday: 0, mauCurrent: 0, dauTimeSeries: [] },
        adminDataRepo.getTodayDomainMetrics(),
      ]);

      return {
        dauToday: posthogMetrics.dauToday,
        mauCurrent: posthogMetrics.mauCurrent,
        registrationsToday: domainMetrics.registrationsToday,
        matchesToday: domainMetrics.matchesToday,
        dauTimeSeries: posthogMetrics.dauTimeSeries,
      };
    }),

    listAuditLog: adminProcedure.input(listAuditLogSchema).query(async ({ input }) => {
      const result = await adminDataRepo.listAuditLog(input);
      return paginate(result, input);
    }),
  });
}
