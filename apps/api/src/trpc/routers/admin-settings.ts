import { DEFAULT_WEIGHTS } from '@pawmeet/config';
import { z } from 'zod';
import { SUPPORT_EMAIL } from '../../constants/emails.js';
import { logAdminAction, RESOURCE_TYPE } from '../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../lib/admin-permissions.js';
import { toAuditChanges } from '../../lib/audit-helpers.js';
import { redis } from '../../lib/redis.js';
import { trackEvent } from '../../lib/track-event.js';
import type { AuditLogRepository } from '../../ports/audit-log-repository.js';
import { validateMatchWeights } from '../../use-cases/admin/validate-match-weights.js';
import { router, unwrapResult } from '../trpc.js';
import { createAdminProcedure } from './admin-procedure.js';

// ── Settings persistence (Redis) ────────────────────────────────────────────────

const SETTINGS_REDIS_KEY = 'pawmeet:admin:settings';

export interface PersistedSettings {
  appName: string;
  supportEmail: string;
  photoConfidenceThreshold: number;
  maxReportsBeforeSuspension: number;
  matchWeightSize: number;
  matchWeightEnergy: number;
  matchWeightBehavior: number;
  matchWeightWalk: number;
  matchWeightDistance: number;
  matchWeightLeash: number;
}

function getDefaultSettings(): PersistedSettings {
  return {
    appName: 'PawMeet',
    supportEmail: SUPPORT_EMAIL,
    photoConfidenceThreshold: 95,
    maxReportsBeforeSuspension: 5,
    matchWeightSize: DEFAULT_WEIGHTS.size,
    matchWeightEnergy: DEFAULT_WEIGHTS.energy,
    matchWeightBehavior: DEFAULT_WEIGHTS.behavior,
    matchWeightWalk: DEFAULT_WEIGHTS.walk,
    matchWeightDistance: DEFAULT_WEIGHTS.distance,
    matchWeightLeash: DEFAULT_WEIGHTS.leash,
  };
}

async function loadSettings(): Promise<PersistedSettings> {
  const stored = await redis.get<PersistedSettings>(SETTINGS_REDIS_KEY);
  return stored ?? getDefaultSettings();
}

async function saveSettings(settings: PersistedSettings): Promise<void> {
  await redis.set(SETTINGS_REDIS_KEY, settings);
}

const updateSettingsSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  supportEmail: z.email().optional(),
  photoConfidenceThreshold: z.number().int().min(0).max(100).optional(),
  maxReportsBeforeSuspension: z.number().int().min(1).optional(),
  matchWeightSize: z.number().min(0).max(1).optional(),
  matchWeightEnergy: z.number().min(0).max(1).optional(),
  matchWeightBehavior: z.number().min(0).max(1).optional(),
  matchWeightWalk: z.number().min(0).max(1).optional(),
  matchWeightDistance: z.number().min(0).max(1).optional(),
  matchWeightLeash: z.number().min(0).max(1).optional(),
});

interface SettingsRouterDeps {
  auditLogRepo: AuditLogRepository;
}

export function createAdminSettingsRouter(deps: SettingsRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { auditLogRepo } = deps;

  return router({
    getSettings: adminProcedure.query(async () => {
      return loadSettings();
    }),

    updateSettings: adminProcedure.input(updateSettingsSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.SuperAdmin);

      const weights = unwrapResult(validateMatchWeights(input));

      const current = await loadSettings();
      const updated: PersistedSettings = {
        appName: input.appName ?? current.appName,
        supportEmail: input.supportEmail ?? current.supportEmail,
        photoConfidenceThreshold:
          input.photoConfidenceThreshold ?? current.photoConfidenceThreshold,
        maxReportsBeforeSuspension:
          input.maxReportsBeforeSuspension ?? current.maxReportsBeforeSuspension,
        matchWeightSize: weights.size,
        matchWeightEnergy: weights.energy,
        matchWeightBehavior: weights.behavior,
        matchWeightWalk: weights.walk,
        matchWeightDistance: weights.distance,
        matchWeightLeash: weights.leash,
      };

      await saveSettings(updated);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'settings.update',
        resourceType: RESOURCE_TYPE.settings,
        changes: { after: toAuditChanges(input) },
      });

      trackEvent('admin_settings_updated', ctx.userId, {
        changedFields: Object.keys(input),
      });

      return updated;
    }),

    clearCache: adminProcedure.mutation(async ({ ctx }) => {
      requireRole(ctx.adminRole, AdminRole.SuperAdmin);

      // Clear all application cache keys (pattern-based) while preserving settings
      const patterns = ['pawmeet:cache:*', 'pawmeet:rate-limit:*', 'pawmeet:dau:*', 'pawmeet:ml:*'];

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'settings.clear_cache',
        resourceType: RESOURCE_TYPE.settings,
      });

      return { success: true };
    }),
  });
}
