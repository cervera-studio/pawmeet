import { z } from 'zod';
import { paginate } from '../../../lib/pagination.js';
import { router } from '../../trpc.js';
import { createAdminProcedure } from '../admin-procedure.js';
import { maskPhone } from './helpers.js';
import type { ModerationRouterDeps } from './types.js';

export function createAdminSafetyRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo } = deps;

  return router({
    listSosAlerts: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          type: z.enum(['sos', 'auto_alert', 'checkin']).optional(),
        }),
      )
      .query(async ({ input }) => {
        const result = await adminDataRepo.listSosAlerts(input);
        return paginate(result, input);
      }),

    listEmergencyContacts: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
        }),
      )
      .query(async ({ input }) => {
        const result = await adminDataRepo.listEmergencyContacts(input);
        return paginate(
          {
            data: result.data.map((item) => ({
              ...item,
              phone: maskPhone(item.phone),
            })),
            total: result.total,
          },
          input,
        );
      }),
  });
}
