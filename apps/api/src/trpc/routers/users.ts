import {
  confirmUploadSchema,
  deleteAccountSchema,
  nearbySchema,
  reactivateAccountSchema,
  registerPushTokenSchema,
  submitDateOfBirthSchema,
  updateLocationSchema,
  updateNotificationPrefsSchema,
  updatePreferencesSchema,
} from '@pawmeet/validation';
import { z } from 'zod';
import type { userDeps } from '../../container/index.js';
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '../../lib/storage.js';
import { trackEvent } from '../../lib/track-event.js';
import { gdprExportProtectedProcedure, protectedProcedure, router, unwrapResult } from '../trpc.js';

const uploadAvatarSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES as unknown as [string, ...string[]]),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
});

export function createUsersRouter(deps: typeof userDeps) {
  return router({
    getProfile: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.getProfile(ctx.userId)),
    ),

    updateLocation: protectedProcedure
      .input(updateLocationSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.updateLocation(ctx.userId, input.latitude, input.longitude)),
      ),

    updatePreferences: protectedProcedure
      .input(updatePreferencesSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.updatePreferences(ctx.userId, input.searchRadiusKm)),
      ),

    findNearby: protectedProcedure
      .input(nearbySchema)
      .query(async ({ ctx, input }) => unwrapResult(await deps.findNearby(ctx.userId, input))),

    uploadAvatarUrl: protectedProcedure
      .input(uploadAvatarSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.uploadAvatarUrl(ctx.userId, input.contentType)),
      ),

    confirmAvatar: protectedProcedure
      .input(confirmUploadSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.confirmAvatar(ctx.userId, input.key)),
      ),

    deleteAvatar: protectedProcedure.mutation(async ({ ctx }) =>
      unwrapResult(await deps.deleteAvatar(ctx.userId)),
    ),

    registerPushToken: protectedProcedure
      .input(registerPushTokenSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.registerPushToken(ctx.userId, input.token)),
      ),

    updateNotificationPrefs: protectedProcedure
      .input(updateNotificationPrefsSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.updateNotificationPrefs(ctx.userId, input)),
      ),

    submitDateOfBirth: protectedProcedure
      .input(submitDateOfBirthSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.submitDateOfBirth(ctx.userId, input.dateOfBirth)),
      ),

    deleteAccount: protectedProcedure
      .input(deleteAccountSchema)
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(await deps.deleteAccount(ctx.userId, input.password));
        trackEvent('auth_account_deleted', ctx.userId, {
          accountAgeDays: result.accountAgeDays,
          dogCount: result.dogCount,
          matchCount: result.matchCount,
        });
        return { message: result.message };
      }),

    reactivateAccount: protectedProcedure
      .input(reactivateAccountSchema)
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(await deps.reactivateAccount(ctx.userId, input.password));
        return { message: result.message };
      }),

    completeOnboarding: protectedProcedure.mutation(async ({ ctx }) =>
      unwrapResult(await deps.completeOnboarding(ctx.userId)),
    ),

    exportMyData: gdprExportProtectedProcedure.mutation(async ({ ctx }) =>
      unwrapResult(await deps.requestDataExport(ctx.userId)),
    ),
  });
}
