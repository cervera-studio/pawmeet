'use server';

import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchSosAlerts(params: {
  page: number;
  pageSize: number;
  type?: 'sos' | 'auto_alert' | 'checkin';
}) {
  const api = await getServerTrpcClient();
  const result = await api.admin.listSosAlerts.query(params);
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}

export async function fetchEmergencyContacts(params: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  const api = await getServerTrpcClient();
  const result = await api.admin.listEmergencyContacts.query(params);
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}
