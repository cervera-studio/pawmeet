import type { ContentReport } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
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
      return fail(new AppError('ALREADY_REPORTED', 'Hai già segnalato questo contenuto', 409));
    }

    const report = await contentReportRepo.createReport({
      reporterId: userId,
      contentType,
      contentId,
      reason,
      description,
    });

    return succeed({ report });
  };
}
