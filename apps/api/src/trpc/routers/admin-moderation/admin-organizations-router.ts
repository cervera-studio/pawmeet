import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../../lib/admin-permissions.js';
import { paginate } from '../../../lib/pagination.js';
import { router } from '../../trpc.js';
import { createAdminProcedure } from '../admin-procedure.js';
import type { ModerationRouterDeps } from './types.js';

export function createAdminOrganizationsRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, auditLogRepo } = deps;

  return router({
    listOrganizations: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
          type: z.enum(['pawmeet_team', 'association', 'educator', 'brand']).optional(),
        }),
      )
      .query(async ({ input }) => {
        const { items, total, memberCounts } = await adminDataRepo.listOrganizations(input);

        const memberCountMap = new Map(memberCounts.map((m) => [m.organizationId, m.count]));

        return paginate(
          {
            data: items.map((o) => ({
              ...o,
              memberCount: memberCountMap.get(o.id) ?? 0,
            })),
            total,
          },
          input,
        );
      }),

    getOrganization: adminProcedure.input(z.object({ id: z.uuid() })).query(async ({ input }) => {
      const result = await adminDataRepo.getOrganization(input.id);
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }
      return { ...result.organization, members: result.members };
    }),

    verifyOrganization: adminProcedure
      .input(z.object({ organizationId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const org = await adminDataRepo.findOrganizationById(input.organizationId);
        if (!org) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }

        await adminDataRepo.verifyOrganization(input.organizationId, ctx.userId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'organization.verify',
          resourceType: RESOURCE_TYPE.organization,
          resourceId: input.organizationId,
        });

        return { success: true };
      }),

    revokeOrganization: adminProcedure
      .input(z.object({ organizationId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const org = await adminDataRepo.findOrganizationById(input.organizationId);
        if (!org) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }

        await adminDataRepo.revokeOrganization(input.organizationId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'organization.revoke',
          resourceType: RESOURCE_TYPE.organization,
          resourceId: input.organizationId,
        });

        return { success: true };
      }),
  });
}
