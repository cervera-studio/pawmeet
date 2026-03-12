import type { PaginatedResult } from '@pawmeet/types';
import { serverFetch } from '@/lib/server-api';
import type { AdminUserListItem } from '@/repositories';
import { UsersTable } from './users-table';

export default async function UsersPage() {
  const initialData = await serverFetch<PaginatedResult<AdminUserListItem>>(
    '/admin/users?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc',
  );

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
