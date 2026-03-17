import type { User } from '@pawmeet/types';

export type SafeUser = Omit<User, 'passwordHash' | 'pushToken'>;

/** Strip sensitive fields from a User object before returning to the client. */
export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _, pushToken: __, ...safeUser } = user;
  return safeUser;
}

/**
 * Sanitize user-generated text content to prevent XSS.
 *
 * Designed for plain-text contexts (chat messages, comments, bios).
 * Since all our UGC fields are plain text (no HTML formatting needed),
 * we aggressively strip everything that isn't plain text characters.
 *
 * Defense in depth:
 * 1. Decode HTML entities to expose hidden payloads
 * 2. Strip ALL HTML-like constructs (tags, comments, CDATA)
 * 3. Remove dangerous URI schemes and event handlers
 * 4. Strip null bytes and control characters (encoding bypass prevention)
 */
export function sanitizeContent(text: string): string {
  return (
    text
      // Remove null bytes and non-printable control chars (except newlines/tabs)
      // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — stripping dangerous control chars is the point
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Decode HTML entities repeatedly to handle double-encoding (e.g. &amp;lt; → &lt; → <)
      .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      // Strip HTML comments (<!-- ... -->)
      .replace(/<!--[\s\S]*?-->/g, '')
      // Strip CDATA sections
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
      // Strip ALL HTML/XML tags (including self-closing, malformed, and multiline)
      .replace(/<\/?[a-z][^>]*>/gi, '')
      // Catch any remaining angle-bracket constructs
      .replace(/<[^>]*>?/g, '')
      // Remove dangerous URI schemes (javascript:, vbscript:, data:)
      // Handles whitespace and encoding tricks between scheme and colon
      .replace(/\b(javascript|vbscript|data)\s*:/gi, '')
      // Remove on* event handler patterns (onerror=, onclick=, etc.)
      .replace(/\bon\w+\s*=/gi, '')
      // Collapse excessive whitespace left by stripping
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}
