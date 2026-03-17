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

export async function fetchGroupEvent(id: string) {
  const api = await getServerTrpcClient();
  try {
    return await api.admin.getGroupEvent.query({ id });
  } catch (error) {
    console.error('[fetchGroupEvent]', error);
    return null;
  }
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

export async function createOfficialEvent(input: {
  title: string;
  description?: string;
  scheduledAt: string;
  durationMin: number;
  location: string;
  latitude: number;
  longitude: number;
  maxParticipants: number;
  organizationId: string;
  coverImageUrl?: string;
  category: 'walk' | 'meetup' | 'training';
}) {
  const api = await getServerTrpcClient();
  const event = await api.admin.createOfficialEvent.mutate(input);
  revalidatePath('/group-events');
  return event;
}

export async function fetchVerifiedOrganizations() {
  const api = await getServerTrpcClient();
  const result = await api.admin.listOrganizations.query({
    page: 1,
    pageSize: 100,
  });
  return result.data.filter(
    (org: { isVerified: boolean; isActive: boolean }) => org.isVerified && org.isActive,
  );
}
