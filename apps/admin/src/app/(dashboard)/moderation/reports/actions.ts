'use server';

import type { PaginatedResult } from '@pawmeet/types';
import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';
import type {
  AdminReportListItem,
  ListReportsParams,
  ReportStatus,
  ResolveAction,
} from '@/repositories';

export async function resolveReport(id: string, action: ResolveAction): Promise<void> {
  const api = await getServerTrpcClient();
  await api.admin.resolveReport.mutate({ id, action });
  revalidatePath('/moderation/reports');
}

export async function fetchReports(
  params: ListReportsParams,
): Promise<PaginatedResult<AdminReportListItem>> {
  const api = await getServerTrpcClient();
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
}
