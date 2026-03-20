import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const CONTACT_EMAIL = import.meta.env.CONTACT_EMAIL || 'info@pawmeet.io';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (
    !name ||
    name.length > 200 ||
    !EMAIL_RE.test(email) ||
    message.length < 10 ||
    message.length > 5000
  ) {
    return new Response(JSON.stringify({ error: 'Dati non validi' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';

  try {
    await resend.emails.send({
      from: 'PawMeet Contatti <noreply@pawmeet.io>',
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: subject ? `[Contatto] ${subject}` : `Contatto da ${name}`,
      text: [
        `Nuovo messaggio dal form contatti PawMeet.`,
        ``,
        `Nome: ${name}`,
        `Email: ${email}`,
        ...(subject ? [`Oggetto: ${subject}`] : []),
        `Data: ${new Date().toISOString()}`,
        ``,
        `Messaggio:`,
        message,
      ].join('\n'),
    });

    // Create a guest support ticket via the API (best-effort, do not fail the response)
    const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
    try {
      await fetch(`${apiUrl}/api/support/guest-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject: subject || `Contatto da ${name}`,
          category: 'general',
          message,
        }),
      });
    } catch (ticketErr) {
      console.warn('Failed to create guest support ticket:', ticketErr);
    }

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
