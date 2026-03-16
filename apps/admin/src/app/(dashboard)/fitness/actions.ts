'use server';

import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchFitnessStats() {
  const api = await getServerTrpcClient();
  return api.admin.getFitnessStats.query();
}
