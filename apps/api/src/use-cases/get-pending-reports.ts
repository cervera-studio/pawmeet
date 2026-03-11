import { FEED_PAGE_SIZE } from '@dogwalk/config';
import type { Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { ContentReportRepository } from '../ports/index.js';

type Deps = {
  contentReportRepo: ContentReportRepository;
};

export function createGetPendingReports({ contentReportRepo }: Deps) {
  return async (
    cursor: string | null,
    limit: number = FEED_PAGE_SIZE,
  ): Promise<
    Result<{ reports: import('@dogwalk/types').ContentReport[]; nextCursor: string | null }>
  > => {
    const result = await contentReportRepo.findPendingReports(cursor, limit);
    return succeed(result);
  };
}
