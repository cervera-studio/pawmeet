import process from 'node:process';
import { waitlistSubscribers } from '@pawmeet/db';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { Resend } from 'resend';
import { CONTACT_EMAIL, FROM_EMAIL, WAITLIST_NOTIFY_EMAIL } from '../constants/emails.js';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { supportDeps as SupportDeps } from '../container/index.js';
import { db } from '../lib/db.js';
import { trackEvent } from '../lib/track-event.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WAITLIST_EMAILS: Record<string, { subject: string; body: string[] }> = {
  it: {
    subject: 'Benvenuto nella community PawMeet! 🐾',
    body: [
      'Ciao!',
      '',
      "Grazie per esserti unito alla waitlist di PawMeet. Sei ufficialmente dentro — e non vediamo l'ora di farti scoprire come trovare i compagni di passeggiata perfetti per il tuo amico a quattro zampe.",
      '',
      "Quello che stiamo costruendo è semplice ma speciale: un posto dove i cani (e i loro umani) si connettono in base a quello che veramente conta — il carattere, l'energia, il tipo di avventure che amate insieme.",
      '',
      "Il lancio arriva a giugno. Nel frattempo, tieni d'occhio la tua inbox — potremmo avere qualche sorpresa per te.",
      '',
      'Grazie di crederci fin da ora.',
      '',
      'Con stima,',
      'Il team di PawMeet',
    ],
  },
  en: {
    subject: 'Welcome to the PawMeet community! 🐾',
    body: [
      'Hey!',
      '',
      "Thanks for joining the PawMeet waitlist. You're officially in — and we can't wait to show you how to find the perfect walking companions for your four-legged friend.",
      '',
      "What we're building is simple but special: a place where dogs (and their humans) connect based on what truly matters — personality, energy, and the kind of adventures you love together.",
      '',
      'Launch is coming in June. In the meantime, keep an eye on your inbox — we might have a few surprises for you.',
      '',
      'Thanks for believing in us from the start.',
      '',
      'Warm regards,',
      'The PawMeet Team',
    ],
  },
  es: {
    subject: '¡Bienvenido a la comunidad PawMeet! 🐾',
    body: [
      '¡Hola!',
      '',
      'Gracias por unirte a la waitlist de PawMeet. Ya estás dentro — y no vemos la hora de mostrarte cómo encontrar los compañeros de paseo perfectos para tu amigo de cuatro patas.',
      '',
      'Lo que estamos construyendo es simple pero especial: un lugar donde los perros (y sus humanos) se conectan por lo que realmente importa — el carácter, la energía, el tipo de aventuras que aman juntos.',
      '',
      'El lanzamiento llega en junio. Mientras tanto, estate atento a tu bandeja de entrada — podríamos tener alguna sorpresa para ti.',
      '',
      'Gracias por creer en nosotros desde el principio.',
      '',
      'Con cariño,',
      'El equipo de PawMeet',
    ],
  },
  ro: {
    subject: 'Bine ai venit în comunitatea PawMeet! 🐾',
    body: [
      'Salut!',
      '',
      'Mulțumim că te-ai înscris pe lista de așteptare PawMeet. Ești oficial pe listă — și abia așteptăm să îți arătăm cum să găsești companionii de plimbare perfecți pentru prietenul tău cu patru labe.',
      '',
      'Ceea ce construim este simplu, dar special: un loc unde câinii (și oamenii lor) se conectează pe baza a ceea ce contează cu adevărat — personalitatea, energia și tipul de aventuri pe care le iubiți împreună.',
      '',
      'Lansarea vine în iunie. Între timp, fii cu ochii pe inbox — s-ar putea să avem câteva surprize pentru tine.',
      '',
      'Mulțumim că ai crezut în noi de la început.',
      '',
      'Cu drag,',
      'Echipa PawMeet',
    ],
  },
};

/**
 * Public web routes — called by the landing page (pawmeet.io).
 * No authentication required.
 */
export function createWebRoutes(deps: typeof SupportDeps) {
  const web = new Hono();
  const resend = new Resend(process.env.RESEND_API_KEY);

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
      return c.json({ error: ERROR_MESSAGES.INVALID_DATA }, 400);
    }

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
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

      trackEvent('web_contact_submitted', null, { hasSubject: !!subject });
      return c.json({ ok: true });
    } catch {
      return c.json({ error: ERROR_MESSAGES.INTERNAL_ERROR }, 500);
    }
  });

  // ── Waitlist signup ─────────────────────────────────────────────────
  web.post('/waitlist', async (c) => {
    const body = await c.req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const locale = typeof body?.locale === 'string' ? body.locale : 'it';

    if (!EMAIL_RE.test(email)) {
      return c.json({ error: ERROR_MESSAGES.INVALID_EMAIL }, 400);
    }

    try {
      // Check if already subscribed
      const existing = await db
        .select({ id: waitlistSubscribers.id })
        .from(waitlistSubscribers)
        .where(eq(waitlistSubscribers.email, email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        // Already subscribed — respond OK silently
        return c.json({ ok: true });
      }

      // Save to database
      await db.insert(waitlistSubscribers).values({
        email: email.toLowerCase(),
        locale,
        source: 'landing',
      });

      // Welcome email to the subscriber (localized)
      // biome-ignore lint/style/noNonNullAssertion: 'it' key is always defined in WAITLIST_EMAILS
      const welcomeEmail = WAITLIST_EMAILS[locale] ?? WAITLIST_EMAILS.it!;
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: welcomeEmail.subject,
        text: welcomeEmail.body.join('\n'),
      });

      // Notify team
      await resend.emails.send({
        from: FROM_EMAIL,
        to: WAITLIST_NOTIFY_EMAIL,
        subject: `Nuova iscrizione waitlist: ${email}`,
        text: `Nuova iscrizione alla waitlist PawMeet.\n\nEmail: ${email}\nData: ${new Date().toISOString()}`,
      });

      trackEvent('web_waitlist_signed_up', null, { locale });
      return c.json({ ok: true });
    } catch {
      return c.json({ error: ERROR_MESSAGES.INTERNAL_ERROR }, 500);
    }
  });

  return web;
}
