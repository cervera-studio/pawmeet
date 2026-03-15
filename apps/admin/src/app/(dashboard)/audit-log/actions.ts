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
