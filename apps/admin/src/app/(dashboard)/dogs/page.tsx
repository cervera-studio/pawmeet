import { getTranslations } from 'next-intl/server';
import { fetchDogs } from './actions';
import { DogsTable } from './dogs-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function DogsPage() {
  const [initialData, t] = await Promise.all([
    fetchDogs({ page: 1, pageSize: DEFAULT_PAGE_SIZE }),
    getTranslations('dogs'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      <DogsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
