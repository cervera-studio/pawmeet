'use server';

import type { PaginatedResult } from '@pawmeet/types';
import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';
import type { AdminReportListItem, ReportStatus, ResolveAction } from '@/repositories';

export async function fetchChatReports(params: {
  page: number;
  pageSize: number;
  status?: ReportStatus;
}): Promise<PaginatedResult<AdminReportListItem>> {
  const api = await getServerTrpcClient();
  // Chat reports share the general reports endpoint.
  // A dedicated reason/contentType filter can be added when the API supports it.
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

export async function resolveChatReport(id: string, action: ResolveAction): Promise<void> {
  const api = await getServerTrpcClient();
  await api.admin.resolveReport.mutate({ id, action });
  revalidatePath('/moderation/chat');
}
