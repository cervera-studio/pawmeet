import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../../lib/admin-permissions.js';
import { createAddEventSponsor } from '../../../use-cases/admin/add-event-sponsor.js';
import { router, unwrapResult } from '../../trpc.js';
import { createAdminProcedure } from '../admin-procedure.js';
import type { ModerationRouterDeps } from './types.js';

const addSponsorSchema = z.object({
  eventId: z.uuid(),
  organizationId: z.uuid(),
  tier: z.enum(['title', 'gold', 'silver', 'partner']),
  logoPlacement: z.enum(['header', 'footer', 'banner']).default('footer'),
});

const removeSponsorSchema = z.object({
  eventId: z.uuid(),
  organizationId: z.uuid(),
});

const listEventSponsorsSchema = z.object({
  eventId: z.uuid(),
});

export function createAdminSponsorsRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, auditLogRepo } = deps;
  const addEventSponsor = createAddEventSponsor({ adminDataRepo });

  return router({
    listEventSponsors: adminProcedure.input(listEventSponsorsSchema).query(async ({ input }) => {
      const sponsors = await adminDataRepo.listEventSponsors(input.eventId);
      return { data: sponsors };
    }),

    addEventSponsor: adminProcedure.input(addSponsorSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const result = await addEventSponsor(input);
      const sponsor = unwrapResult(result);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'sponsor.add',
        resourceType: RESOURCE_TYPE.sponsor,
        resourceId: input.eventId,
        changes: { after: { organizationId: input.organizationId, tier: input.tier } },
      });

      return sponsor;
    }),

    removeEventSponsor: adminProcedure
      .input(removeSponsorSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const existing = await adminDataRepo.findEventSponsor(input.eventId, input.organizationId);
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Sponsor not found for this event' });
        }

        await adminDataRepo.removeEventSponsor(input.eventId, input.organizationId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'sponsor.remove',
          resourceType: RESOURCE_TYPE.sponsor,
          resourceId: input.eventId,
          changes: { before: { organizationId: input.organizationId } },
        });

        return { success: true };
      }),
  });
}
