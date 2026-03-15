import { PAGINATION } from '@/lib/constants';
import { fetchReports } from './actions';
import { ReportsList } from './reports-list';

export default async function ReportsPage() {
  const initialData = await fetchReports({ page: 1, pageSize: PAGINATION.DEFAULT_PAGE_SIZE });

  return (
    <div className="space-y-6">
      <ReportsList initialData={initialData} />
    </div>
  );
}
