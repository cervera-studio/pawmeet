import { getTranslations } from 'next-intl/server';
import { fetchOrganizations } from './actions';
import { OrganizationsTable } from './organizations-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function OrganizationsPage() {
  const [initialData, t] = await Promise.all([
    fetchOrganizations({ page: 1, pageSize: DEFAULT_PAGE_SIZE }),
    getTranslations('organizations'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{t('title')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
      </div>

      <OrganizationsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
