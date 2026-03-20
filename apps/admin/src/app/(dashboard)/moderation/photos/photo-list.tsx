'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import type { PendingPhoto } from '@/repositories';
import { approveAllPhotos, approvePhoto, rejectPhoto } from './actions';
import { PhotoViewer } from './photo-viewer';

interface PhotoListProps {
  initialPhotos: PendingPhoto[];
}

export function PhotoList({ initialPhotos }: PhotoListProps) {
  const t = useTranslations('photos');
  const [photos, setPhotos] = useState<PendingPhoto[]>(initialPhotos);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  async function handleApprove(photoId: string) {
    try {
      await approvePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success(t('toast.approved'));
    } catch (error) {
      toast.error(handleError(error, t('toast.approveError')));
    }
  }

  async function handleReject(photoId: string) {
    try {
      await rejectPhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success(t('toast.rejected'));
    } catch (error) {
      toast.error(handleError(error, t('toast.rejectError')));
    }
  }

  async function handleApproveAll() {
    try {
      await approveAllPhotos();
      setPhotos([]);
      toast.success(t('toast.allApproved'));
    } catch (error) {
      toast.error(handleError(error, t('toast.allApproveError')));
    }
  }

  function openViewer(index: number) {
    setViewerIndex(index);
    setViewerOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="text-neutral-500">{t('subtitle', { count: photos.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => handleApproveAll()}>
              {t('approveAll')}
            </Button>
          )}
        </div>
      </div>

      {photos.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-neutral-500">{t('noPending')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo, idx) => (
            <Card key={photo.id} className="overflow-hidden">
              {photo.imageUrl ? (
                <button
                  type="button"
                  className="w-full cursor-pointer"
                  onClick={() => openViewer(idx)}
                >
                  <img
                    src={photo.imageUrl}
                    alt={t('photoOf', { name: photo.userName ?? '' })}
                    className="aspect-square w-full object-cover hover:opacity-90 transition-opacity"
                  />
                </button>
              ) : (
                <div className="aspect-square bg-neutral-100 flex items-center justify-center">
                  <span className="text-neutral-300 text-sm">{t('photo')}</span>
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
                    {photo.type === 'profile' ? t('types.profile') : t('types.dog')}
                  </Badge>
                </div>
                {photo.dogName && (
                  <p className="text-xs text-neutral-500">
                    {t('types.dog')}: {photo.dogName}
                  </p>
                )}
                <p className="text-xs text-neutral-500">{formatDateTime(photo.uploadedAt)}</p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApprove(photo.id)}
                  >
                    {t('actions.approve')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReject(photo.id)}
                  >
                    {t('actions.reject')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PhotoViewer
        photos={photos}
        currentIndex={viewerIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        approveLabel={t('actions.approve')}
        rejectLabel={t('actions.reject')}
      />
    </>
  );
}
