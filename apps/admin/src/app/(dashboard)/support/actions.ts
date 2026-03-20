'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';

export interface SupportTicketListItem {
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
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface SupportTicketsResult {
  data: SupportTicketListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface FetchSupportTicketsParams {
  page: number;
  pageSize: number;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  category?: 'general' | 'bug' | 'account' | 'safety' | 'billing' | 'other';
}

export async function fetchSupportTickets(
  params: FetchSupportTicketsParams,
): Promise<SupportTicketsResult> {
  const api = await getServerTrpcClient();
  const result = await api.support.listTickets.query({
    page: params.page,
    pageSize: params.pageSize,
    status: params.status,
    category: params.category,
  });

  return {
    data: result.data.map((t: Record<string, unknown>) => ({
      id: String(t.id),
      subject: String(t.subject),
      category: String(t.category),
      status: String(t.status),
      userId: t.userId ? String(t.userId) : null,
      userName: t.userName ? String(t.userName) : null,
      guestName: t.guestName ? String(t.guestName) : null,
      guestEmail: t.guestEmail ? String(t.guestEmail) : null,
      assignedTo: t.assignedTo ? String(t.assignedTo) : null,
      assignedAdminName: t.assignedAdminName ? String(t.assignedAdminName) : null,
      messageCount: Number(t.messageCount ?? 0),
      lastMessageAt: t.lastMessageAt ? String(t.lastMessageAt) : null,
      createdAt: String(t.createdAt),
    })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };
}

export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
): Promise<void> {
  const api = await getServerTrpcClient();
  await api.support.updateStatus.mutate({ ticketId, status });
  revalidatePath('/support');
}

export async function assignTicket(ticketId: string, adminId: string | null): Promise<void> {
  const api = await getServerTrpcClient();
  await api.support.assign.mutate({ ticketId, adminId });
  revalidatePath('/support');
}
