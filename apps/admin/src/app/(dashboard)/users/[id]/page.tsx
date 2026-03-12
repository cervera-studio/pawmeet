import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatters';
import { getServerTrpcClient } from '@/lib/server-api';
import { UserActions } from './user-actions';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;

  const api = await getServerTrpcClient();
  const user = await api.admin.getUser.query({ id }).catch(() => notFound());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{user.displayName}</h1>
            <p className="text-neutral-500">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={user.status} type="user" />
          <UserActions userId={id} initialStatus={user.status} />
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Nome" value={user.displayName} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Provider" value={user.authProvider} />
            <InfoRow label="Registrato il" value={formatDate(user.createdAt)} />
            <InfoRow
              label="Ultimo accesso"
              value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Mai'}
            />
            <InfoRow label="Follower" value={formatNumber(user.followersCount)} />
            <InfoRow label="Seguiti" value={formatNumber(user.followingCount)} />
            <InfoRow label="Segnalazioni ricevute" value={formatNumber(user.reportsReceived)} />
            <InfoRow label="Match totali" value={formatNumber(user.matchesCount)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cani ({user.dogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {user.dogs.length === 0 ? (
              <p className="text-sm text-neutral-400">Nessun cane registrato</p>
            ) : (
              <div className="space-y-3">
                {user.dogs.map((dog) => (
                  <div key={dog.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{dog.name}</p>
                      <p className="text-xs text-neutral-500">{dog.breed}</p>
                    </div>
                    <Badge variant={dog.isActive ? 'success' : 'outline'}>
                      {dog.isActive ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Azioni rapide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href={`/moderation/reports?user=${id}`}
              className="inline-flex w-full items-center justify-start h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium hover:bg-neutral-100 transition-colors"
            >
              Vedi segnalazioni
            </a>
            <a
              href={`/moderation/photos?user=${id}`}
              className="inline-flex w-full items-center justify-start h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium hover:bg-neutral-100 transition-colors"
            >
              Vedi foto
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
