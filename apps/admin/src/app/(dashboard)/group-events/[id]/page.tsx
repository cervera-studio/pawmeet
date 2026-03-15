import { notFound } from 'next/navigation';
import { fetchEventSponsors, fetchGroupEvent } from '../actions';
import { EventDetail } from './event-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GroupEventDetailPage({ params }: Props) {
  const { id } = await params;
  const [event, sponsors] = await Promise.all([fetchGroupEvent(id), fetchEventSponsors(id)]);
  if (!event) notFound();
  return <EventDetail event={event} initialSponsors={sponsors} />;
}
