import { notFound } from 'next/navigation';
import { fetchGroupEvent } from '../actions';
import { EventDetail } from './event-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GroupEventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await fetchGroupEvent(id);
  if (!event) notFound();
  return <EventDetail event={event} />;
}
