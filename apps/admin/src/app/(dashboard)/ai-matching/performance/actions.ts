'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchModelPerformance() {
  const api = await getServerTrpcClient();
  return api.adminAiMatching.getModelPerformance.query({});
}

export async function fetchModelRegistry() {
  const api = await getServerTrpcClient();
  return api.adminAiMatching.listModels.query();
}

export async function promoteModel(version: string) {
  const api = await getServerTrpcClient();
  const result = await api.adminAiMatching.promoteModel.mutate({ version });
  revalidatePath('/ai-matching/performance');
  return result;
}
