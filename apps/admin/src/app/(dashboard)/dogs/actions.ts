'use server';

import type { PaginatedResult } from '@pawmeet/types';
import { getServerTrpcClient } from '@/lib/server-api';
import type { AdminDogListItem, ListDogsParams } from '@/repositories/interfaces';

export async function fetchDogs(
  params: ListDogsParams,
): Promise<PaginatedResult<AdminDogListItem>> {
  const api = await getServerTrpcClient();
  const result = await api.admin.listDogs.query(params);
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}
