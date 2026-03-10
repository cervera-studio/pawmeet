'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';

interface PendingPhoto {
  id: string;
  userId: string;
  userName: string;
  dogId: string | null;
  dogName: string | null;
  imageUrl: string;
  type: 'profile' | 'dog';
  uploadedAt: string;
}

export default function PhotoModerationPage() {
  const queryClient = useQueryClient();

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['moderation-photos'],
    queryFn: () => api.get<PendingPhoto[]>('/admin/moderation/photos'),
  });

  const approveMutation = useMutation({
    mutationFn: (photoId: string) => api.post(`/admin/moderation/photos/${photoId}/approve`),
    onSuccess: (_data, photoId) => {
      queryClient.setQueryData<PendingPhoto[]>(['moderation-photos'], (old) =>
        old?.filter((p) => p.id !== photoId),
      );
      toast.success('Foto approvata');
    },
    onError: () => toast.error("Errore durante l'approvazione"),
  });

  const rejectMutation = useMutation({
    mutationFn: (photoId: string) => api.post(`/admin/moderation/photos/${photoId}/reject`),
    onSuccess: (_data, photoId) => {
      queryClient.setQueryData<PendingPhoto[]>(['moderation-photos'], (old) =>
        old?.filter((p) => p.id !== photoId),
      );
      toast.success('Foto rifiutata');
    },
    onError: () => toast.error('Errore durante il rifiuto'),
  });

  const approveAllMutation = useMutation({
    mutationFn: () => api.post('/admin/moderation/photos/approve-all'),
    onSuccess: () => {
      queryClient.setQueryData<PendingPhoto[]>(['moderation-photos'], []);
      toast.success('Tutte le foto approvate');
    },
    onError: () => toast.error("Errore durante l'approvazione"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Moderazione Foto</h1>
          <p className="text-neutral-500">{photos.length} foto in attesa di revisione</p>
        </div>
        <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => approveAllMutation.mutate()}
              disabled={approveAllMutation.isPending}
            >
              {approveAllMutation.isPending ? 'Approvazione...' : 'Approva tutte'}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <span className="ml-2 text-neutral-500">Caricamento...</span>
          </CardContent>
        </Card>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-neutral-400">Nessuna foto in attesa di moderazione</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => (
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
                    onClick={() => approveMutation.mutate(photo.id)}
                    disabled={approveMutation.isPending}
                  >
                    Approva
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => rejectMutation.mutate(photo.id)}
                    disabled={rejectMutation.isPending}
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
