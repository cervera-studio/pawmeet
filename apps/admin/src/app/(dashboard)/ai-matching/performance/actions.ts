'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';
import type { PerformanceChartsProps } from './performance-charts';

// ── Response types for typed fetch boundaries ──────────────────────────────

interface ModelPerformanceResponse {
  overview: {
    totalPredictions: number | null;
    totalMatches: number | null;
    avgOverallScore: number | null;
  } | null;
  scoreBuckets: PerformanceChartsProps['scoreBuckets'];
  weightDistribution: PerformanceChartsProps['weightDistribution'];
  timeSeries: PerformanceChartsProps['timeSeries'];
}

interface ModelEntry {
  id: string;
  version: string;
  trainingSamplesCount: number | null;
  metrics: unknown;
  isActive: boolean;
  promotedAt: string | Date | null;
  createdAt: string | Date;
}

interface ModelRegistryResponse {
  models: ModelEntry[];
}

export type { ModelEntry };

// ── Server actions ─────────────────────────────────────────────────────────

export async function fetchModelPerformance(): Promise<ModelPerformanceResponse> {
  const api = await getServerTrpcClient();
  const result = await api.adminAiMatching.getModelPerformance.query({});
  return result as unknown as ModelPerformanceResponse;
}

export async function fetchModelRegistry(): Promise<ModelRegistryResponse> {
  const api = await getServerTrpcClient();
  const result = await api.adminAiMatching.listModels.query();
  return result as ModelRegistryResponse;
}

export async function promoteModel(version: string) {
  const api = await getServerTrpcClient();
  const result = await api.adminAiMatching.promoteModel.mutate({ version });
  revalidatePath('/ai-matching/performance');
  return result;
}
