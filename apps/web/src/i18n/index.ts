import en from './en';
import type { TranslationDictionary } from './it';
import it from './it';
import type { Locale } from './locales';
import { DEFAULT_LOCALE } from './locales';

export type { TranslationDictionary } from './it';
export type { Locale } from './locales';
export { DEFAULT_LOCALE, LOCALES } from './locales';

const translations: Record<Locale, TranslationDictionary> = { it, en };

/** Get the full translation dictionary for a given locale */
export function t(locale: Locale): TranslationDictionary {
  return translations[locale];
}

/** Extract locale from the current URL pathname */
export function getLocaleFromUrl(url: URL): Locale {
  const [, firstSegment] = url.pathname.split('/');
  if (firstSegment === 'en') return 'en';
  return DEFAULT_LOCALE;
}

/** Build a localized path for the given locale */
export function getLocalizedPath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  // Already prefixed
  if (path.startsWith('/en')) return path;
  return `/en${path === '/' ? '' : path}`;
}
