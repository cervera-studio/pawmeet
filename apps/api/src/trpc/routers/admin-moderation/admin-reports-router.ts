import { ADMIN_WS_EVENT } from '@pawmeet/types';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../../lib/admin-permissions.js';
import { paginate } from '../../../lib/pagination.js';
import { trackEvent } from '../../../lib/track-event.js';
import { createResolveContentReport } from '../../../use-cases/admin/resolve-content-report.js';
import { sendToAllAdmins } from '../../../ws/admin-ws.js';
import { router, unwrapResult } from '../../trpc.js';
import { createAdminProcedure } from '../admin-procedure.js';
import { maskEmail } from './helpers.js';
import type { ModerationRouterDeps } from './types.js';

const listReportsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'resolved', 'dismissed']).optional(),
});

const resolveReportSchema = z.object({
  id: z.uuid(),
  action: z.enum(['dismiss', 'warn', 'suspend', 'ban']),
});

export function createAdminReportsRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, auditLogRepo } = deps;
  const resolveContentReport = createResolveContentReport({ adminDataRepo });

  return router({
    listReports: adminProcedure.input(listReportsSchema).query(async ({ input }) => {
      const { items, total } = await adminDataRepo.listReports(input);

      const userIds = [...new Set(items.flatMap((r) => [r.reporterId, r.reportedUserId]))];
      const userRows = await adminDataRepo.getReportUserInfos(userIds);
      const userMap = new Map(userRows.map((u) => [u.id, u]));

      return paginate(
        {
          data: items.map((r) => ({
            ...r,
            reporterName: userMap.get(r.reporterId)?.displayName ?? 'Utente sconosciuto',
            reporterEmail: maskEmail(userMap.get(r.reporterId)?.email),
            reportedName: userMap.get(r.reportedUserId)?.displayName ?? 'Utente sconosciuto',
            reportedEmail: maskEmail(userMap.get(r.reportedUserId)?.email),
          })),
          total,
        },
        input,
      );
    }),

    resolveReport: adminProcedure.input(resolveReportSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);

      const result = await resolveContentReport({
        reportId: input.id,
        action: input.action,
        adminId: ctx.userId,
      });
      const data = unwrapResult(result);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: `report.${input.action}`,
        resourceType: RESOURCE_TYPE.report,
        resourceId: input.id,
        changes: { before: { status: 'pending' }, after: { status: data.newStatus } },
      });

      trackEvent('admin_report_resolved', ctx.userId, {
        reportId: input.id,
        action: input.action,
      });

      sendToAllAdmins({
        type: ADMIN_WS_EVENT.MODERATION_ITEM_ACTIONED,
        payload: { queue: 'reports', itemId: input.id, action: input.action, adminId: ctx.userId },
      });

      return { success: true };
    }),
  });
}
