import { notFound } from 'next/navigation';
import { fetchOrganization } from '../actions';
import { OrganizationDetail } from './organization-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailPage({ params }: Props) {
  const { id } = await params;
  const organization = await fetchOrganization(id);
  if (!organization) notFound();
  return <OrganizationDetail organization={organization} />;
}
