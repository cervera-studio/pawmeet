// ── Support Ticket Status ────────────────────────────────────────────────────

export const SUPPORT_TICKET_STATUS = {
  Open: 'open',
  InProgress: 'in_progress',
  Resolved: 'resolved',
  Closed: 'closed',
} as const;

export type SupportTicketStatus =
  (typeof SUPPORT_TICKET_STATUS)[keyof typeof SUPPORT_TICKET_STATUS];

// ── Support Ticket Category ─────────────────────────────────────────────────

export const SUPPORT_TICKET_CATEGORY = {
  General: 'general',
  Bug: 'bug',
  Account: 'account',
  Safety: 'safety',
  Billing: 'billing',
  Other: 'other',
} as const;

export type SupportTicketCategory =
  (typeof SUPPORT_TICKET_CATEGORY)[keyof typeof SUPPORT_TICKET_CATEGORY];

// ── Support Message Sender Type ─────────────────────────────────────────────

export const SUPPORT_MESSAGE_SENDER_TYPE = {
  User: 'user',
  Admin: 'admin',
  System: 'system',
} as const;

export type SupportMessageSenderType =
  (typeof SUPPORT_MESSAGE_SENDER_TYPE)[keyof typeof SUPPORT_MESSAGE_SENDER_TYPE];

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  userId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  assignedTo: string | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderType: SupportMessageSenderType;
  senderId: string | null;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface SupportTicketListItem {
  id: string;
  userId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: string | null;
  messageCount: number;
  userName: string | null;
  userEmail: string | null;
}
