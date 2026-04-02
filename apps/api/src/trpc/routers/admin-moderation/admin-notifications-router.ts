import { pushNotificationDataSchema } from '@pawmeet/validation';
import { z } from 'zod';
import { enqueueNotification } from '../../../jobs/queues/index.js';
import { logAdminAction, RESOURCE_TYPE } from '../../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../../lib/admin-permissions.js';
import { router } from '../../trpc.js';
import { createAdminProcedure } from '../admin-procedure.js';
import type { ModerationRouterDeps } from './types.js';

export function createAdminNotificationsRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, auditLogRepo } = deps;

  return router({
    sendBroadcastNotification: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(100),
          body: z.string().min(1).max(500),
          data: pushNotificationDataSchema.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const activeUsersWithToken = await adminDataRepo.getActiveUsersWithPushToken();

        const BATCH_SIZE = 100;
        for (let i = 0; i < activeUsersWithToken.length; i += BATCH_SIZE) {
          const batch = activeUsersWithToken.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map((user) =>
              enqueueNotification({
                userId: user.id,
                title: input.title,
                body: input.body,
                data: input.data,
              }),
            ),
          );
        }

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'send_broadcast',
          resourceType: RESOURCE_TYPE.notification,
          changes: {
            after: {
              title: input.title,
              body: input.body,
              sentCount: activeUsersWithToken.length,
            },
          },
        });

        return { sentCount: activeUsersWithToken.length };
      }),

    sendTargetedNotification: adminProcedure
      .input(
        z.object({
          userIds: z.array(z.uuid()).min(1).max(100),
          title: z.string().min(1).max(100),
          body: z.string().min(1).max(500),
          data: pushNotificationDataSchema.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const targetUsers = await adminDataRepo.getTargetedUsers(input.userIds);

        const usersWithToken = targetUsers.filter((u) => u.pushToken != null);
        const skippedCount = input.userIds.length - usersWithToken.length;

        await Promise.all(
          usersWithToken.map((user) =>
            enqueueNotification({
              userId: user.id,
              title: input.title,
              body: input.body,
              data: input.data,
            }),
          ),
        );

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'send_targeted',
          resourceType: RESOURCE_TYPE.notification,
          changes: {
            after: {
              title: input.title,
              body: input.body,
              targetUserIds: input.userIds,
              sentCount: usersWithToken.length,
              skippedCount,
            },
          },
        });

        return { sentCount: usersWithToken.length, skippedCount };
      }),

    getNotificationStats: adminProcedure.query(async ({ ctx }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);
      return adminDataRepo.getNotificationStats();
    }),
  });
}
