'use server';

import type { PaginatedResult } from '@pawmeet/types';
import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';
import type { AdminUserListItem, ListUsersParams } from '@/repositories/interfaces';

export async function suspendUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const api = await getServerTrpcClient();
    await api.admin.suspendUser.mutate({ userId });
    revalidatePath(`/users/${userId}`);
    revalidatePath('/users');
    return { success: true };
  } catch {
    return { success: false, error: 'Errore durante la sospensione' };
  }
}

export async function banUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const api = await getServerTrpcClient();
    await api.admin.banUser.mutate({ userId });
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
    const api = await getServerTrpcClient();
    await api.admin.reactivateUser.mutate({ userId });
    revalidatePath(`/users/${userId}`);
    revalidatePath('/users');
    return { success: true };
  } catch {
    return { success: false, error: 'Errore durante la riattivazione' };
  }
}

export async function fetchUser(id: string) {
  const api = await getServerTrpcClient();
  try {
    return await api.admin.getUser.query({ id });
  } catch {
    return null;
  }
}

export async function fetchUsers(
  params: ListUsersParams,
): Promise<PaginatedResult<AdminUserListItem>> {
  const api = await getServerTrpcClient();
  const result = await api.admin.listUsers.query({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  return {
    data: result.data as AdminUserListItem[],
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}
