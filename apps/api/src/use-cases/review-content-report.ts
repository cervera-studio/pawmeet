import type { ContentReport } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
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
      return fail(new AppError('REPORT_NOT_FOUND', 'Segnalazione non trovata', 404));
    }
    return succeed({ report });
  };
}
