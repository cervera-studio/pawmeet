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

/** Fetch all dogs (unpaginated) for CSV export */
export async function fetchAllDogsForExport(search?: string): Promise<AdminDogListItem[]> {
  const api = await getServerTrpcClient();
  const allData: AdminDogListItem[] = [];
  let page = 1;
  const pageSize = 200;

  let hasMore = true;
  while (hasMore) {
    const result = await api.admin.listDogs.query({ page, pageSize, search });
    allData.push(...result.data);
    hasMore = page < result.totalPages;
    page++;
  }

  return allData;
}
