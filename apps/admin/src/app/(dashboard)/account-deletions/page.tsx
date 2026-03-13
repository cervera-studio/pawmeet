import { getServerTrpcClient } from '@/lib/server-api';
import { DeletionsTable } from './deletions-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function AccountDeletionsPage() {
  const api = await getServerTrpcClient();

  const result = await api.admin.listPendingDeletions.query({
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
        <h1 className="text-2xl font-bold text-neutral-900">Eliminazioni account</h1>
        <p className="text-neutral-500">Account in fase di eliminazione (grace period 30 giorni)</p>
      </div>

      <DeletionsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
