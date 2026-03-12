import type { Locale } from './locales';

/** Maps canonical (Italian) paths to their localized equivalents */
export const routeMap: Record<string, Record<Locale, string>> = {
  '/': { it: '/', en: '/en' },
  '/chi-siamo': { it: '/chi-siamo', en: '/en/about' },
  '/blog': { it: '/blog', en: '/en/blog' },
  '/contatti': { it: '/contatti', en: '/en/contact' },
  '/waitlist': { it: '/waitlist', en: '/en/waitlist' },
  '/privacy': { it: '/privacy', en: '/en/privacy' },
  '/terms': { it: '/terms', en: '/en/terms' },
  '/cookie': { it: '/cookie', en: '/en/cookie' },
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
