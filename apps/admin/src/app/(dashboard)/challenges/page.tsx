import { getTranslations } from 'next-intl/server';
import { fetchChallenges } from './actions';
import { ChallengesTable } from './challenges-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function ChallengesPage() {
  const [initialData, t] = await Promise.all([
    fetchChallenges({ page: 1, pageSize: DEFAULT_PAGE_SIZE }),
    getTranslations('challenges'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>
      <ChallengesTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
