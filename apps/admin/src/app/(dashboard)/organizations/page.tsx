import { getServerTrpcClient } from '@/lib/server-api';
import { OrganizationsTable } from './organizations-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function OrganizationsPage() {
  const api = await getServerTrpcClient();

  const result = await api.admin.listOrganizations.query({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const initialData = {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Organizzazioni</h1>
        <p className="text-neutral-500">Gestione organizzazioni verificate e membri</p>
      </div>

      <OrganizationsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
