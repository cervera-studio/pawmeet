import { waitlistSubscribers } from '@pawmeet/db';
import { and, count, desc, eq, gte, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../lib/admin-audit.js';
import { requireRole, AdminRole } from '../../lib/admin-permissions.js';
import { db } from '../../lib/db.js';
import { paginate } from '../../lib/pagination.js';
import { trackEvent } from '../../lib/track-event.js';
import type { AuditLogRepository } from '../../ports/audit-log-repository.js';
import { router } from '../trpc.js';
import { createAdminProcedure } from './admin-procedure.js';

interface WaitlistRouterDeps {
  auditLogRepo: AuditLogRepository;
}

export function createAdminWaitlistRouter(deps: WaitlistRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { auditLogRepo } = deps;

  return router({
    listWaitlist: adminProcedure
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
        const conditions = [eq(waitlistSubscribers.unsubscribed, false)];

        if (input.search) {
          conditions.push(ilike(waitlistSubscribers.email, `%${input.search}%`));
        }

        const where = and(...conditions);

        const [items, totalResult] = await Promise.all([
          db
            .select({
              id: waitlistSubscribers.id,
              email: waitlistSubscribers.email,
              locale: waitlistSubscribers.locale,
              subscribedAt: waitlistSubscribers.subscribedAt,
              source: waitlistSubscribers.source,
            })
            .from(waitlistSubscribers)
            .where(where)
            .orderBy(
              input.sortBy === 'email'
                ? input.sortOrder === 'asc'
                  ? waitlistSubscribers.email
                  : desc(waitlistSubscribers.email)
                : input.sortBy === 'locale'
                  ? input.sortOrder === 'asc'
                    ? waitlistSubscribers.locale
                    : desc(waitlistSubscribers.locale)
                  : desc(waitlistSubscribers.subscribedAt),
            )
            .limit(input.pageSize)
            .offset((input.page - 1) * input.pageSize),
          db.select({ count: count() }).from(waitlistSubscribers).where(where),
        ]);

        const total = totalResult[0]?.count ?? 0;

        return paginate(
          {
            data: items.map((item) => ({
              ...item,
              subscribedAt: item.subscribedAt.toISOString(),
            })),
            total,
          },
          input,
        );
      }),

    getWaitlistStats: adminProcedure.query(async () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const activeCondition = eq(waitlistSubscribers.unsubscribed, false);

      const [totalResult, weekResult, monthResult] = await Promise.all([
        db.select({ count: count() }).from(waitlistSubscribers).where(activeCondition),
        db
          .select({ count: count() })
          .from(waitlistSubscribers)
          .where(
            and(activeCondition, gte(waitlistSubscribers.subscribedAt, startOfWeek)),
          ),
        db
          .select({ count: count() })
          .from(waitlistSubscribers)
          .where(
            and(activeCondition, gte(waitlistSubscribers.subscribedAt, startOfMonth)),
          ),
      ]);

      return {
        total: totalResult[0]?.count ?? 0,
        thisWeek: weekResult[0]?.count ?? 0,
        thisMonth: monthResult[0]?.count ?? 0,
      };
    }),

    removeFromWaitlist: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        await db
          .update(waitlistSubscribers)
          .set({ unsubscribed: true, unsubscribedAt: new Date() })
          .where(eq(waitlistSubscribers.id, input.id));

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'waitlist.remove',
          resourceType: RESOURCE_TYPE.user,
          resourceId: input.id,
        });

        trackEvent('admin_waitlist_removed', ctx.userId, {
          waitlistId: input.id,
        });

        return { success: true };
      }),
  });
}
