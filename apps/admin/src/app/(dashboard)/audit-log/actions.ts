'use server';

import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchAuditLog(params: {
  page: number;
  pageSize: number;
  search?: string;
  resourceType?: string;
  adminId?: string;
}) {
  const api = await getServerTrpcClient();
  return api.admin.listAuditLog.query(params);
}

/** Fetch all audit log entries (unpaginated) for CSV export */
export async function fetchAllAuditLogForExport(params?: {
  search?: string;
  resourceType?: string;
}) {
  const api = await getServerTrpcClient();
  type AuditEntry = Awaited<ReturnType<typeof api.admin.listAuditLog.query>>['data'][number];
  const allData: AuditEntry[] = [];
  let page = 1;
  const pageSize = 200;

  let hasMore = true;
  while (hasMore) {
    const result = await api.admin.listAuditLog.query({
      page,
      pageSize,
      search: params?.search,
      resourceType: params?.resourceType,
    });
    allData.push(...result.data);
    hasMore = page < result.totalPages;
    page++;
  }

  return allData;
}
