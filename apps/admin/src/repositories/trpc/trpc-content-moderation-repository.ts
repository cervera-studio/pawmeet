import type { ApiClient } from '@pawmeet/api-client';
import type { ContentModerationRepository, ContentReportPage, ReviewAction } from '../interfaces';

export function createTrpcContentModerationRepository(api: ApiClient): ContentModerationRepository {
  return {
    async listPending(params: { cursor?: string; limit: number }): Promise<ContentReportPage> {
      const result = await api.contentModeration.pendingReports.query(params);
      return {
        reports: result.reports,
        nextCursor: result.nextCursor ?? null,
      };
    },
    async review(reportId: string, action: ReviewAction): Promise<void> {
      await api.contentModeration.reviewReport.mutate({ reportId, action });
    },
  };
}
