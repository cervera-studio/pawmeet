import type { User } from '@dogwalk/types';

export type SafeUser = Omit<User, 'passwordHash' | 'pushToken'>;

/** Strip sensitive fields from a User object before returning to the client. */
export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _, pushToken: __, ...safeUser } = user;
  return safeUser;
}

/**
 * Sanitize user-generated text content to prevent XSS.
 *
 * Strips HTML tags, event handler attributes, and common bypass patterns.
 * Designed for plain-text contexts (chat messages, comments, bios).
 */
export function sanitizeContent(text: string): string {
  return (
    text
      // Decode common HTML entities that could hide tags
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      // Strip all HTML tags (including self-closing and malformed)
      .replace(/<\/?[^>]+(>|$)/g, '')
      // Remove javascript: / vbscript: / data: URI schemes
      .replace(/\b(javascript|vbscript|data)\s*:/gi, '')
      // Remove on* event handler patterns (onerror=, onclick=, etc.)
      .replace(/\bon\w+\s*=/gi, '')
      // Collapse excessive whitespace left by stripping
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}
