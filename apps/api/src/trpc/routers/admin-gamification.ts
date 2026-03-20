import { CHALLENGE_TYPE } from '@pawmeet/config';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../lib/admin-permissions.js';
import { paginate } from '../../lib/pagination.js';
import { trackEvent } from '../../lib/track-event.js';
import type { AuditLogRepository } from '../../ports/audit-log-repository.js';
import type { GamificationRepository } from '../../ports/gamification-repository.js';
import { router } from '../trpc.js';
import { createAdminProcedure } from './admin-procedure.js';

interface GamificationRouterDeps {
  auditLogRepo: AuditLogRepository;
  gamificationRepo?: GamificationRepository;
}

export function createAdminGamificationRouter(deps: GamificationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { auditLogRepo, gamificationRepo } = deps;

  return router({
    listChallenges: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        }),
      )
      .query(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        if (!gamificationRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Gamification repository not configured',
          });
        }

        const offset = (input.page - 1) * input.pageSize;
        const result = await gamificationRepo.listAllChallenges(input.pageSize, offset);

        return paginate(result, input);
      }),

    createChallenge: adminProcedure
      .input(
        z.object({
          type: z.enum([
            CHALLENGE_TYPE.WALK_COUNT,
            CHALLENGE_TYPE.WALK_DISTANCE_KM,
            CHALLENGE_TYPE.NEW_MATCHES,
            CHALLENGE_TYPE.GROUP_EVENTS_JOINED,
          ]),
          title: z.string().min(1).max(200),
          description: z.string().min(1).max(1000),
          targetValue: z.number().int().positive(),
          xpReward: z.number().int().positive(),
          startsAt: z.string().datetime(),
          endsAt: z.string().datetime(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        if (!gamificationRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Gamification repository not configured',
          });
        }

        const startsAt = new Date(input.startsAt);
        const endsAt = new Date(input.endsAt);

        if (startsAt >= endsAt) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Start date must be before end date',
          });
        }

        const challenge = await gamificationRepo.createChallenge({
          type: input.type,
          title: input.title,
          description: input.description,
          targetValue: input.targetValue,
          xpReward: input.xpReward,
          startsAt,
          endsAt,
        });

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'challenge.create',
          resourceType: RESOURCE_TYPE.challenge,
          resourceId: challenge.id,
          changes: {
            after: {
              type: input.type,
              title: input.title,
              targetValue: input.targetValue,
              xpReward: input.xpReward,
            },
          },
        });

        trackEvent('admin_challenge_created', ctx.userId, {
          challengeId: challenge.id,
          type: input.type,
        });

        return challenge;
      }),

    updateChallenge: adminProcedure
      .input(
        z.object({
          challengeId: z.string().uuid(),
          title: z.string().min(1).max(200).optional(),
          description: z.string().min(1).max(1000).optional(),
          targetValue: z.number().int().positive().optional(),
          xpReward: z.number().int().positive().optional(),
          startsAt: z.string().datetime().optional(),
          endsAt: z.string().datetime().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        if (!gamificationRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Gamification repository not configured',
          });
        }

        const { challengeId, ...data } = input;

        const updateData: {
          title?: string;
          description?: string;
          targetValue?: number;
          xpReward?: number;
          startsAt?: Date;
          endsAt?: Date;
        } = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
        if (data.xpReward !== undefined) updateData.xpReward = data.xpReward;
        if (data.startsAt !== undefined) updateData.startsAt = new Date(data.startsAt);
        if (data.endsAt !== undefined) updateData.endsAt = new Date(data.endsAt);

        if (updateData.startsAt && updateData.endsAt && updateData.startsAt >= updateData.endsAt) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Start date must be before end date',
          });
        }

        const challenge = await gamificationRepo.updateChallenge(challengeId, updateData);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'challenge.update',
          resourceType: RESOURCE_TYPE.challenge,
          resourceId: challengeId,
          changes: { after: data },
        });

        trackEvent('admin_challenge_updated', ctx.userId, {
          challengeId,
        });

        return challenge;
      }),

    deleteChallenge: adminProcedure
      .input(z.object({ challengeId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Admin);

        if (!gamificationRepo) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Gamification repository not configured',
          });
        }

        await gamificationRepo.deleteChallenge(input.challengeId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'challenge.delete',
          resourceType: RESOURCE_TYPE.challenge,
          resourceId: input.challengeId,
        });

        return { success: true };
      }),

    getFitnessStats: adminProcedure.query(async ({ ctx }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);

      if (!gamificationRepo) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Gamification repository not configured',
        });
      }

      return gamificationRepo.getAggregateFitnessStats();
    }),
  });
}
