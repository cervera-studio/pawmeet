import type { ContentReport } from '@pawmeet/types';

export interface CreateReportInput {
  reporterId: string;
  contentType: string;
  contentId: string;
  reason: string;
  description: string | null;
}

export interface ContentReportRepository {
  createReport(input: CreateReportInput): Promise<ContentReport>;
  findPendingReports(
    cursor: string | null,
    limit: number,
  ): Promise<{
    reports: ContentReport[];
    nextCursor: string | null;
  }>;
  reviewReport(
    reportId: string,
    reviewerId: string,
    action: 'reviewed' | 'dismissed',
  ): Promise<ContentReport | null>;
  hasReported(reporterId: string, contentType: string, contentId: string): Promise<boolean>;
}
