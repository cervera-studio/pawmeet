'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { type Locale, localeNames, locales } from '@/i18n/config';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(newLocale: string) {
    // biome-ignore lint/suspicious/noDocumentCookie: simple cookie set for locale preference
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <select
      value={locale}
      onChange={(e) => onChange(e.target.value)}
      disabled={isPending}
      className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-600 outline-none hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-300 dark:bg-neutral-100"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc as Locale]}
        </option>
      ))}
    </select>
  );
}
