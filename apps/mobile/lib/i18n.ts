import { DEFAULT_LOCALE, isLocale, LOCALE_CODES } from '@pawmeet/i18n';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import it from '@/locales/it.json';
import ro from '@/locales/ro.json';

/** Detect device locale, fallback to default */
function getDeviceLocale(): string {
  const deviceLocale = getLocales()[0]?.languageCode ?? undefined;
  return isLocale(deviceLocale) ? deviceLocale : DEFAULT_LOCALE;
}

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
    es: { translation: es },
    ro: { translation: ro },
  },
  lng: getDeviceLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: LOCALE_CODES,
  interpolation: {
    escapeValue: false,
  },
});

/** Map i18n language code to BCP 47 tag for date formatting */
export function getDateLocale(): string {
  const map: Record<string, string> = { it: 'it-IT', en: 'en-US', es: 'es-ES', ro: 'ro-RO' };
  return map[i18n.language] ?? 'it-IT';
}

export default i18n;
