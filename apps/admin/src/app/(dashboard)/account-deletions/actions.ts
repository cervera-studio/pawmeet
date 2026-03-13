'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchPendingDeletions(params: { page: number; pageSize: number }) {
  const api = await getServerTrpcClient();
  const result = await api.admin.listPendingDeletions.query(params);
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}

export async function cancelDeletion(userId: string) {
  const api = await getServerTrpcClient();
  await api.admin.cancelDeletion.mutate({ userId });
  revalidatePath('/account-deletions');
  return { success: true };
}
