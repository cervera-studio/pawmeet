import { z } from 'zod';
import { paginate } from '../../lib/pagination.js';
import { getDauCount, getDauTimeSeries } from '../../middleware/analytics-counters.js';
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
}

export function createAdminDashboardRouter(deps: DashboardRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo } = deps;

  return router({
    getStats: adminProcedure.query(async () => {
      return adminDataRepo.getStats();
    }),

    getAnalyticsKpis: adminProcedure.query(async () => {
      const [dauToday, dauTimeSeries, domainMetrics] = await Promise.all([
        getDauCount(new Date().toISOString().slice(0, 10)),
        getDauTimeSeries(30),
        adminDataRepo.getTodayDomainMetrics(),
      ]);

      return {
        dauToday,
        registrationsToday: domainMetrics.registrationsToday,
        matchesToday: domainMetrics.matchesToday,
        dauTimeSeries,
      };
    }),

    listAuditLog: adminProcedure.input(listAuditLogSchema).query(async ({ input }) => {
      const result = await adminDataRepo.listAuditLog(input);
      return paginate(result, input);
    }),
  });
}
