'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';

export interface TicketDetail {
  id: string;
  subject: string;
  category: string;
  status: string;
  userId: string | null;
  userName: string | null;
  guestName: string | null;
  guestEmail: string | null;
  assignedTo: string | null;
  assignedAdminName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: string;
  senderId: string | null;
  senderName: string | null;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketMessagesResult {
  messages: TicketMessage[];
  ticket: TicketDetail;
  nextCursor: string | null;
}

export async function fetchTicketDetail(ticketId: string): Promise<TicketDetail> {
  const api = await getServerTrpcClient();
  const result = await api.support.getTicket.query({ ticketId });
  const ticket = (result as Record<string, unknown>).ticket ?? result;
  return {
    id: String((ticket as Record<string, unknown>).id ?? ticketId),
    subject: String((ticket as Record<string, unknown>).subject ?? ''),
    category: String((ticket as Record<string, unknown>).category ?? 'general'),
    status: String((ticket as Record<string, unknown>).status ?? 'open'),
    userId: (ticket as Record<string, unknown>).userId
      ? String((ticket as Record<string, unknown>).userId)
      : null,
    userName: (ticket as Record<string, unknown>).userName
      ? String((ticket as Record<string, unknown>).userName)
      : null,
    guestName: (ticket as Record<string, unknown>).guestName
      ? String((ticket as Record<string, unknown>).guestName)
      : null,
    guestEmail: (ticket as Record<string, unknown>).guestEmail
      ? String((ticket as Record<string, unknown>).guestEmail)
      : null,
    assignedTo: (ticket as Record<string, unknown>).assignedTo
      ? String((ticket as Record<string, unknown>).assignedTo)
      : null,
    assignedAdminName: (ticket as Record<string, unknown>).assignedAdminName
      ? String((ticket as Record<string, unknown>).assignedAdminName)
      : null,
    createdAt: String((ticket as Record<string, unknown>).createdAt ?? ''),
    updatedAt: String((ticket as Record<string, unknown>).updatedAt ?? ''),
  };
}

export async function fetchTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const api = await getServerTrpcClient();
  const result = await api.support.getAdminTicketMessages.query({ ticketId, limit: 50 });
  const messages = (result as Record<string, unknown>).messages ?? result;
  return (messages as Record<string, unknown>[]).map((m) => ({
    id: String(m.id),
    ticketId: String(m.ticketId),
    senderType: String(m.senderType),
    senderId: m.senderId ? String(m.senderId) : null,
    senderName: m.senderName ? String(m.senderName) : null,
    content: String(m.content),
    isInternal: Boolean(m.isInternal),
    createdAt: String(m.createdAt),
  }));
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

export async function assignTicketAction(ticketId: string, adminId: string | null): Promise<void> {
  const api = await getServerTrpcClient();
  await api.support.assign.mutate({ ticketId, adminId });
  revalidatePath(`/support/${ticketId}`);
  revalidatePath('/support');
}
