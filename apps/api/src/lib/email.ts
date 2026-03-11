import { Resend } from 'resend';

const FROM_EMAIL = process.env.FROM_EMAIL || 'DogWalk <noreply@dogwalk.app>';

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
export async function sendVerificationOtp(email: string, code: string): Promise<void> {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Il tuo codice di verifica - DogWalk',
    html: `
      <h2>Codice di verifica DogWalk</h2>
      <p>Usa il codice qui sotto per verificare la tua email:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px 0;">${code}</p>
      <p>Il codice scade tra 5 minuti.</p>
      <p>Se non hai creato un account, ignora questa email.</p>
    `,
  });
}

/**
 * Send a password reset OTP email.
 */
export async function sendPasswordResetOtp(email: string, code: string): Promise<void> {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Codice di reset password - DogWalk',
    html: `
      <h2>Reset password DogWalk</h2>
      <p>Usa il codice qui sotto per reimpostare la tua password:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px 0;">${code}</p>
      <p>Il codice scade tra 5 minuti.</p>
      <p>Se non hai richiesto il reset, ignora questa email.</p>
    `,
  });
}

/**
 * Send account deletion confirmation email (GDPR Art. 17 acknowledgment).
 */
export async function sendAccountDeletedConfirmation(
  email: string,
  displayName: string,
): Promise<void> {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Il tuo account DogWalk è stato disattivato',
    html: `
      <h2>Ciao ${displayName},</h2>
      <p>Confermiamo che il tuo account DogWalk è stato disattivato con successo.</p>
      <p>I tuoi dati personali verranno eliminati definitivamente entro 30 giorni, come previsto dal GDPR (Art. 17).</p>
      <p>Se cambi idea, puoi contattarci entro 30 giorni all'indirizzo <a href="mailto:privacy@dogwalk.app">privacy@dogwalk.app</a> per richiedere il ripristino.</p>
      <p>Grazie per aver fatto parte della community DogWalk.</p>
    `,
  });
}
