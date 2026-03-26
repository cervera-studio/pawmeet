'use server';

import type { PaginatedResult } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { getServerTrpcClient } from '@/lib/server-api';

export interface WaitlistContact {
  id: string;
  email: string;
  locale: string;
  subscribedAt: string;
  source: string;
}

export interface ListWaitlistParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function fetchWaitlistContacts(
  params: ListWaitlistParams,
): Promise<PaginatedResult<WaitlistContact>> {
  const api = await getServerTrpcClient();
  const result = await api.admin.listWaitlist.query({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  return {
    data: result.data as WaitlistContact[],
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}

export async function fetchWaitlistStats() {
  const api = await getServerTrpcClient();
  return api.admin.getWaitlistStats.query();
}

export async function removeWaitlistContact(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const api = await getServerTrpcClient();
    await api.admin.removeFromWaitlist.mutate({ id });
    revalidatePath('/waitlist');
    return { success: true };
  } catch (error) {
    logger.error('AdminWaitlist', 'removeWaitlistContact failed', error);
    const tt = await getTranslations('toast');
    return { success: false, error: tt('waitlist.removeError') };
  }
}

/** Fetch all waitlist contacts (unpaginated) for CSV export */
export async function fetchAllWaitlistForExport(search?: string): Promise<WaitlistContact[]> {
  const api = await getServerTrpcClient();
  const allData: WaitlistContact[] = [];
  let page = 1;
  const pageSize = 200;

  let hasMore = true;
  while (hasMore) {
    const result = await api.admin.listWaitlist.query({ page, pageSize, search });
    allData.push(...(result.data as WaitlistContact[]));
    hasMore = page < result.totalPages;
    page++;
  }

  return allData;
}
