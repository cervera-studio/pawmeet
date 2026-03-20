import type { User } from '@pawmeet/types';

export type SafeUser = Omit<User, 'passwordHash' | 'pushToken'>;

/** Strip sensitive fields from a User object before returning to the client. */
export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _, pushToken: __, ...safeUser } = user;
  return safeUser;
}

/** Decode all HTML entities in a single pass. */
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

/**
 * Sanitize user-generated text content to prevent XSS.
 *
 * Designed for plain-text contexts (chat messages, comments, bios).
 * Since all our UGC fields are plain text (no HTML formatting needed),
 * we aggressively strip everything that isn't plain text characters.
 *
 * Defense in depth:
 * 1. Decode HTML entities in a loop until stable (handles triple+ encoding)
 * 2. Strip ALL HTML-like constructs (tags, comments, CDATA)
 * 3. Remove dangerous URI schemes and event handlers
 * 4. Strip null bytes and control characters (encoding bypass prevention)
 */
export function sanitizeContent(text: string): string {
  // Remove null bytes and non-printable control chars (except newlines/tabs)
  let result = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Decode HTML entities in a loop until the output stabilizes.
  // This prevents triple-encoded payloads (e.g. &amp;amp;lt;) from bypassing.
  const MAX_DECODE_ITERATIONS = 10;
  for (let i = 0; i < MAX_DECODE_ITERATIONS; i++) {
    const decoded = decodeHtmlEntities(result);
    if (decoded === result) break;
    result = decoded;
  }

  return (
    result
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
