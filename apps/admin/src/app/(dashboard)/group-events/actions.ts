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

export async function fetchEventSponsors(eventId: string) {
  const api = await getServerTrpcClient();
  const result = await api.admin.listEventSponsors.query({ eventId });
  return result.data;
}

export async function addSponsorToEvent(
  eventId: string,
  organizationId: string,
  tier: string,
  logoPlacement: string,
) {
  const api = await getServerTrpcClient();
  await api.admin.addEventSponsor.mutate({
    eventId,
    organizationId,
    tier: tier as 'title' | 'gold' | 'silver' | 'partner',
    logoPlacement: logoPlacement as 'header' | 'footer' | 'banner',
  });
  revalidatePath(`/group-events/${eventId}`);
  return { success: true };
}

export async function removeSponsorFromEvent(eventId: string, organizationId: string) {
  const api = await getServerTrpcClient();
  await api.admin.removeEventSponsor.mutate({ eventId, organizationId });
  revalidatePath(`/group-events/${eventId}`);
  return { success: true };
}
