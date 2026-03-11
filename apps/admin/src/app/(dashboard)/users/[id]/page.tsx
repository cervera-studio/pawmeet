'use client';

import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserDetailViewModel } from './page.view-model';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}

export default function UserDetailPage() {
  const vm = useUserDetailViewModel();

  if (vm.isLoading || !vm.user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <span className="ml-2 text-neutral-500">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
            {vm.user.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{vm.user.displayName}</h1>
            <p className="text-neutral-500">{vm.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={vm.user.status} type="user" />
          {vm.isAdmin && vm.user.status === 'active' && (
            <>
              <Button variant="outline" size="sm" onClick={() => vm.handleSuspend()}>
                Sospendi
              </Button>
              <Button variant="destructive" size="sm" onClick={() => vm.handleBan()}>
                Banna
              </Button>
            </>
          )}
          {vm.isAdmin && (vm.user.status === 'suspended' || vm.user.status === 'banned') && (
            <Button variant="secondary" size="sm" onClick={() => vm.handleReactivate()}>
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
            <InfoRow label="Nome" value={vm.user.displayName} />
            <InfoRow label="Email" value={vm.user.email} />
            <InfoRow label="Provider" value={vm.user.authProvider} />
            <InfoRow
              label="Registrato il"
              value={new Date(vm.user.createdAt).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
            <InfoRow
              label="Ultimo accesso"
              value={
                vm.user.lastLoginAt
                  ? new Date(vm.user.lastLoginAt).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Mai'
              }
            />
            <InfoRow label="Follower" value={String(vm.user.followersCount)} />
            <InfoRow label="Seguiti" value={String(vm.user.followingCount)} />
            <InfoRow label="Segnalazioni ricevute" value={String(vm.user.reportsReceived)} />
            <InfoRow label="Match totali" value={String(vm.user.matchesCount)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cani ({vm.user.dogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {vm.user.dogs.length === 0 ? (
              <p className="text-sm text-neutral-400">Nessun cane registrato</p>
            ) : (
              <div className="space-y-3">
                {vm.user.dogs.map((dog) => (
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
              onClick={vm.navigateToReports}
            >
              Vedi segnalazioni
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={vm.navigateToPhotos}
            >
              Vedi foto
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
