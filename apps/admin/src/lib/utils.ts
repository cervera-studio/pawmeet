import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely translates a dynamic i18n key with a prefix.
 * Falls back to the raw value if the key doesn't exist.
 *
 * Eliminates the `t(\`prefix.\${value}\` as 'prefix.literal')` cast pattern.
 */
export function translateDynamic(
  t: { has: (key: string) => boolean } & ((key: never) => string),
  prefix: string,
  value: string,
): string {
  const key = `${prefix}.${value}`;
  // biome-ignore lint/suspicious/noExplicitAny: dynamic i18n key lookup requires cast
  return t.has(key) ? (t as any)(key) : value;
}
