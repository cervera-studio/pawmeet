'use server';

import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchExperimentMetrics(params?: {
  experimentName?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const api = await getServerTrpcClient();
  return api.adminAiMatching.getExperimentMetrics.query({
    experimentName: params?.experimentName ?? 'ml_matching_v1',
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
  });
}

export async function fetchFeatureFlags() {
  const api = await getServerTrpcClient();
  return api.adminAiMatching.listFeatureFlags.query();
}
