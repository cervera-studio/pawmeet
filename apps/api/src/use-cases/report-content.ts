import type { ContentReport } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { sanitizeContent } from '../lib/sanitize.js';
import type { ContentReportRepository } from '../ports/index.js';

type Deps = {
  contentReportRepo: ContentReportRepository;
};

export function createReportContent({ contentReportRepo }: Deps) {
  return async (
    userId: string,
    contentType: string,
    contentId: string,
    reason: string,
    description: string | null,
  ): Promise<Result<{ report: ContentReport }>> => {
    const alreadyReported = await contentReportRepo.hasReported(userId, contentType, contentId);
    if (alreadyReported) {
      return fail(new AppError('ALREADY_REPORTED', ERROR_MESSAGES.ALREADY_REPORTED, 409));
    }

    const report = await contentReportRepo.createReport({
      reporterId: userId,
      contentType,
      contentId,
      reason,
      description: description ? sanitizeContent(description) : null,
    });

    logger.info('ReportContent', 'Content reported', {
      userId,
      reportId: report.id,
      contentType,
      contentId,
      reason,
    });

    return succeed({ report });
  };
}
