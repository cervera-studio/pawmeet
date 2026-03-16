'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchFeatureFlags() {
  const api = await getServerTrpcClient();
  return api.adminAiMatching.listFeatureFlags.query();
}

export async function updateFlag(name: string, enabled: boolean, splitPercent: number) {
  const api = await getServerTrpcClient();
  const result = await api.adminAiMatching.updateFeatureFlag.mutate({
    name,
    enabled,
    splitPercent,
  });
  revalidatePath('/ai-matching/flags');
  return result;
}
