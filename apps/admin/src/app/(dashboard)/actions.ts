'use server';

import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchDashboardStats() {
  const api = await getServerTrpcClient();
  return api.admin.getStats.query();
}

export async function fetchAnalyticsKpis() {
  const api = await getServerTrpcClient();
  return api.admin.getAnalyticsKpis.query();
}
