import { notFound } from 'next/navigation';
import { getServerTrpcClient } from '@/lib/server-api';
import { EventDetail } from './event-detail';

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchEvent(id: string) {
  const api = await getServerTrpcClient();
  try {
    return await api.admin.getGroupEvent.query({ id });
  } catch {
    notFound();
  }
}

export default async function GroupEventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await fetchEvent(id);
  return <EventDetail event={event} />;
}
