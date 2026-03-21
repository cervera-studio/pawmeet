'use server';

import type { PaginatedResult } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { getServerTrpcClient } from '@/lib/server-api';
import type { AdminUserListItem, ListUsersParams } from '@/repositories/interfaces';

export async function suspendUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const api = await getServerTrpcClient();
    await api.admin.suspendUser.mutate({ userId });
    revalidatePath(`/users/${userId}`);
    revalidatePath('/users');
    return { success: true };
  } catch (error) {
    logger.error('AdminUsers', 'suspendUser failed', error);
    const tt = await getTranslations('toast');
    return { success: false, error: tt('users.suspendError') };
  }
}

export async function banUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const api = await getServerTrpcClient();
    await api.admin.banUser.mutate({ userId });
    revalidatePath(`/users/${userId}`);
    revalidatePath('/users');
    return { success: true };
  } catch (error) {
    logger.error('AdminUsers', 'banUser failed', error);
    const tt = await getTranslations('toast');
    return { success: false, error: tt('users.banError') };
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
  } catch (error) {
    logger.error('AdminUsers', 'reactivateUser failed', error);
    const tt = await getTranslations('toast');
    return { success: false, error: tt('users.reactivateError') };
  }
}

export async function requestGdprExport(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const api = await getServerTrpcClient();
    await api.admin.requestGdprExport.mutate({ userId });
    return { success: true };
  } catch (error) {
    logger.error('AdminUsers', 'requestGdprExport failed', error);
    const tt = await getTranslations('toast');
    return { success: false, error: tt('users.gdprExportError') };
  }
}

export async function fetchUserSessions(userId: string) {
  try {
    const api = await getServerTrpcClient();
    return await api.admin.getUserSessions.query({ userId });
  } catch (error) {
    logger.error('AdminUsers', 'fetchUserSessions failed', error);
    return [];
  }
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const api = await getServerTrpcClient();
    await api.admin.revokeUserSession.mutate({ userId, sessionId });
    revalidatePath(`/users/${userId}`);
    return { success: true };
  } catch (error) {
    logger.error('AdminUsers', 'revokeUserSession failed', error);
    const tt = await getTranslations('toast');
    return { success: false, error: tt('users.revokeSessionError') };
  }
}

export async function revokeAllUserSessions(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const api = await getServerTrpcClient();
    await api.admin.revokeAllUserSessions.mutate({ userId });
    revalidatePath(`/users/${userId}`);
    return { success: true };
  } catch (error) {
    logger.error('AdminUsers', 'revokeAllUserSessions failed', error);
    const tt = await getTranslations('toast');
    return { success: false, error: tt('users.revokeAllSessionsError') };
  }
}

export async function fetchUser(id: string) {
  const api = await getServerTrpcClient();
  try {
    return await api.admin.getUser.query({ id });
  } catch (error) {
    logger.error('AdminUsers', 'fetchUser failed', error);
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

/** Fetch all users (unpaginated) for CSV export */
export async function fetchAllUsersForExport(search?: string): Promise<AdminUserListItem[]> {
  const api = await getServerTrpcClient();
  const allData: AdminUserListItem[] = [];
  let page = 1;
  const pageSize = 200;

  // Paginate through all results
  let hasMore = true;
  while (hasMore) {
    const result = await api.admin.listUsers.query({ page, pageSize, search });
    allData.push(...(result.data as AdminUserListItem[]));
    hasMore = page < result.totalPages;
    page++;
  }

  return allData;
}
