'use server';

import type { ApiClient } from '@pawmeet/api-client';
import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';

/** Infer the return type of `support.getAdminTicketMessages.query` */
type GetAdminMessagesResult = Awaited<
  ReturnType<ApiClient['support']['getAdminTicketMessages']['query']>
>;

/** Infer the ticket shape from listTickets.data items */
type ListTicketsResult = Awaited<ReturnType<ApiClient['support']['listTickets']['query']>>;
type TicketListItem = ListTicketsResult['data'][number];

export type TicketMessage = GetAdminMessagesResult['messages'][number];

/** Ticket detail info — sourced from the listTickets endpoint (which includes user/admin join data). */
export type TicketDetail = TicketListItem;

export async function fetchTicketDetail(ticketId: string): Promise<TicketDetail> {
  const api = await getServerTrpcClient();
  // Use listTickets with page size 1 to fetch the ticket with full join data
  // (userName, userEmail, assignedTo, messageCount, etc.)
  const result = await api.support.listTickets.query({
    page: 1,
    pageSize: 1,
  });

  // Find the specific ticket — listTickets returns all tickets sorted by updatedAt,
  // so we need to search; if not in first page, fetch by getting all on a larger page.
  // For a single ticket lookup, a small search is sufficient.
  let ticket = result.data.find((t) => t.id === ticketId);

  if (!ticket) {
    // Broader search — the ticket may not be on the first page
    const broader = await api.support.listTickets.query({
      page: 1,
      pageSize: 100,
    });
    ticket = broader.data.find((t) => t.id === ticketId);
  }

  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  return ticket;
}

export async function fetchTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const api = await getServerTrpcClient();
  const result = await api.support.getAdminTicketMessages.query({ ticketId, limit: 50 });
  return result.messages;
}

export async function replyToTicket(
  ticketId: string,
  content: string,
  isInternal: boolean,
): Promise<void> {
  const api = await getServerTrpcClient();
  await api.support.reply.mutate({ ticketId, content, isInternal });
  revalidatePath(`/support/${ticketId}`);
}

export async function changeTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
): Promise<void> {
  const api = await getServerTrpcClient();
  await api.support.updateStatus.mutate({ ticketId, status });
  revalidatePath(`/support/${ticketId}`);
  revalidatePath('/support');
}

export async function markAdminRead(ticketId: string): Promise<void> {
  const api = await getServerTrpcClient();
  await api.support.markAdminRead.mutate({ ticketId });
}

export async function assignTicketAction(ticketId: string, adminId: string | null): Promise<void> {
  const api = await getServerTrpcClient();
  await api.support.assign.mutate({ ticketId, adminId });
  revalidatePath(`/support/${ticketId}`);
  revalidatePath('/support');
}
