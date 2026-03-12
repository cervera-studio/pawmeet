'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/formatters';
import type { PendingPhoto } from '@/repositories';
import { approveAllPhotos, approvePhoto, rejectPhoto } from './actions';

interface PhotoListProps {
  initialPhotos: PendingPhoto[];
}

export function PhotoList({ initialPhotos }: PhotoListProps) {
  const [photos, setPhotos] = useState<PendingPhoto[]>(initialPhotos);

  async function handleApprove(photoId: string) {
    try {
      await approvePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success('Foto approvata');
    } catch {
      toast.error("Errore durante l'approvazione");
    }
  }

  async function handleReject(photoId: string) {
    try {
      await rejectPhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success('Foto rifiutata');
    } catch {
      toast.error('Errore durante il rifiuto');
    }
  }

  async function handleApproveAll() {
    try {
      await approveAllPhotos();
      setPhotos([]);
      toast.success('Tutte le foto approvate');
    } catch {
      toast.error("Errore durante l'approvazione");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Moderazione Foto</h1>
          <p className="text-neutral-500">{photos.length} foto in attesa di revisione</p>
        </div>
        <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => handleApproveAll()}>
              Approva tutte
            </Button>
          )}
        </div>
      </div>

      {photos.length === 0 ? (
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
                // biome-ignore lint/performance/noImgElement: external user-uploaded URLs
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
                <p className="text-xs text-neutral-500">{formatDateTime(photo.uploadedAt)}</p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApprove(photo.id)}
                  >
                    Approva
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReject(photo.id)}
                  >
                    Rifiuta
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
