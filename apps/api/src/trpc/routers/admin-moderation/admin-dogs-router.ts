import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { paginate } from '../../../lib/pagination.js';
import { router } from '../../trpc.js';
import { createAdminProcedure } from '../admin-procedure.js';
import type { ModerationRouterDeps } from './types.js';

const listDogsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const getDogSchema = z.object({
  id: z.uuid(),
});

export function createAdminDogsRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo } = deps;

  return router({
    listDogs: adminProcedure.input(listDogsSchema).query(async ({ input }) => {
      const result = await adminDataRepo.listDogs(input);
      return paginate(result, input);
    }),

    getDog: adminProcedure.input(getDogSchema).query(async ({ input }) => {
      const dog = await adminDataRepo.getDog(input.id);
      if (!dog) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Dog not found' });
      }
      return dog;
    }),
  });
}
