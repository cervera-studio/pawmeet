import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../lib/admin-permissions.js';
import { redis } from '../../lib/redis.js';
import { trackEvent } from '../../lib/track-event.js';
import type { AdminAiMatchingRepository } from '../../ports/admin-ai-matching-repository.js';
import type { AuditLogRepository } from '../../ports/audit-log-repository.js';
import { protectedProcedure, router } from '../trpc.js';

// ── Admin middleware ────────────────────────────────────────────────────────────

function createAdminProcedure() {
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

const promoteModelSchema = z.object({
  version: z.string(),
});

// ── Helpers ─────────────────────────────────────────────────────────────────────

const EXPERIMENT_KEY_PREFIX = 'experiment:';

export interface ExperimentConfig {
  name: string;
  enabled: boolean;
  splitPercent: number;
}

// ── Router deps ─────────────────────────────────────────────────────────────────

export interface AdminAiMatchingRouterDeps {
  adminAiMatchingRepo: AdminAiMatchingRepository;
  auditLogRepo: AuditLogRepository;
}

// ── Router ──────────────────────────────────────────────────────────────────────

export function createAdminAiMatchingRouter(deps: AdminAiMatchingRouterDeps) {
  const { adminAiMatchingRepo, auditLogRepo } = deps;
  const adminProcedure = createAdminProcedure();

  return router({
    // ── Experiment metrics ─────────────────────────────────────────────────────
    getExperimentMetrics: adminProcedure
      .input(getExperimentMetricsSchema)
      .query(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Viewer);

        const rows = await adminAiMatchingRepo.getExperimentMetrics(
          input.experimentName,
          input.dateFrom ? new Date(input.dateFrom) : undefined,
          input.dateTo ? new Date(input.dateTo) : undefined,
        );

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
          if (existing) {
            existing.totalUsers += row.userCount;
            existing.totalDiscoveries += row.totalDiscoveries;
            existing.totalLikes += row.totalLikes;
            existing.totalMatches += row.totalMatches;
            existing.totalWalksCompleted += row.totalWalksCompleted;
            existing.totalMessages += row.totalMessages;
          } else {
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

        const rows = await adminAiMatchingRepo.getModelPerformance(
          input.dateFrom ? new Date(input.dateFrom) : undefined,
          input.dateTo ? new Date(input.dateTo) : undefined,
        );

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

        void logAdminAction(auditLogRepo, {
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

    // ── Model registry ────────────────────────────────────────────────────────
    listModels: adminProcedure.query(async ({ ctx }) => {
      requireRole(ctx.adminRole, AdminRole.Viewer);

      const models = await adminAiMatchingRepo.listModels();

      return { models };
    }),

    // ── Promote model ─────────────────────────────────────────────────────────
    promoteModel: adminProcedure.input(promoteModelSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.SuperAdmin);

      await adminAiMatchingRepo.deactivateAllModels();
      await adminAiMatchingRepo.promoteModel(input.version);

      await redis.set('ml:model:active', input.version);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'model.promote',
        resourceType: RESOURCE_TYPE.settings,
        resourceId: input.version,
        changes: { after: { version: input.version } },
      });

      trackEvent('admin_model_promoted', ctx.userId, {
        version: input.version,
      });

      return { success: true };
    }),
  });
}
