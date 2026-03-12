'use server';

import type { PaginatedResult } from '@pawmeet/types';
import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';
import type { AdminGroupEventListItem, ListGroupEventsParams } from '@/repositories/interfaces';

export async function fetchGroupEvents(
  params: ListGroupEventsParams,
): Promise<PaginatedResult<AdminGroupEventListItem>> {
  const api = await getServerTrpcClient();
  const result = await api.admin.listGroupEvents.query(params);
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}

export async function cancelGroupEvent(eventId: string) {
  const api = await getServerTrpcClient();
  await api.admin.cancelGroupEvent.mutate({ eventId });
  revalidatePath('/group-events');
  revalidatePath(`/group-events/${eventId}`);
  return { success: true };
}

export async function removeParticipant(participantId: string, eventId: string) {
  const api = await getServerTrpcClient();
  await api.admin.removeEventParticipant.mutate({ participantId });
  revalidatePath(`/group-events/${eventId}`);
  return { success: true };
}
