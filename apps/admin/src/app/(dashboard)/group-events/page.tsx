import { getTranslations } from 'next-intl/server';
import { fetchGroupEvents } from './actions';
import { GroupEventsTable } from './group-events-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function GroupEventsPage() {
  const [initialData, t] = await Promise.all([
    fetchGroupEvents({ page: 1, pageSize: DEFAULT_PAGE_SIZE }),
    getTranslations('events'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      <GroupEventsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
