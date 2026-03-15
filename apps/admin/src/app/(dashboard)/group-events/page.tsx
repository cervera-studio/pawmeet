import { getTranslations } from 'next-intl/server';
import { fetchGroupEvents, fetchVerifiedOrganizations } from './actions';
import { CreateOfficialEventForm } from './create-official-event';
import { GroupEventsTable } from './group-events-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function GroupEventsPage() {
  const [initialData, t, verifiedOrgs] = await Promise.all([
    fetchGroupEvents({ page: 1, pageSize: DEFAULT_PAGE_SIZE }),
    getTranslations('events'),
    fetchVerifiedOrganizations(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{t('title')}</h1>
          <p className="text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
        <CreateOfficialEventForm organizations={verifiedOrgs} />
      </div>

      <GroupEventsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
