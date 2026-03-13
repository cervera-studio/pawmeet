import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['it', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'it';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value;
  const safeLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;

  return {
    locale: safeLocale,
    messages: (await import(`../../messages/${safeLocale}.json`)).default,
  };
});
