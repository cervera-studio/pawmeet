/**
 * Extract unique hashtags from text.
 * Matches #word patterns (letters, numbers, underscores). Case-insensitive, returns lowercase.
 */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u00C0-\u024F]+/g);
  if (!matches) return [];

  const unique = new Set(matches.map((tag) => tag.slice(1).toLowerCase()));
  return [...unique];
}
