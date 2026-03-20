import { createGuestSupportTicketSchema } from '@pawmeet/validation';
import { Hono } from 'hono';
import type { supportDeps } from '../container/index.js';
import { trackEvent } from '../lib/track-event.js';

export function createSupportRoutes(deps: typeof supportDeps) {
  const support = new Hono();

  support.post('/guest-ticket', async (c) => {
    const body = await c.req.json();
    const parsed = createGuestSupportTicketSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Dati non validi', details: parsed.error.issues }, 400);
    }

    const { name, email, subject, category, message } = parsed.data;

    const result = await deps.createGuestTicket(name, email, subject, category, message);
    if (!result.success) {
      return c.json({ error: result.error.message }, result.error.status as 400 | 404 | 500);
    }

    trackEvent('support_ticket_created', null, { category, source: 'web' });

    return c.json({ ticketId: result.data.id }, 201);
  });

  return support;
}
