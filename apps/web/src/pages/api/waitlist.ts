import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const AUDIENCE_ID = import.meta.env.RESEND_WAITLIST_AUDIENCE_ID;
const NOTIFY_EMAIL = import.meta.env.WAITLIST_NOTIFY_EMAIL || 'team@pawmeet.io';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';

  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: 'Email non valida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Add to Resend audience (waitlist) if configured
    if (AUDIENCE_ID) {
      await resend.contacts.create({ audienceId: AUDIENCE_ID, email });
    }

    // Notify team
    await resend.emails.send({
      from: 'PawMeet <noreply@pawmeet.io>',
      to: NOTIFY_EMAIL,
      subject: `Nuova iscrizione waitlist: ${email}`,
      text: `Nuova iscrizione alla waitlist PawMeet.\n\nEmail: ${email}\nData: ${new Date().toISOString()}`,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
