import { getTranslations } from 'next-intl/server';
import { fetchPendingDeletions } from './actions';
import { DeletionsTable } from './deletions-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function AccountDeletionsPage() {
  const [initialData, t] = await Promise.all([
    fetchPendingDeletions({ page: 1, pageSize: DEFAULT_PAGE_SIZE }),
    getTranslations('accountDeletions'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{t('title')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
      </div>

      <DeletionsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
