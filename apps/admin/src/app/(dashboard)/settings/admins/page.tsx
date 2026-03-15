import { getTranslations } from 'next-intl/server';
import { fetchAdminUsers } from './actions';
import { AdminUsersTable } from './admin-users-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function AdminUsersPage() {
  const [initialData, t] = await Promise.all([
    fetchAdminUsers({ page: 1, pageSize: DEFAULT_PAGE_SIZE }),
    getTranslations('adminUsers'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>
      <AdminUsersTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
