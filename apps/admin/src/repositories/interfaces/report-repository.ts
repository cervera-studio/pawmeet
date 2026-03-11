import type { PaginatedResult } from '@dogwalk/types';

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ResolveAction = 'dismiss' | 'warn' | 'suspend' | 'ban';

export interface AdminReportListItem {
  id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  resolvedAction: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporterId: string;
  reportedUserId: string;
  reporterName: string;
  reporterEmail: string;
  reportedName: string;
  reportedEmail: string;
}

export interface ListReportsParams {
  page: number;
  pageSize: number;
  status?: ReportStatus;
}

export interface AdminReportRepository {
  list(params: ListReportsParams): Promise<PaginatedResult<AdminReportListItem>>;
  resolve(id: string, action: ResolveAction): Promise<void>;
}
