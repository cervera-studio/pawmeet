import type { ApiClient } from '@pawmeet/api-client';
import type { PaginatedResult } from '@pawmeet/types';
import type {
  AdminReportListItem,
  AdminReportRepository,
  ListReportsParams,
  ReportStatus,
  ResolveAction,
} from '../interfaces';

export function createTrpcReportRepository(api: ApiClient): AdminReportRepository {
  return {
    async list(params: ListReportsParams): Promise<PaginatedResult<AdminReportListItem>> {
      const result = await api.admin.listReports.query(params);
      return {
        data: result.data.map((r) => ({
          ...r,
          status: r.status as ReportStatus,
          resolvedAt: r.resolvedAt ? String(r.resolvedAt) : null,
          createdAt: String(r.createdAt),
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.page < result.totalPages,
      };
    },
    async resolve(id: string, action: ResolveAction): Promise<void> {
      await api.admin.resolveReport.mutate({ id, action });
    },
  };
}
