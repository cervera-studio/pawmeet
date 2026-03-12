'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/formatters';
import { revokeOrganization, verifyOrganization } from '../actions';

const typeLabels: Record<string, string> = {
  pawmeet_team: 'PawMeet Team',
  association: 'Associazione',
  educator: 'Educatore',
  brand: 'Brand',
};

const roleLabels: Record<string, string> = {
  owner: 'Proprietario',
  admin: 'Admin',
  member: 'Membro',
};

interface OrganizationDetailProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    description: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
    contactEmail: string | null;
    isVerified: boolean;
    verifiedAt: string | Date | null;
    verifiedBy: string | null;
    isActive: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    members: {
      id: string;
      userId: string;
      userName: string | null;
      userEmail: string | null;
      role: string;
      createdAt: string | Date;
    }[];
  };
}

export function OrganizationDetail({ organization }: OrganizationDetailProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleVerify() {
    if (!confirm('Verificare questa organizzazione?')) return;
    setIsProcessing(true);
    try {
      await verifyOrganization(organization.id);
      router.refresh();
    } catch (error) {
      console.error('Failed to verify organization:', error);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRevoke() {
    if (!confirm('Revocare la verifica di questa organizzazione?')) return;
    setIsProcessing(true);
    try {
      await revokeOrganization(organization.id);
      router.refresh();
    } catch (error) {
      console.error('Failed to revoke organization:', error);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900">{organization.name}</h1>
            {organization.isVerified ? (
              <Badge variant="success">Verificata</Badge>
            ) : (
              <Badge variant="secondary">Non verificata</Badge>
            )}
          </div>
          <p className="mt-1 font-mono text-sm text-neutral-500">{organization.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/organizations')}>
            Torna alla lista
          </Button>
          {organization.isVerified ? (
            <Button variant="destructive" onClick={handleRevoke} disabled={isProcessing}>
              {isProcessing ? 'Revoca in corso...' : 'Revoca verifica'}
            </Button>
          ) : (
            <Button onClick={handleVerify} disabled={isProcessing}>
              {isProcessing ? 'Verifica in corso...' : 'Verifica organizzazione'}
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {typeLabels[organization.type] ?? organization.type}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Membri</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{organization.members.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Creata il</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatDateTime(organization.createdAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Verifica</CardTitle>
          </CardHeader>
          <CardContent>
            {organization.isVerified && organization.verifiedAt ? (
              <p className="text-sm font-medium">{formatDateTime(organization.verifiedAt)}</p>
            ) : (
              <p className="text-sm text-neutral-400">Non verificata</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {organization.description && (
              <div className="col-span-2">
                <span className="text-neutral-500">Descrizione:</span>
                <p className="mt-1 font-medium">{organization.description}</p>
              </div>
            )}
            {organization.contactEmail && (
              <div>
                <span className="text-neutral-500">Email contatto:</span>{' '}
                <span className="font-medium">{organization.contactEmail}</span>
              </div>
            )}
            {organization.websiteUrl && (
              <div>
                <span className="text-neutral-500">Sito web:</span>{' '}
                <span className="font-medium">{organization.websiteUrl}</span>
              </div>
            )}
            <div>
              <span className="text-neutral-500">Aggiornata il:</span>{' '}
              <span className="font-medium">{formatDateTime(organization.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Membri ({organization.members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {organization.members.length === 0 ? (
            <p className="text-sm text-neutral-500">Nessun membro</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {organization.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div>
                    <a
                      href={`/users/${member.userId}`}
                      className="text-sm font-medium text-primary-600 hover:underline"
                    >
                      {member.userName ?? 'Sconosciuto'}
                    </a>
                    {member.userEmail && (
                      <p className="text-xs text-neutral-500">{member.userEmail}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {roleLabels[member.role] ?? member.role}
                    </Badge>
                    <span className="text-xs text-neutral-400">
                      {formatDateTime(member.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
