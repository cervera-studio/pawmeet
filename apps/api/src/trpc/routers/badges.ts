import { z } from 'zod';
import type { badgeDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

const listByDogSchema = z.object({
  dogId: z.string().uuid(),
});

const checkAndAwardSchema = z.object({
  dogId: z.string().uuid(),
});

export function createBadgesRouter(deps: typeof badgeDeps) {
  return router({
    listByDog: protectedProcedure
      .input(listByDogSchema)
      .query(async ({ input }) => unwrapResult(await deps.listBadges(input.dogId))),

    checkAndAward: protectedProcedure
      .input(checkAndAwardSchema)
      .mutation(async ({ input }) =>
        unwrapResult(await deps.checkAndAwardBadges(input.dogId)),
      ),
  });
}
