/** Mask an email address: `user@example.com` -> `u***@example.com` */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!(local && domain)) return '***';
  return `${local[0]}***@${domain}`;
}

/** Mask a phone number: `+39 333 1234567` -> `+39 ***4567` */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (phone.length <= 4) return '***';
  return `***${phone.slice(-4)}`;
}
