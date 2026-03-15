import { fetchReports } from './actions';
import { ReportsList } from './reports-list';

export default async function ReportsPage() {
  const initialData = await fetchReports({ page: 1, pageSize: 20 });

  return (
    <div className="space-y-6">
      <ReportsList initialData={initialData} />
    </div>
  );
}
