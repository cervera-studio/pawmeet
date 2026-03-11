import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildContentReport, buildContentReportRepo } from '../test-utils/builders.js';
import { createGetPendingReports } from './get-pending-reports.js';

describe('createGetPendingReports', () => {
  it('returns pending reports', async () => {
    const reports = [buildContentReport(), buildContentReport({ id: 'report-2' })];
    const contentReportRepo = buildContentReportRepo({
      findPendingReports: vi.fn().mockResolvedValue({ reports, nextCursor: null }),
    });
    const getPendingReports = createGetPendingReports({ contentReportRepo });

    const result = await getPendingReports(null);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.reports).toHaveLength(2);
    expect(result.data.nextCursor).toBeNull();
    expect(contentReportRepo.findPendingReports).toHaveBeenCalledWith(null, expect.any(Number));
  });

  it('passes cursor and limit to repository', async () => {
    const contentReportRepo = buildContentReportRepo({
      findPendingReports: vi.fn().mockResolvedValue({ reports: [], nextCursor: null }),
    });
    const getPendingReports = createGetPendingReports({ contentReportRepo });

    await getPendingReports('cursor-abc', 5);

    expect(contentReportRepo.findPendingReports).toHaveBeenCalledWith('cursor-abc', 5);
  });
});
