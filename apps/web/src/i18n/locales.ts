export const LOCALES = { it: 'Italiano', en: 'English' } as const;
export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = 'it';
