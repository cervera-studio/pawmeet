import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildContentReport, buildContentReportRepo } from '../test-utils/builders.js';
import { createReviewContentReport } from './review-content-report.js';

describe('createReviewContentReport', () => {
  it('reviews a report successfully', async () => {
    const report = buildContentReport({ status: 'reviewed', reviewedBy: 'admin-1' });
    const deps = {
      contentReportRepo: buildContentReportRepo({
        reviewReport: vi.fn().mockResolvedValue(report),
      }),
    };
    const review = createReviewContentReport(deps);

    const result = await review('report-1', 'admin-1', 'reviewed');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.report.status).toBe('reviewed');
  });

  it('fails with 404 when report not found', async () => {
    const deps = {
      contentReportRepo: buildContentReportRepo({ reviewReport: vi.fn().mockResolvedValue(null) }),
    };
    const review = createReviewContentReport(deps);

    const result = await review('report-1', 'admin-1', 'dismissed');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('REPORT_NOT_FOUND');
  });
});
