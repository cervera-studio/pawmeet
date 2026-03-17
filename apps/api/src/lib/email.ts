import { DEFAULT_LOCALE, isLocale, type Locale } from '@pawmeet/i18n';
import emailEn from '@pawmeet/i18n/locales/en/email.json' with { type: 'json' };
import emailEs from '@pawmeet/i18n/locales/es/email.json' with { type: 'json' };
import emailIt from '@pawmeet/i18n/locales/it/email.json' with { type: 'json' };
import emailRo from '@pawmeet/i18n/locales/ro/email.json' with { type: 'json' };
import { Resend } from 'resend';

const FROM_EMAIL = process.env.FROM_EMAIL || 'PawMeet <noreply@pawmeet.io>';
const PRIVACY_EMAIL = 'privacy@pawmeet.io';

type EmailMessages = typeof emailIt;

const emailMessages: Record<Locale, EmailMessages> = {
  it: emailIt,
  en: emailEn,
  es: emailEs as EmailMessages,
  ro: emailRo as EmailMessages,
};

function getEmailMessages(locale?: string): EmailMessages {
  return emailMessages[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

/** Lazy-initialized Resend client to avoid env-var checks at import time */
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/** Email verification OTP expiry: 5 minutes */
export const EMAIL_VERIFICATION_OTP_EXPIRY_MS = 5 * 60 * 1000;

/** Password reset OTP expiry: 5 minutes */
export const PASSWORD_RESET_OTP_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Hash a token using SHA-256 for secure storage.
 */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate an 8-digit OTP code (100M combinations vs 1M for 6-digit).
 */
export function generateOtp(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  const b0 = array[0] ?? 0;
  const b1 = array[1] ?? 0;
  const b2 = array[2] ?? 0;
  const b3 = array[3] ?? 0;
  const num = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
  return String(num % 100_000_000).padStart(8, '0');
}

/**
 * Send an email verification OTP.
 */
export async function sendVerificationOtp(
  email: string,
  code: string,
  locale?: string,
): Promise<void> {
  const t = getEmailMessages(locale).verification;
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: t.subject,
    html: `
      <h2>${t.heading}</h2>
      <p>${t.body}</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px 0;">${code}</p>
      <p>${t.expiry}</p>
      <p>${t.ignore}</p>
    `,
  });
}

/**
 * Send a password reset OTP email.
 */
export async function sendPasswordResetOtp(
  email: string,
  code: string,
  locale?: string,
): Promise<void> {
  const t = getEmailMessages(locale).passwordReset;
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: t.subject,
    html: `
      <h2>${t.heading}</h2>
      <p>${t.body}</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px 0;">${code}</p>
      <p>${t.expiry}</p>
      <p>${t.ignore}</p>
    `,
  });
}

/**
 * GDPR export ready — download link email.
 */
export async function sendGdprExportReady(
  email: string,
  displayName: string,
  downloadUrl: string,
  locale?: string,
): Promise<void> {
  const t = getEmailMessages(locale).gdprExportReady;
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: t.subject,
    html: `
      <h2>${t.greeting.replace('{displayName}', displayName)}</h2>
      <p>${t.body}</p>
      <p style="text-align: center; padding: 16px 0;">
        <a href="${downloadUrl}" style="background-color: #065F46; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">${t.cta}</a>
      </p>
      <p><strong>${t.expiry}</strong></p>
      <p>${t.legal}</p>
      <p>${t.notRequested} <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a>.</p>
    `,
  });
}

/**
 * GDPR export failed — notification email.
 */
export async function sendGdprExportFailed(
  email: string,
  displayName: string,
  locale?: string,
): Promise<void> {
  const t = getEmailMessages(locale).gdprExportFailed;
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: t.subject,
    html: `
      <h2>${t.greeting.replace('{displayName}', displayName)}</h2>
      <p>${t.body}</p>
      <p>${t.retry} <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a>.</p>
    `,
  });
}

/**
 * Send account deletion confirmation email (GDPR Art. 17 acknowledgment).
 */
export async function sendAccountDeletedConfirmation(
  email: string,
  displayName: string,
  locale?: string,
): Promise<void> {
  const t = getEmailMessages(locale).accountDeleted;
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: t.subject,
    html: `
      <h2>${t.greeting.replace('{displayName}', displayName)}</h2>
      <p>${t.body}</p>
      <p>${t.retention}</p>
      <p>${t.undo} <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a> ${t.undoSuffix}</p>
      <p>${t.farewell}</p>
    `,
  });
}
