import {
  addOrganizationMemberSchema,
  createOrganizationSchema,
  getOrganizationSchema,
  listOrganizationsSchema,
  removeOrganizationMemberSchema,
  verifyOrganizationSchema,
} from '@pawmeet/validation';
import { TRPCError } from '@trpc/server';
import type { organizationDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

function createAdminGuard() {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.adminRole) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }
    return next({ ctx: { ...ctx, userId: ctx.userId, adminRole: ctx.adminRole } });
  });
}

export function createOrganizationsRouter(deps: typeof organizationDeps) {
  const adminProcedure = createAdminGuard();

  return router({
    create: adminProcedure
      .input(createOrganizationSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.createOrganization(ctx.userId, input)),
      ),

    verify: adminProcedure
      .input(verifyOrganizationSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.verifyOrganization(ctx.userId, input.organizationId)),
      ),

    revoke: adminProcedure
      .input(verifyOrganizationSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.revokeOrganization(input.organizationId))),

    get: protectedProcedure
      .input(getOrganizationSchema)
      .query(async ({ input }) => unwrapResult(await deps.getOrganization(input.id))),

    list: protectedProcedure
      .input(listOrganizationsSchema)
      .query(async ({ input }) => unwrapResult(await deps.listOrganizations(input))),

    addMember: protectedProcedure
      .input(addOrganizationMemberSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.addOrganizationMember(ctx.userId, input)),
      ),

    removeMember: protectedProcedure
      .input(removeOrganizationMemberSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.removeOrganizationMember(ctx.userId, input)),
      ),

    listMembers: protectedProcedure
      .input(getOrganizationSchema)
      .query(async ({ input }) => unwrapResult(await deps.listOrganizationMembers(input.id))),
  });
}
