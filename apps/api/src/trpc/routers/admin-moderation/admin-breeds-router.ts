import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../../lib/admin-permissions.js';
import { toAuditChanges } from '../../../lib/audit-helpers.js';
import { paginate } from '../../../lib/pagination.js';
import { router } from '../../trpc.js';
import { createAdminProcedure } from '../admin-procedure.js';
import type { ModerationRouterDeps } from './types.js';

const sizeCategoryEnum = z.enum(['toy', 'small', 'medium', 'large', 'giant']);

const listBreedsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  group: z.string().optional(),
});

const createBreedSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'Code must be lowercase alphanumeric with underscores'),
  group: z.string().max(50).optional(),
  sizeCategory: sizeCategoryEnum,
  avgWeightKg: z.number().int().positive().optional(),
});

const updateBreedSchema = z.object({
  id: z.number().int().positive(),
  code: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  group: z.string().max(50).optional(),
  sizeCategory: sizeCategoryEnum.optional(),
  avgWeightKg: z.number().int().positive().optional(),
});

const deleteBreedSchema = z.object({
  id: z.number().int().positive(),
});

export function createAdminBreedsRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, auditLogRepo } = deps;

  return router({
    listBreeds: adminProcedure.input(listBreedsSchema).query(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Moderator);

      const result = await adminDataRepo.listBreeds(input);
      return paginate(result, input);
    }),

    createBreed: adminProcedure.input(createBreedSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const created = await adminDataRepo.createBreed(input);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'create_breed',
        resourceType: RESOURCE_TYPE.breed,
        resourceId: String((created as { id?: number }).id),
        changes: { after: toAuditChanges(input) },
      });

      return created;
    }),

    updateBreed: adminProcedure.input(updateBreedSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const { id, ...updates } = input;

      const existing = await adminDataRepo.findBreedById(id);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Breed not found' });
      }

      const setValues: Record<string, unknown> = {};
      if (updates.code !== undefined) setValues.code = updates.code;
      if (updates.group !== undefined) setValues.group = updates.group;
      if (updates.sizeCategory !== undefined) setValues.sizeCategory = updates.sizeCategory;
      if (updates.avgWeightKg !== undefined) setValues.avgWeightKg = updates.avgWeightKg;

      if (Object.keys(setValues).length === 0) {
        return existing;
      }

      const updated = await adminDataRepo.updateBreed(id, setValues);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'update_breed',
        resourceType: RESOURCE_TYPE.breed,
        resourceId: String(id),
        changes: {
          before: toAuditChanges(existing),
          ...(updated ? { after: toAuditChanges(updated) } : {}),
        },
      });

      return updated;
    }),

    deleteBreed: adminProcedure.input(deleteBreedSchema).mutation(async ({ ctx, input }) => {
      requireRole(ctx.adminRole, AdminRole.Admin);

      const existing = await adminDataRepo.findBreedById(input.id);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Breed not found' });
      }

      const dogCount = await adminDataRepo.countDogsReferencingBreed(existing.code);

      if (dogCount > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot delete breed "${existing.code}": ${dogCount} dog(s) still reference it`,
        });
      }

      await adminDataRepo.deleteBreed(input.id);

      void logAdminAction(auditLogRepo, {
        adminId: ctx.userId,
        action: 'delete_breed',
        resourceType: RESOURCE_TYPE.breed,
        resourceId: String(input.id),
        changes: { before: toAuditChanges(existing) },
      });

      return { success: true };
    }),
  });
}
