'use server';

import type { PaginatedResult } from '@pawmeet/types';
import { revalidatePath } from 'next/cache';
import { serverFetch } from '@/lib/server-api';
import type { AdminUserListItem, ListUsersParams } from '@/repositories/interfaces';

interface RestPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function suspendUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await serverFetch(`/admin/users/${userId}/suspend`, { method: 'POST' });
    revalidatePath(`/users/${userId}`);
    revalidatePath('/users');
    return { success: true };
  } catch {
    return { success: false, error: 'Errore durante la sospensione' };
  }
}

export async function banUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await serverFetch(`/admin/users/${userId}/ban`, { method: 'POST' });
    revalidatePath(`/users/${userId}`);
    revalidatePath('/users');
    return { success: true };
  } catch {
    return { success: false, error: 'Errore durante il ban' };
  }
}

export async function reactivateUser(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await serverFetch(`/admin/users/${userId}/reactivate`, { method: 'POST' });
    revalidatePath(`/users/${userId}`);
    revalidatePath('/users');
    return { success: true };
  } catch {
    return { success: false, error: 'Errore durante la riattivazione' };
  }
}

export async function fetchUsers(
  params: ListUsersParams,
): Promise<PaginatedResult<AdminUserListItem>> {
  const url = new URL('/admin/users', 'http://placeholder');
  url.searchParams.set('page', String(params.page));
  url.searchParams.set('pageSize', String(params.pageSize));
  if (params.search) {
    url.searchParams.set('search', params.search);
  }
  if (params.sortBy) {
    url.searchParams.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    url.searchParams.set('sortOrder', params.sortOrder);
  }

  const pathWithQuery = `${url.pathname}${url.search}`;
  const result = await serverFetch<RestPaginatedResponse<AdminUserListItem>>(pathWithQuery);

  return {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}
