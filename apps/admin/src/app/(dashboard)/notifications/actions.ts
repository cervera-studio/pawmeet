'use server';

import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchNotificationStats() {
  const api = await getServerTrpcClient();
  return api.admin.getNotificationStats.query();
}

export async function sendBroadcast(data: { title: string; body: string }) {
  const api = await getServerTrpcClient();
  return api.admin.sendBroadcastNotification.mutate(data);
}

export async function sendTargeted(data: { title: string; body: string; userIds: string[] }) {
  const api = await getServerTrpcClient();
  return api.admin.sendTargetedNotification.mutate(data);
}
