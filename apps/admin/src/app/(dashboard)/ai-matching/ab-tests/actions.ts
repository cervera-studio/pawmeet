'use server';

import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchExperimentMetrics() {
  const api = await getServerTrpcClient();
  return api.adminAiMatching.getExperimentMetrics.query({
    experimentName: 'ml_matching_v1',
  });
}
