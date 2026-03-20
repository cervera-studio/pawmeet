import { getTranslations } from 'next-intl/server';
import { fetchUsers } from './actions';
import { UsersTable } from './users-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const [initialData, t] = await Promise.all([
    fetchUsers({ page: 1, pageSize: DEFAULT_PAGE_SIZE, search: search || undefined }),
    getTranslations('users'),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="text-neutral-500">{t('subtitle')}</p>
        </div>
      </div>

      <UsersTable initialData={initialData} initialSearch={search} />
    </div>
  );
}
