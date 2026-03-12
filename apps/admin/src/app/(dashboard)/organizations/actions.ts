'use server';

import type { PaginatedResult } from '@pawmeet/types';
import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';
import type {
  AdminOrganizationListItem,
  ListOrganizationsParams,
} from '@/repositories/interfaces';

export async function fetchOrganizations(
  params: ListOrganizationsParams,
): Promise<PaginatedResult<AdminOrganizationListItem>> {
  const api = await getServerTrpcClient();
  const result = await api.admin.listOrganizations.query(params);
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}

export async function verifyOrganization(organizationId: string) {
  const api = await getServerTrpcClient();
  await api.admin.verifyOrganization.mutate({ organizationId });
  revalidatePath('/organizations');
  revalidatePath(`/organizations/${organizationId}`);
  return { success: true };
}

export async function revokeOrganization(organizationId: string) {
  const api = await getServerTrpcClient();
  await api.admin.revokeOrganization.mutate({ organizationId });
  revalidatePath('/organizations');
  revalidatePath(`/organizations/${organizationId}`);
  return { success: true };
}
