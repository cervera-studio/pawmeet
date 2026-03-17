import { isLocale } from '@pawmeet/i18n';
import en from './en.json';
import es from './es.json';
import it from './it.json';
import type { Locale } from './locales';
import { DEFAULT_LOCALE } from './locales';
import ro from './ro.json';

export type TranslationDictionary = typeof it;
export type { Locale } from './locales';
export { DEFAULT_LOCALE, LOCALES } from './locales';

const translations: Record<Locale, TranslationDictionary> = { it, en, es, ro };

/** Get the full translation dictionary for a given locale */
export function t(locale: Locale): TranslationDictionary {
  return translations[locale];
}

/** Extract locale from the current URL pathname */
export function getLocaleFromUrl(url: URL): Locale {
  const [, firstSegment] = url.pathname.split('/');
  if (isLocale(firstSegment) && firstSegment !== DEFAULT_LOCALE) return firstSegment;
  return DEFAULT_LOCALE;
}

/** Build a localized path for the given locale */
export function getLocalizedPath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  if (path.startsWith(`/${locale}`)) return path;
  return `/${locale}${path === '/' ? '' : path}`;
}
