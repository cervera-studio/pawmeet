import { updateConsentSchema } from '@dogwalk/validation';
import type { consentDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createConsentRouter(deps: typeof consentDeps) {
  return router({
    update: protectedProcedure
      .input(updateConsentSchema)
      .mutation(async ({ input, ctx }) =>
        unwrapResult(
          await deps.updateConsents(ctx.userId, input, ctx.clientIp, null, 'mobile_settings'),
        ),
      ),

    list: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.getConsents(ctx.userId)),
    ),
  });
}
