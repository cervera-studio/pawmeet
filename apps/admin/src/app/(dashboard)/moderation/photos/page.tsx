'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PendingPhoto {
  id: string;
  userId: string;
  userName: string;
  imageUrl: string;
  type: 'profile' | 'dog';
  uploadedAt: string;
}

// Placeholder data
const mockPhotos: PendingPhoto[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Mario Rossi',
    imageUrl: '',
    type: 'profile',
    uploadedAt: '2024-03-01T10:00:00Z',
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'Laura Bianchi',
    imageUrl: '',
    type: 'dog',
    uploadedAt: '2024-03-01T11:00:00Z',
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'Giuseppe Verdi',
    imageUrl: '',
    type: 'profile',
    uploadedAt: '2024-03-01T12:00:00Z',
  },
  {
    id: '4',
    userId: 'u4',
    userName: 'Anna Neri',
    imageUrl: '',
    type: 'dog',
    uploadedAt: '2024-03-01T13:00:00Z',
  },
  {
    id: '5',
    userId: 'u5',
    userName: 'Luca Gialli',
    imageUrl: '',
    type: 'dog',
    uploadedAt: '2024-03-01T14:00:00Z',
  },
  {
    id: '6',
    userId: 'u6',
    userName: 'Chiara Blu',
    imageUrl: '',
    type: 'profile',
    uploadedAt: '2024-03-01T15:00:00Z',
  },
];

export default function PhotoModerationPage() {
  const [photos, setPhotos] = useState(mockPhotos);

  function handleApprove(photoId: string) {
    // TODO: Call API to approve photo
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  function handleReject(photoId: string) {
    // TODO: Call API to reject photo
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Moderazione Foto</h1>
          <p className="text-neutral-500">{photos.length} foto in attesa di revisione</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Approva tutte
          </Button>
        </div>
      </div>

      {/* Photo Grid */}
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
              {/* Image placeholder */}
              <div className="aspect-square bg-neutral-100 flex items-center justify-center">
                <span className="text-neutral-300 text-sm">Foto</span>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-900 truncate">{photo.userName}</p>
                  <Badge variant={photo.type === 'profile' ? 'default' : 'secondary'}>
                    {photo.type === 'profile' ? 'Profilo' : 'Cane'}
                  </Badge>
                </div>
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
    </div>
  );
}
