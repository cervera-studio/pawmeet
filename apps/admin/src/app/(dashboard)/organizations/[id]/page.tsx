import { notFound } from 'next/navigation';
import { getServerTrpcClient } from '@/lib/server-api';
import { OrganizationDetail } from './organization-detail';

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchOrganization(id: string) {
  const api = await getServerTrpcClient();
  try {
    return await api.admin.getOrganization.query({ id });
  } catch {
    notFound();
  }
}

export default async function OrganizationDetailPage({ params }: Props) {
  const { id } = await params;
  const organization = await fetchOrganization(id);
  return <OrganizationDetail organization={organization} />;
}
