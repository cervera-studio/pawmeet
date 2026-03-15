'use server';

import { getServerTrpcClient } from '@/lib/server-api';

type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'viewer';

export async function fetchAdminUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  role?: AdminRole;
}) {
  const api = await getServerTrpcClient();
  return api.admin.listAdminUsers.query(params);
}

export async function createAdminUser(data: {
  email: string;
  displayName: string;
  role: AdminRole;
  temporaryPassword: string;
}) {
  const api = await getServerTrpcClient();
  return api.admin.createAdminUser.mutate(data);
}

export async function updateAdminRole(data: { adminId: string; newRole: AdminRole }) {
  const api = await getServerTrpcClient();
  return api.admin.updateAdminRole.mutate(data);
}

export async function toggleAdminActive(data: { adminId: string }) {
  const api = await getServerTrpcClient();
  return api.admin.toggleAdminActive.mutate(data);
}

export async function resetAdminPassword(data: { adminId: string; newPassword: string }) {
  const api = await getServerTrpcClient();
  return api.admin.resetAdminPassword.mutate(data);
}
