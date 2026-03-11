import { getServerTrpcClient } from '@/lib/server-api';
import type { ReportStatus } from '@/repositories';
import { ReportsList } from './reports-list';

export default async function ReportsPage() {
  const api = await getServerTrpcClient();
  const result = await api.admin.listReports.query({
    page: 1,
    pageSize: 20,
  });

  const initialData = {
    data: result.data.map((r) => ({
      ...r,
      status: r.status as ReportStatus,
      createdAt: String(r.createdAt),
      resolvedAt: r.resolvedAt ? String(r.resolvedAt) : null,
    })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };

  return (
    <div className="space-y-6">
      <ReportsList initialData={initialData} />
    </div>
  );
}
