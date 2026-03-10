'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePhotoModerationViewModel } from './page.view-model';

export default function PhotoModerationPage() {
  const vm = usePhotoModerationViewModel();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Moderazione Foto</h1>
          <p className="text-neutral-500">{vm.photos.length} foto in attesa di revisione</p>
        </div>
        <div className="flex items-center gap-2">
          {vm.photos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => vm.approveAllMutation.mutate()}
              disabled={vm.approveAllMutation.isPending}
            >
              {vm.approveAllMutation.isPending ? 'Approvazione...' : 'Approva tutte'}
            </Button>
          )}
        </div>
      </div>

      {vm.isLoading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <span className="ml-2 text-neutral-500">Caricamento...</span>
          </CardContent>
        </Card>
      ) : vm.photos.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-neutral-400">Nessuna foto in attesa di moderazione</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {vm.photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              {photo.imageUrl ? (
                <img
                  src={photo.imageUrl}
                  alt={`Foto di ${photo.userName}`}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="aspect-square bg-neutral-100 flex items-center justify-center">
                  <span className="text-neutral-300 text-sm">Foto</span>
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <a
                    href={`/users/${photo.userId}`}
                    className="text-sm font-medium text-neutral-900 truncate hover:text-primary-600"
                  >
                    {photo.userName}
                  </a>
                  <Badge variant={photo.type === 'profile' ? 'default' : 'secondary'}>
                    {photo.type === 'profile' ? 'Profilo' : 'Cane'}
                  </Badge>
                </div>
                {photo.dogName && <p className="text-xs text-neutral-500">Cane: {photo.dogName}</p>}
                <p className="text-xs text-neutral-500">
                  {new Date(photo.uploadedAt).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => vm.approveMutation.mutate(photo.id)}
                    disabled={vm.approveMutation.isPending}
                  >
                    Approva
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => vm.rejectMutation.mutate(photo.id)}
                    disabled={vm.rejectMutation.isPending}
                  >
                    Rifiuta
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
