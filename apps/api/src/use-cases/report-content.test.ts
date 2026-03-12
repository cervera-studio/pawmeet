import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildContentReport, buildContentReportRepo } from '../test-utils/builders.js';
import { createReportContent } from './report-content.js';

describe('createReportContent', () => {
  it('creates a content report', async () => {
    const report = buildContentReport();
    const contentReportRepo = buildContentReportRepo({
      hasReported: vi.fn().mockResolvedValue(false),
      createReport: vi.fn().mockResolvedValue(report),
    });
    const reportContent = createReportContent({ contentReportRepo });

    const result = await reportContent('user-1', 'post', 'post-1', 'inappropriate', null);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.report).toEqual(report);
  });

  it('fails when user already reported the same content', async () => {
    const contentReportRepo = buildContentReportRepo({
      hasReported: vi.fn().mockResolvedValue(true),
    });
    const reportContent = createReportContent({ contentReportRepo });

    const result = await reportContent('user-1', 'post', 'post-1', 'spam', null);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_REPORTED');
  });
});
