import { ADMIN_WS_EVENT } from '@pawmeet/types';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../../lib/admin-permissions.js';
import { sendToAllAdmins } from '../../../ws/admin-ws.js';
import { router } from '../../trpc.js';
import { createAdminProcedure } from '../admin-procedure.js';
import type { ModerationRouterDeps } from './types.js';

export function createAdminPhotosRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, auditLogRepo } = deps;

  return router({
    listPendingPhotos: adminProcedure.query(async () => {
      const rows = await adminDataRepo.listPendingPhotos();
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        dogId: r.dogId,
        dogName: r.dogName,
        imageUrl: r.imageUrl,
        type: 'dog' as const,
        uploadedAt: r.uploadedAt.toISOString(),
      }));
    }),

    approvePhoto: adminProcedure
      .input(z.object({ photoId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        const photo = await adminDataRepo.findPhotoById(input.photoId);
        if (!photo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
        }

        await adminDataRepo.updatePhotoModeration(input.photoId, 'approved');

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'photo.approve',
          resourceType: RESOURCE_TYPE.photo,
          resourceId: input.photoId,
          changes: {
            before: { moderationStatus: 'pending' },
            after: { moderationStatus: 'approved' },
          },
        });

        sendToAllAdmins({
          type: ADMIN_WS_EVENT.MODERATION_ITEM_ACTIONED,
          payload: {
            queue: 'photos',
            itemId: input.photoId,
            action: 'approved',
            adminId: ctx.userId,
          },
        });

        return { success: true };
      }),

    rejectPhoto: adminProcedure
      .input(z.object({ photoId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        const photo = await adminDataRepo.findPhotoById(input.photoId);
        if (!photo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
        }

        await adminDataRepo.updatePhotoModeration(input.photoId, 'rejected');

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'photo.reject',
          resourceType: RESOURCE_TYPE.photo,
          resourceId: input.photoId,
          changes: {
            before: { moderationStatus: 'pending' },
            after: { moderationStatus: 'rejected' },
          },
        });

        sendToAllAdmins({
          type: ADMIN_WS_EVENT.MODERATION_ITEM_ACTIONED,
          payload: {
            queue: 'photos',
            itemId: input.photoId,
            action: 'rejected',
            adminId: ctx.userId,
          },
        });

        return { success: true };
      }),

    approveAllPhotos: adminProcedure.mutation(async ({ ctx }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);

      await adminDataRepo.approveAllPendingPhotos();

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'photo.approveAll',
        resourceType: RESOURCE_TYPE.photo,
      });

      sendToAllAdmins({
        type: ADMIN_WS_EVENT.MODERATION_ITEM_ACTIONED,
        payload: { queue: 'photos', itemId: '*', action: 'approved_all', adminId: ctx.userId },
      });

      return { success: true };
    }),
  });
}
