/**
 * Single source of truth for locale configuration across all apps.
 * Every app imports from here — never define locales locally.
 */

export const LOCALES = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
  ro: 'Română',
} as const;

export type Locale = keyof typeof LOCALES;

export const LOCALE_CODES = Object.keys(LOCALES) as [Locale, ...Locale[]];

export const DEFAULT_LOCALE: Locale = 'it';

/** BCP 47 language tags for Intl APIs */
export const LOCALE_TAGS: Record<Locale, string> = {
  it: 'it-IT',
  en: 'en-GB',
  es: 'es-ES',
  ro: 'ro-RO',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in LOCALES;
}
