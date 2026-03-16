import { experimentMetricsSnapshots, modelPerformanceDaily } from '@pawmeet/db';
import { TRPCError } from '@trpc/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../lib/admin-permissions.js';
import { redis } from '../../lib/redis.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, router } from '../trpc.js';

// ── Admin middleware ────────────────────────────────────────────────────────────

function createAdminProcedure(_db: NeonHttpDatabase) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.adminRole) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }

    return next({ ctx: { ...ctx, userId: ctx.userId, adminRole: ctx.adminRole } });
  });
}

// ── Input schemas ───────────────────────────────────────────────────────────────

const getExperimentMetricsSchema = z.object({
  experimentName: z.string(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

const getModelPerformanceSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

const updateFeatureFlagSchema = z.object({
  name: z.string(),
  enabled: z.boolean().optional(),
  splitPercent: z.number().min(0).max(100).optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────────────────

const EXPERIMENT_KEY_PREFIX = 'experiment:';

export interface ExperimentConfig {
  name: string;
  enabled: boolean;
  splitPercent: number;
}

// ── Router ──────────────────────────────────────────────────────────────────────

export function createAdminAiMatchingRouter(db: NeonHttpDatabase) {
  const adminProcedure = createAdminProcedure(db);

  return router({
    // ── Experiment metrics ─────────────────────────────────────────────────────
    getExperimentMetrics: adminProcedure
      .input(getExperimentMetricsSchema)
      .query(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Viewer);

        const conditions = [eq(experimentMetricsSnapshots.experimentName, input.experimentName)];

        if (input.dateFrom) {
          conditions.push(gte(experimentMetricsSnapshots.snapshotDate, new Date(input.dateFrom)));
        }
        if (input.dateTo) {
          conditions.push(lte(experimentMetricsSnapshots.snapshotDate, new Date(input.dateTo)));
        }

        const rows = await db
          .select()
          .from(experimentMetricsSnapshots)
          .where(and(...conditions))
          .orderBy(asc(experimentMetricsSnapshots.snapshotDate));

        // Group by variant for per-variant aggregates
        const variantMap = new Map<
          string,
          {
            variant: string;
            totalUsers: number;
            totalDiscoveries: number;
            totalLikes: number;
            totalMatches: number;
            totalWalksCompleted: number;
            totalMessages: number;
            avgCompatibilityScore: number | null;
            avgMatchRate: number | null;
          }
        >();

        for (const row of rows) {
          const existing = variantMap.get(row.variant);
          if (!existing) {
            variantMap.set(row.variant, {
              variant: row.variant,
              totalUsers: row.userCount,
              totalDiscoveries: row.totalDiscoveries,
              totalLikes: row.totalLikes,
              totalMatches: row.totalMatches,
              totalWalksCompleted: row.totalWalksCompleted,
              totalMessages: row.totalMessages,
              avgCompatibilityScore: row.avgCompatibilityScore,
              avgMatchRate: row.avgMatchRate,
            });
          } else {
            existing.totalUsers += row.userCount;
            existing.totalDiscoveries += row.totalDiscoveries;
            existing.totalLikes += row.totalLikes;
            existing.totalMatches += row.totalMatches;
            existing.totalWalksCompleted += row.totalWalksCompleted;
            existing.totalMessages += row.totalMessages;
          }
        }

        // Time series: all rows ordered by date
        const timeSeries = rows.map((row) => ({
          date: row.snapshotDate.toISOString(),
          variant: row.variant,
          userCount: row.userCount,
          totalDiscoveries: row.totalDiscoveries,
          totalLikes: row.totalLikes,
          totalMatches: row.totalMatches,
          totalWalksCompleted: row.totalWalksCompleted,
          totalMessages: row.totalMessages,
          avgCompatibilityScore: row.avgCompatibilityScore,
          avgMatchRate: row.avgMatchRate,
          retainedD7: row.retainedD7,
        }));

        return {
          variants: [...variantMap.values()],
          timeSeries,
        };
      }),

    // ── Model performance ─────────────────────────────────────────────────────
    getModelPerformance: adminProcedure
      .input(getModelPerformanceSchema)
      .query(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Viewer);

        const conditions = [];

        if (input.dateFrom) {
          conditions.push(gte(modelPerformanceDaily.snapshotDate, new Date(input.dateFrom)));
        }
        if (input.dateTo) {
          conditions.push(lte(modelPerformanceDaily.snapshotDate, new Date(input.dateTo)));
        }

        const rows = await db
          .select()
          .from(modelPerformanceDaily)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(modelPerformanceDaily.snapshotDate));

        // Overview KPIs from the latest row
        const latest = rows.at(-1);

        const overview = latest
          ? {
              totalPredictions: latest.totalPredictions,
              totalMatches: latest.totalMatches,
              avgOverallScore: latest.avgOverallScore,
            }
          : null;

        const timeSeries = rows.map((row) => ({
          date: row.snapshotDate.toISOString(),
          totalPredictions: row.totalPredictions,
          totalMatches: row.totalMatches,
          avgOverallScore: row.avgOverallScore,
        }));

        return {
          overview,
          scoreBuckets: (latest?.scoreBuckets as Record<string, number>) ?? null,
          weightDistribution: (latest?.weightDistribution as Record<string, number>) ?? null,
          timeSeries,
        };
      }),

    // ── Feature flags (experiments in Redis) ──────────────────────────────────
    listFeatureFlags: adminProcedure.query(async ({ ctx }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const keys = await redis.keys(`${EXPERIMENT_KEY_PREFIX}*`);

      if (keys.length === 0) {
        return { flags: [] };
      }

      const flags: ExperimentConfig[] = [];

      for (const key of keys) {
        const raw = await redis.get<ExperimentConfig>(key);
        if (raw) {
          flags.push({
            name: raw.name ?? key.replace(EXPERIMENT_KEY_PREFIX, ''),
            enabled: raw.enabled ?? false,
            splitPercent: raw.splitPercent ?? 50,
          });
        }
      }

      return { flags };
    }),

    // ── Update feature flag ───────────────────────────────────────────────────
    updateFeatureFlag: adminProcedure
      .input(updateFeatureFlagSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.SuperAdmin);

        const key = `${EXPERIMENT_KEY_PREFIX}${input.name}`;
        const existing = await redis.get<ExperimentConfig>(key);

        const updated: ExperimentConfig = {
          name: input.name,
          enabled: input.enabled ?? existing?.enabled ?? false,
          splitPercent: input.splitPercent ?? existing?.splitPercent ?? 50,
        };

        await redis.set(key, updated);

        void logAdminAction(db, {
          adminId: ctx.userId,
          action: 'featureFlag.update',
          resourceType: RESOURCE_TYPE.settings,
          resourceId: input.name,
          changes: {
            before: existing
              ? { enabled: existing.enabled, splitPercent: existing.splitPercent }
              : undefined,
            after: { enabled: updated.enabled, splitPercent: updated.splitPercent },
          },
        });

        trackEvent('admin_feature_flag_updated', ctx.userId, {
          flagName: input.name,
          enabled: updated.enabled,
          splitPercent: updated.splitPercent,
        });

        return { success: true };
      }),
  });
}
