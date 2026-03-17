import type { Locale } from './locales';

/** Maps canonical (Italian) paths to their localized equivalents */
export const routeMap: Record<string, Record<Locale, string>> = {
  '/': { it: '/', en: '/en', es: '/es', ro: '/ro' },
  '/chi-siamo': { it: '/chi-siamo', en: '/en/about', es: '/es/about', ro: '/ro/about' },
  '/blog': { it: '/blog', en: '/en/blog', es: '/es/blog', ro: '/ro/blog' },
  '/contatti': { it: '/contatti', en: '/en/contact', es: '/es/contact', ro: '/ro/contact' },
  '/waitlist': { it: '/waitlist', en: '/en/waitlist', es: '/es/waitlist', ro: '/ro/waitlist' },
  '/privacy': { it: '/privacy', en: '/en/privacy', es: '/es/privacy', ro: '/ro/privacy' },
  '/terms': { it: '/terms', en: '/en/terms', es: '/es/terms', ro: '/ro/terms' },
  '/cookie': { it: '/cookie', en: '/en/cookie', es: '/es/cookie', ro: '/ro/cookie' },
};

/** Reverse lookup: given any localized path, find the canonical key */
const reverseLookup = new Map<string, string>();
for (const [canonical, locales] of Object.entries(routeMap)) {
  for (const path of Object.values(locales)) {
    reverseLookup.set(path, canonical);
  }
}

/** Get the canonical (Italian) path from any localized path */
export function getCanonicalPath(path: string): string {
  const normalized = path.replace(/\/$/, '') || '/';
  return reverseLookup.get(normalized) ?? normalized;
}

/** Get the alternate URL path for a given locale */
export function getAlternatePath(currentPath: string, targetLocale: Locale): string {
  const canonical = getCanonicalPath(currentPath);
  return routeMap[canonical]?.[targetLocale] ?? currentPath;
}
