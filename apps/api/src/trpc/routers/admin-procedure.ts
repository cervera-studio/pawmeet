import { TRPCError } from '@trpc/server';
import type { AdminRoleValue } from '../../lib/admin-permissions.js';
import { protectedProcedure } from '../trpc.js';

/** Admin-only middleware that ensures the caller has an admin role. */
export function createAdminProcedure() {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.adminRole) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }

    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
        adminRole: ctx.adminRole as AdminRoleValue,
      },
    });
  });
}
