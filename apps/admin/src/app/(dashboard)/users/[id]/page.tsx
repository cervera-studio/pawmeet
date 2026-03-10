'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/use-permission';

interface UserDetail {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: 'active' | 'suspended' | 'banned';
  authProvider: string;
  createdAt: string;
  lastLoginAt: string | null;
  dogs: {
    id: string;
    name: string;
    breed: string;
    isActive: boolean;
  }[];
  reportsReceived: number;
  matchesCount: number;
}

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  active: { label: 'Attivo', variant: 'success' },
  suspended: { label: 'Sospeso', variant: 'warning' },
  banned: { label: 'Bannato', variant: 'destructive' },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = usePermission();

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', params.id],
    queryFn: () => api.get<UserDetail>(`/admin/users/${params.id}`),
  });

  const suspendMutation = useMutation({
    mutationFn: () => api.post(`/admin/users/${params.id}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', params.id] });
      toast.success('Utente sospeso');
    },
    onError: () => toast.error('Errore durante la sospensione'),
  });

  const banMutation = useMutation({
    mutationFn: () => api.post(`/admin/users/${params.id}/ban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', params.id] });
      toast.success('Utente bannato');
    },
    onError: () => toast.error('Errore durante il ban'),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => api.post(`/admin/users/${params.id}/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', params.id] });
      toast.success('Utente riattivato');
    },
    onError: () => toast.error('Errore durante la riattivazione'),
  });

  if (isLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <span className="ml-2 text-neutral-500">Caricamento...</span>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[user.status] ?? { label: 'Sconosciuto', variant: 'outline' as const };

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
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {isAdmin && user.status === 'active' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => suspendMutation.mutate()}
                disabled={suspendMutation.isPending}
              >
                Sospendi
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => banMutation.mutate()}
                disabled={banMutation.isPending}
              >
                Banna
              </Button>
            </>
          )}
          {isAdmin && (user.status === 'suspended' || user.status === 'banned') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
            >
              Riattiva
            </Button>
          )}
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
            <InfoRow
              label="Registrato il"
              value={new Date(user.createdAt).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
            <InfoRow
              label="Ultimo accesso"
              value={
                user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Mai'
              }
            />
            <InfoRow label="Segnalazioni ricevute" value={String(user.reportsReceived)} />
            <InfoRow label="Match totali" value={String(user.matchesCount)} />
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
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => router.push(`/moderation/reports?user=${params.id}`)}
            >
              Vedi segnalazioni
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => router.push(`/moderation/photos?user=${params.id}`)}
            >
              Vedi foto
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
