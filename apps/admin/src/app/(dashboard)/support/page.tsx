import { PAGINATION } from '@/lib/constants';
import { fetchSupportTickets } from './actions';
import { TicketList } from './ticket-list';

export default async function SupportPage() {
  const initialData = await fetchSupportTickets({
    page: 1,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <TicketList initialData={initialData} />
    </div>
  );
}
