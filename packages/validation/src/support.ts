import { MAX_EMAIL_LENGTH } from '@pawmeet/config';
import { z } from 'zod';

export const createSupportTicketSchema = z.object({
  subject: z.string().min(1).max(300),
  category: z.enum(['general', 'bug', 'account', 'safety', 'billing', 'other']).default('general'),
  message: z.string().min(1).max(5000),
});

export const createGuestSupportTicketSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email().max(MAX_EMAIL_LENGTH),
  subject: z.string().min(1).max(300),
  category: z.enum(['general', 'bug', 'account', 'safety', 'billing', 'other']).default('general'),
  message: z.string().min(1).max(5000),
});

export const sendSupportMessageSchema = z.object({
  ticketId: z.uuid(),
  content: z.string().min(1).max(5000),
});

export const adminReplySupportSchema = z.object({
  ticketId: z.uuid(),
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
});

export const updateTicketStatusSchema = z.object({
  ticketId: z.uuid(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});

export const assignTicketSchema = z.object({
  ticketId: z.uuid(),
  adminId: z.uuid().nullable(),
});

export const listSupportTicketsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  category: z.enum(['general', 'bug', 'account', 'safety', 'billing', 'other']).optional(),
  assignedTo: z.uuid().optional(),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type CreateGuestSupportTicketInput = z.infer<typeof createGuestSupportTicketSchema>;
export type SendSupportMessageInput = z.infer<typeof sendSupportMessageSchema>;
export type AdminReplySupportInput = z.infer<typeof adminReplySupportSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type ListSupportTicketsInput = z.infer<typeof listSupportTicketsSchema>;
