import { PAGINATION } from '@/lib/constants';
import { fetchChatReports } from './actions';
import { ChatReportsList } from './chat-reports-list';

export default async function ChatModerationPage() {
  const initialData = await fetchChatReports({
    page: 1,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    status: 'pending',
  });

  return (
    <div className="space-y-6">
      <ChatReportsList initialData={initialData} />
    </div>
  );
}
