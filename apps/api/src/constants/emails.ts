import process from 'node:process';

/** Default sender email for transactional emails */
export const FROM_EMAIL = process.env.FROM_EMAIL || 'PawMeet <noreply@pawmeet.io>';

/** Privacy-related inquiries (GDPR, data export) */
export const PRIVACY_EMAIL = 'privacy@pawmeet.io';

/** Default support email (used in admin settings) */
export const SUPPORT_EMAIL = 'support@pawmeet.io';

/** Contact form recipient */
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@cervera.studio';

/** Waitlist notification recipient */
export const WAITLIST_NOTIFY_EMAIL = process.env.WAITLIST_NOTIFY_EMAIL || 'info@cervera.studio';

/** Admin panel login URL */
export const ADMIN_LOGIN_URL = process.env.ADMIN_URL || 'https://admin.pawmeet.io';
