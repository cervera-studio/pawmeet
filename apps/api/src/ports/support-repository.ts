import type {
  SupportMessage,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketListItem,
  SupportTicketStatus,
} from '@pawmeet/types';

export interface CreateTicketInput {
  userId: string;
  subject: string;
  category: SupportTicketCategory;
}

export interface CreateGuestTicketInput {
  guestName: string;
  guestEmail: string;
  subject: string;
  category: SupportTicketCategory;
}

export interface AddMessageInput {
  ticketId: string;
  senderType: 'user' | 'admin' | 'system';
  senderId: string | null;
  content: string;
  isInternal?: boolean;
}

export interface ListTicketsQuery {
  page: number;
  pageSize: number;
  status?: SupportTicketStatus;
  category?: SupportTicketCategory;
  assignedTo?: string;
}

export interface PaginatedTickets {
  data: SupportTicketListItem[];
  total: number;
}

export interface PaginatedMessages {
  messages: SupportMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SupportRepository {
  createTicket(input: CreateTicketInput): Promise<SupportTicket>;
  createGuestTicket(input: CreateGuestTicketInput): Promise<SupportTicket>;
  addMessage(input: AddMessageInput): Promise<SupportMessage>;
  getTicketById(ticketId: string): Promise<SupportTicket | null>;
  getTicketByIdForUser(ticketId: string, userId: string): Promise<SupportTicket | null>;
  listTicketsByUser(userId: string): Promise<SupportTicket[]>;
  listTickets(query: ListTicketsQuery): Promise<PaginatedTickets>;
  getMessages(
    ticketId: string,
    cursor: string | null,
    limit: number,
    includeInternal: boolean,
  ): Promise<PaginatedMessages>;
  updateStatus(ticketId: string, status: SupportTicketStatus): Promise<SupportTicket>;
  assignTicket(ticketId: string, adminId: string | null): Promise<SupportTicket>;
  getTicketOwnerUserId(ticketId: string): Promise<string | null>;
  countMessagesByTicket(ticketId: string): Promise<number>;
}
