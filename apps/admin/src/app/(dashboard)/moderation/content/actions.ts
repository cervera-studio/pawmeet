'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';
import type { ContentReportPage, ReviewAction } from '@/repositories';

export async function reviewContent(reportId: string, action: ReviewAction): Promise<void> {
  const api = await getServerTrpcClient();
  await api.contentModeration.reviewReport.mutate({ reportId, action });
  revalidatePath('/moderation/content');
}

export async function fetchPendingContent(params: {
  cursor?: string;
  limit: number;
}): Promise<ContentReportPage> {
  const api = await getServerTrpcClient();
  const result = await api.contentModeration.pendingReports.query(params);
  return {
    reports: result.reports,
    nextCursor: result.nextCursor ?? null,
  };
}
