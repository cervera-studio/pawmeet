import process from 'node:process';
import { Hono } from 'hono';
import { Resend } from 'resend';
import type { supportDeps as SupportDeps } from '../container/index.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public web routes — called by the landing page (pawmeet.io).
 * No authentication required.
 */
export function createWebRoutes(deps: typeof SupportDeps) {
  const web = new Hono();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@cervera.studio';
  const NOTIFY_EMAIL = process.env.WAITLIST_NOTIFY_EMAIL || 'info@cervera.studio';
  const AUDIENCE_ID = process.env.RESEND_WAITLIST_AUDIENCE_ID;

  // ── Contact form ────────────────────────────────────────────────────
  web.post('/contact', async (c) => {
    const body = await c.req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';

    if (
      !name ||
      name.length > 200 ||
      !EMAIL_RE.test(email) ||
      message.length < 10 ||
      message.length > 5000
    ) {
      return c.json({ error: 'Dati non validi' }, 400);
    }

    try {
      await resend.emails.send({
        from: 'PawMeet Contatti <noreply@pawmeet.io>',
        to: CONTACT_EMAIL,
        replyTo: email,
        subject: subject ? `[Contatto] ${subject}` : `Contatto da ${name}`,
        text: [
          'Nuovo messaggio dal form contatti PawMeet.',
          '',
          `Nome: ${name}`,
          `Email: ${email}`,
          ...(subject ? [`Oggetto: ${subject}`] : []),
          `Data: ${new Date().toISOString()}`,
          '',
          'Messaggio:',
          message,
        ].join('\n'),
      });

      // Create guest support ticket (best-effort)
      try {
        await deps.createGuestTicket(
          name,
          email,
          subject || `Contatto da ${name}`,
          'general',
          message,
        );
      } catch {
        // non-blocking
      }

      // TODO: add web_contact_submitted to AnalyticsEventMap
      return c.json({ ok: true });
    } catch {
      return c.json({ error: 'Errore interno' }, 500);
    }
  });

  // ── Waitlist signup ─────────────────────────────────────────────────
  web.post('/waitlist', async (c) => {
    const body = await c.req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!EMAIL_RE.test(email)) {
      return c.json({ error: 'Email non valida' }, 400);
    }

    try {
      if (AUDIENCE_ID) {
        await resend.contacts.create({ audienceId: AUDIENCE_ID, email });
      }

      await resend.emails.send({
        from: 'PawMeet <noreply@pawmeet.io>',
        to: NOTIFY_EMAIL,
        subject: `Nuova iscrizione waitlist: ${email}`,
        text: `Nuova iscrizione alla waitlist PawMeet.\n\nEmail: ${email}\nData: ${new Date().toISOString()}`,
      });

      // TODO: add waitlist_signup to AnalyticsEventMap
      return c.json({ ok: true });
    } catch {
      return c.json({ error: 'Errore interno' }, 500);
    }
  });

  return web;
}
