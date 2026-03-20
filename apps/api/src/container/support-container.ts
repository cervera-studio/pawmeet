// Support domain: tickets and support messages

import { createAdminReplySupportTicket } from '../use-cases/admin-reply-support-ticket.js';
import { createAssignSupportTicket } from '../use-cases/assign-support-ticket.js';
import { createCreateGuestSupportTicket } from '../use-cases/create-guest-support-ticket.js';
import { createCreateSupportTicket } from '../use-cases/create-support-ticket.js';
import { createGetSupportTicketMessages } from '../use-cases/get-support-ticket-messages.js';
import { createListSupportTickets } from '../use-cases/list-support-tickets.js';
import { createListUserSupportTickets } from '../use-cases/list-user-support-tickets.js';
import { createSendSupportMessage } from '../use-cases/send-support-message.js';
import { createUpdateSupportTicketStatus } from '../use-cases/update-support-ticket-status.js';
import { emailService, supportRepo, userRepo } from './services.js';

export const supportDeps = {
  createTicket: createCreateSupportTicket({ supportRepo, emailService, userRepo }),
  createGuestTicket: createCreateGuestSupportTicket({ supportRepo, emailService }),
  sendMessage: createSendSupportMessage({ supportRepo }),
  adminReply: createAdminReplySupportTicket({ supportRepo }),
  updateStatus: createUpdateSupportTicketStatus({ supportRepo }),
  getMessages: createGetSupportTicketMessages({ supportRepo }),
  listUserTickets: createListUserSupportTickets({ supportRepo }),
  listTickets: createListSupportTickets({ supportRepo }),
  assignTicket: createAssignSupportTicket({ supportRepo }),
  markAdminMessagesRead: (ticketId: string) => supportRepo.markAdminMessagesRead(ticketId),
  markUserMessagesRead: (ticketId: string) => supportRepo.markUserMessagesRead(ticketId),
  getTicketOwnerUserId: (ticketId: string) => supportRepo.getTicketOwnerUserId(ticketId),
};
