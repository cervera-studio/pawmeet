import { getServerTrpcClient } from '@/lib/server-api';
import type { AdminUserListItem } from '@/repositories';
import { UsersTable } from './users-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function UsersPage() {
  const api = await getServerTrpcClient();
  const result = await api.admin.listUsers.query({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const initialData = {
    data: result.data as AdminUserListItem[],
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Utenti</h1>
          <p className="text-neutral-500">Gestisci gli utenti della piattaforma</p>
        </div>
      </div>

      <UsersTable initialData={initialData} />
    </div>
  );
}
