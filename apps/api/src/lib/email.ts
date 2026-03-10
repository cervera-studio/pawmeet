import { Resend } from 'resend';

const FROM_EMAIL = process.env.FROM_EMAIL || 'DogWalk <noreply@dogwalk.app>';
const APP_URL = process.env.APP_URL || 'https://dogwalk.app';

/** Lazy-initialized Resend client to avoid env-var checks at import time */
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/** Email verification link expiry: 24 hours */
export const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Password reset link expiry: 1 hour */
export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

/** Token length in bytes (generates 64-char hex string) */
export const TOKEN_BYTES = 32;

/**
 * Generate a secure random token (hex string).
 */
export function generateToken(bytes = TOKEN_BYTES): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

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
 * Send an email verification message.
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Conferma la tua email - DogWalk',
    html: `
      <h2>Benvenuto su DogWalk!</h2>
      <p>Clicca il link qui sotto per confermare la tua email:</p>
      <p><a href="${verifyUrl}">Conferma email</a></p>
      <p>Il link scade tra 24 ore.</p>
      <p>Se non hai creato un account, ignora questa email.</p>
    `,
  });
}

/**
 * Send a password reset email.
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reimposta la tua password - DogWalk',
    html: `
      <h2>Reimposta password</h2>
      <p>Hai richiesto di reimpostare la tua password. Clicca il link qui sotto:</p>
      <p><a href="${resetUrl}">Reimposta password</a></p>
      <p>Il link scade tra 1 ora.</p>
      <p>Se non hai richiesto il reset, ignora questa email.</p>
    `,
  });
}
