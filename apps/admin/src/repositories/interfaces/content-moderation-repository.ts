import type { ContentReport as DomainContentReport, Serialized } from '@dogwalk/types';

export type ReviewAction = 'reviewed' | 'dismissed';

export type ContentReport = Serialized<DomainContentReport>;

export interface ContentReportPage {
  reports: ContentReport[];
  nextCursor: string | null;
}

export interface ContentModerationRepository {
  listPending(params: { cursor?: string; limit: number }): Promise<ContentReportPage>;
  review(reportId: string, action: ReviewAction): Promise<void>;
}
