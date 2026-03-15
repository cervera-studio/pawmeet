import { feedQuerySchema, reviewReportSchema } from '@pawmeet/validation';
import type { contentModerationDeps } from '../../container/index.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createContentModerationRouter(deps: typeof contentModerationDeps) {
  return router({
    pendingReports: protectedProcedure
      .input(feedQuerySchema)
      .query(async ({ input }) =>
        unwrapResult(await deps.getPendingReports(input.cursor ?? null, input.limit)),
      ),

    reviewReport: protectedProcedure
      .input(reviewReportSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.reviewContentReport(input.reportId, ctx.userId, input.action)),
      ),
  });
}
