import { DEFAULT_LOCALE, isLocale, type Locale } from '@pawmeet/i18n';
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('locale')?.value;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
