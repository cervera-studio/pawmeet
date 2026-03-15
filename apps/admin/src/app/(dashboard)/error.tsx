'use client';

import { useTranslations } from 'next-intl';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{t('title')}</h2>
      <p className="text-neutral-500 dark:text-neutral-400">
        {error.message || t('defaultMessage')}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-neutral-900 dark:bg-neutral-50 px-4 py-2 text-sm text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200"
      >
        {t('retry')}
      </button>
    </div>
  );
}
