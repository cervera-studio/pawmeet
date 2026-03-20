import type { ContentReport } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type { ContentReportRepository } from '../ports/index.js';

type Deps = {
  contentReportRepo: ContentReportRepository;
};

export function createReviewContentReport({ contentReportRepo }: Deps) {
  return async (
    reportId: string,
    reviewerId: string,
    action: 'reviewed' | 'dismissed',
  ): Promise<Result<{ report: ContentReport }>> => {
    const report = await contentReportRepo.reviewReport(reportId, reviewerId, action);
    if (!report) {
      return fail(new AppError('REPORT_NOT_FOUND', 'Report not found', 404));
    }

    logger.info('ReviewContentReport', 'Report reviewed', { reportId, reviewerId, action });

    return succeed({ report });
  };
}
