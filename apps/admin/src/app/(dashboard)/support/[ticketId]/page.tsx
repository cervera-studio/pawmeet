import { fetchTicketDetail, fetchTicketMessages } from './actions';
import { TicketDetail } from './ticket-detail';

interface TicketPageProps {
  params: Promise<{ ticketId: string }>;
}

export default async function TicketDetailPage({ params }: TicketPageProps) {
  const { ticketId } = await params;
  const [ticket, messages] = await Promise.all([
    fetchTicketDetail(ticketId),
    fetchTicketMessages(ticketId),
  ]);

  return (
    <div className="space-y-6">
      <TicketDetail ticket={ticket} initialMessages={messages} />
    </div>
  );
}
