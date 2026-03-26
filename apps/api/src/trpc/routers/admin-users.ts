import { TRPCError } from '@trpc/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { enqueueGdprExport } from '../../jobs/queue.js';
import { logAdminAction, RESOURCE_TYPE } from '../../lib/admin-audit.js';
import { AdminRole, hasMinRole, requireRole } from '../../lib/admin-permissions.js';
import { generateImpersonationToken } from '../../lib/jwt.js';
import { paginate } from '../../lib/pagination.js';
import { trackEvent } from '../../lib/track-event.js';
import type {
  AdminSettingsRepository,
  AdminUserRepository,
} from '../../ports/admin-data-repository.js';
import type { AdminNotificationService } from '../../ports/admin-notification-service.js';
import type { AuditLogRepository } from '../../ports/audit-log-repository.js';
import type { GdprExportRepository } from '../../ports/gdpr-export-repository.js';
import type { TokenRepository } from '../../ports/token-repository.js';
import { createCreateAdminUser } from '../../use-cases/admin/create-admin-user.js';
import { createUpdateAdminRole } from '../../use-cases/admin/update-admin-role.js';
import { router, unwrapResult } from '../trpc.js';
import { createAdminProcedure } from './admin-procedure.js';

/** Mask an email address: `user@example.com` -> `u***@example.com` */
function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!(local && domain)) return '***';
  return `${local[0]}***@${domain}`;
}

const adminRoleEnum = z.enum(['viewer', 'moderator', 'admin', 'super_admin']);

const createAdminUserSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase().trim()),
  displayName: z.string().min(1).max(100),
  role: adminRoleEnum,
  temporaryPassword: z.string().min(8),
});

const updateAdminRoleSchema = z.object({
  adminId: z.uuid(),
  newRole: adminRoleEnum,
});

const toggleAdminActiveSchema = z.object({
  adminId: z.uuid(),
});

const resetAdminPasswordSchema = z.object({
  adminId: z.uuid(),
  newPassword: z.string().min(8),
});

const listAdminUsersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: adminRoleEnum.optional(),
});

interface UsersRouterDeps {
  adminDataRepo: AdminUserRepository & AdminSettingsRepository;
  adminNotificationService: AdminNotificationService;
  auditLogRepo: AuditLogRepository;
  gdprExportRepo?: GdprExportRepository;
  tokenRepo?: TokenRepository;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: tRPC router groups related procedures
export function createAdminUsersRouter(deps: UsersRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, adminNotificationService, auditLogRepo, gdprExportRepo, tokenRepo } = deps;
  const createAdminUserUc = createCreateAdminUser({ adminDataRepo });
  const updateAdminRoleUc = createUpdateAdminRole({ adminDataRepo });

  return router({
    listUsers: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
          sortBy: z.string().optional(),
          sortOrder: z.enum(['asc', 'desc']).optional(),
        }),
      )
      .query(async ({ input }) => {
        const { items, total, dogCounts } = await adminDataRepo.listUsers(input);

        const dogCountMap = new Map(dogCounts.map((d) => [d.ownerId, d.count]));

        return paginate(
          {
            data: items.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              status: u.isActive ? 'active' : 'suspended',
              dogsCount: dogCountMap.get(u.id) ?? 0,
              followersCount: u.followersCount,
              followingCount: u.followingCount,
              createdAt: u.createdAt,
            })),
            total,
          },
          input,
        );
      }),

    getUser: adminProcedure.input(z.object({ id: z.uuid() })).query(async ({ input }) => {
      const result = await adminDataRepo.getUser(input.id);
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const { user, dogs, passkeys, reportsCount, matchesCount } = result;

      return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        status: user.isActive ? ('active' as const) : ('suspended' as const),
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        dogs,
        passkeys,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        reportsReceived: reportsCount,
        matchesCount,
      };
    }),

    getUserConsents: adminProcedure
      .input(z.object({ userId: z.uuid() }))
      .query(async ({ input }) => {
        return adminDataRepo.getUserConsents(input.userId);
      }),

    suspendUser: adminProcedure
      .input(z.object({ userId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const user = await adminDataRepo.findUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        await adminDataRepo.setUserActive(input.userId, false);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'user.suspend',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
          changes: { before: { isActive: true }, after: { isActive: false } },
        });

        trackEvent('admin_user_suspended', ctx.userId, { targetUserId: input.userId });

        return { success: true };
      }),

    banUser: adminProcedure
      .input(z.object({ userId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const user = await adminDataRepo.findUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        await adminDataRepo.setUserActive(input.userId, false);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'user.ban',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
          changes: { before: { isActive: true }, after: { isActive: false } },
        });

        trackEvent('admin_user_banned', ctx.userId, { targetUserId: input.userId });

        return { success: true };
      }),

    reactivateUser: adminProcedure
      .input(z.object({ userId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const user = await adminDataRepo.findUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        await adminDataRepo.setUserActive(input.userId, true);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'user.reactivate',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
          changes: { before: { isActive: false }, after: { isActive: true } },
        });

        trackEvent('admin_user_reactivated', ctx.userId, { targetUserId: input.userId });

        return { success: true };
      }),

    requestGdprExport: adminProcedure
      .input(z.object({ userId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        if (!gdprExportRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'GDPR export repository not configured',
          });
        }

        const userData = await adminDataRepo.getUser(input.userId);
        if (!userData) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        const pending = await gdprExportRepo.findPendingExport(input.userId);
        if (pending) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An export is already in progress for this user',
          });
        }

        const exportRecord = await gdprExportRepo.createExport(input.userId);

        await enqueueGdprExport({
          userId: input.userId,
          email: userData.user.email ?? '',
          displayName: userData.user.displayName ?? '',
          exportId: exportRecord.id,
        });

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'user.gdpr_export',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
        });

        trackEvent('admin_gdpr_export_requested', ctx.userId, {
          targetUserId: input.userId,
        });

        return { success: true };
      }),

    listPendingDeletions: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        }),
      )
      .query(async ({ input }) => {
        const result = await adminDataRepo.listPendingDeletions(input);
        return paginate(
          {
            data: result.data.map((u) => ({
              id: u.id,
              displayName: u.displayName,
              email: maskEmail(u.email),
              createdAt: u.createdAt,
              deletionScheduledAt: u.deletionScheduledAt,
              daysRemaining: u.deletionScheduledAt
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(u.deletionScheduledAt).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                    ),
                  )
                : 0,
            })),
            total: result.total,
          },
          input,
        );
      }),

    cancelDeletion: adminProcedure
      .input(z.object({ userId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const user = await adminDataRepo.findUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        await adminDataRepo.cancelDeletion(input.userId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'deletion.cancel',
          resourceType: RESOURCE_TYPE.deletion,
          resourceId: input.userId,
        });

        return { success: true };
      }),

    // ── Admin user management ─────────────────────────────────────────────────

    listAdminUsers: adminProcedure.input(listAdminUsersSchema).query(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const result = await adminDataRepo.listAdminUsers(input);
      return paginate(result, input);
    }),

    createAdminUser: adminProcedure
      .input(createAdminUserSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.SuperAdmin);

        const result = await createAdminUserUc({
          email: input.email,
          displayName: input.displayName,
          role: input.role,
          temporaryPassword: input.temporaryPassword,
          callerRole: ctx.adminRole,
        });
        const created = unwrapResult(result);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'create_admin',
          resourceType: RESOURCE_TYPE.admin,
          resourceId: created.id,
          changes: {
            after: {
              email: input.email,
              displayName: input.displayName,
              role: input.role,
            },
          },
        });

        // Fire-and-forget: send invite email with temporary password
        void adminNotificationService.sendAdminInvite(input.email, input.temporaryPassword);

        return created;
      }),

    updateAdminRole: adminProcedure
      .input(updateAdminRoleSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.SuperAdmin);

        const result = await updateAdminRoleUc({
          adminId: input.adminId,
          newRole: input.newRole,
          callerUserId: ctx.userId,
          callerRole: ctx.adminRole,
        });
        const updated = unwrapResult(result);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'update_admin_role',
          resourceType: RESOURCE_TYPE.admin,
          resourceId: input.adminId,
          changes: {
            before: { role: updated.previousRole },
            after: { role: input.newRole },
          },
        });

        return {
          id: updated.id,
          email: updated.email,
          displayName: updated.displayName,
          role: updated.role,
        };
      }),

    toggleAdminActive: adminProcedure
      .input(toggleAdminActiveSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.SuperAdmin);

        if (input.adminId === ctx.userId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot deactivate yourself',
          });
        }

        const target = await adminDataRepo.findAdminUserById(input.adminId);
        if (!target) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin user not found' });
        }

        if (target.role === AdminRole.SuperAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot deactivate a super admin',
          });
        }

        const newStatus = !target.isActive;

        const updated = await adminDataRepo.toggleAdminActive(input.adminId, newStatus);
        if (!updated) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin user not found' });
        }

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: newStatus ? 'activate_admin' : 'deactivate_admin',
          resourceType: RESOURCE_TYPE.admin,
          resourceId: input.adminId,
          changes: {
            before: { isActive: target.isActive },
            after: { isActive: newStatus },
          },
        });

        return updated;
      }),

    resetAdminPassword: adminProcedure
      .input(resetAdminPasswordSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.SuperAdmin);

        if (input.adminId === ctx.userId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot reset your own password here, use profile settings',
          });
        }

        const target = await adminDataRepo.findAdminUserById(input.adminId);
        if (!target) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin user not found' });
        }

        if (hasMinRole(target.role, ctx.adminRole)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot reset password for a user with equal or higher role',
          });
        }

        const passwordHash = await hash(input.newPassword, 12);
        await adminDataRepo.updateAdminPassword(input.adminId, passwordHash);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'reset_admin_password',
          resourceType: RESOURCE_TYPE.admin,
          resourceId: input.adminId,
        });

        return { success: true };
      }),

    // ── User session management ───────────────────────────────────────────────

    getUserSessions: adminProcedure
      .input(z.object({ userId: z.uuid() }))
      .query(async ({ input }) => {
        if (!tokenRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Token repository not configured',
          });
        }

        const sessions = await tokenRepo.findActiveSessionsByUserId(input.userId);

        return sessions.map((s) => ({
          id: s.id,
          deviceName: s.deviceName,
          deviceOs: s.deviceOs,
          createdAt: s.createdAt,
        }));
      }),

    revokeUserSession: adminProcedure
      .input(z.object({ userId: z.uuid(), sessionId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        if (!tokenRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Token repository not configured',
          });
        }

        const sessions = await tokenRepo.findActiveSessionsByUserId(input.userId);
        const target = sessions.find((s) => s.id === input.sessionId);

        if (!target) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        }

        await tokenRepo.revokeTokenFamily(target.familyId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'user.revoke_session',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
          changes: {
            after: {
              revokedSessionId: input.sessionId,
              deviceName: target.deviceName,
            },
          },
        });

        trackEvent('admin_user_session_revoked', ctx.userId, {
          targetUserId: input.userId,
          sessionId: input.sessionId,
        });

        return { success: true };
      }),

    revokeAllUserSessions: adminProcedure
      .input(z.object({ userId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        if (!tokenRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Token repository not configured',
          });
        }

        await tokenRepo.revokeAllUserRefreshTokens(input.userId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'user.revoke_all_sessions',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
        });

        trackEvent('admin_user_all_sessions_revoked', ctx.userId, {
          targetUserId: input.userId,
        });

        return { success: true };
      }),

    impersonateUser: adminProcedure
      .input(z.object({ userId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        const user = await adminDataRepo.findUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        if (!user.isActive) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot impersonate an inactive user',
          });
        }

        const token = await generateImpersonationToken(input.userId, ctx.userId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'user.impersonate',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.userId,
        });

        trackEvent('admin_user_impersonated', ctx.userId, {
          targetUserId: input.userId,
        });

        return { token, expiresIn: '30m' };
      }),
  });
}
