import {
  passkeyDeleteSchema,
  passkeyLoginOptionsSchema,
  passkeyLoginVerifySchema,
  passkeyRegisterOptionsSchema,
  passkeyRegisterVerifySchema,
} from '@pawmeet/validation';
import type { passkeyDeps } from '../../container/index.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, rateLimitedPublicProcedure, router, unwrapResult } from '../trpc.js';

export function createPasskeyRouter(deps: typeof passkeyDeps) {
  return router({
    registerOptions: protectedProcedure
      .input(passkeyRegisterOptionsSchema)
      .mutation(async ({ ctx }) => unwrapResult(await deps.registerOptions(ctx.userId as string))),

    registerVerify: protectedProcedure
      .input(passkeyRegisterVerifySchema)
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.userId as string;
        const result = unwrapResult(await deps.registerVerify(userId, input));
        trackEvent('passkey_registered', userId, {});
        return result;
      }),

    loginOptions: rateLimitedPublicProcedure
      .input(passkeyLoginOptionsSchema)
      .mutation(async ({ input }) => unwrapResult(await deps.loginOptions(input.email))),

    loginVerify: rateLimitedPublicProcedure
      .input(passkeyLoginVerifySchema)
      .mutation(async ({ input }) => {
        const result = unwrapResult(await deps.loginVerify(input.response));
        trackEvent('auth_login_completed', result.user.id, { method: 'passkey' });
        return result;
      }),

    list: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.list(ctx.userId as string)),
    ),

    delete: protectedProcedure.input(passkeyDeleteSchema).mutation(async ({ ctx, input }) => {
      const userId = ctx.userId as string;
      const result = unwrapResult(await deps.delete(userId, input.id));
      trackEvent('passkey_deleted', userId, {});
      return result;
    }),
  });
}
