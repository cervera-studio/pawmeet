'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useModerationWs } from '@/hooks/use-moderation-ws';
import { useAuthContext } from '@/lib/auth-store';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import type { PendingPhoto } from '@/repositories';
import { approveAllPhotos, approvePhoto, rejectPhoto } from './actions';
import { PhotoViewer } from './photo-viewer';

interface PhotoListProps {
  initialPhotos: PendingPhoto[];
}

/** Number of columns per breakpoint — must match the grid classes */
const GRID_COLS = { base: 1, sm: 2, lg: 3, xl: 4 };

function getGridCols(): number {
  if (typeof window === 'undefined') return GRID_COLS.base;
  const w = window.innerWidth;
  if (w >= 1280) return GRID_COLS.xl;
  if (w >= 1024) return GRID_COLS.lg;
  if (w >= 640) return GRID_COLS.sm;
  return GRID_COLS.base;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: photo moderation grid with keyboard navigation, WS, and inline actions
export function PhotoList({ initialPhotos }: PhotoListProps) {
  const t = useTranslations('photos');
  const { user } = useAuthContext();
  const [photos, setPhotos] = useState<PendingPhoto[]>(initialPhotos);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useModerationWs({
    onNewItem: useCallback(
      (queue: string) => {
        if (queue === 'photos') {
          toast.info(t('toast.newPhotoArrived'));
        }
      },
      [t],
    ),
    onItemActioned: useCallback(
      (queue: string, itemId: string, _action: string, adminId: string) => {
        if (queue !== 'photos') return;
        if (adminId === user?.id) return;
        if (itemId === '*') {
          setPhotos([]);
        } else {
          setPhotos((prev) => prev.filter((p) => p.id !== itemId));
        }
        toast.info(t('toast.actionedByOther'));
      },
      [user?.id, t],
    ),
  });

  const handleApprove = useCallback(
    async (photoId: string) => {
      try {
        await approvePhoto(photoId);
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        toast.success(t('toast.approved'));
      } catch (error) {
        toast.error(handleError(error, t('toast.approveError')));
      }
    },
    [t],
  );

  const handleReject = useCallback(
    async (photoId: string) => {
      try {
        await rejectPhoto(photoId);
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        toast.success(t('toast.rejected'));
      } catch (error) {
        toast.error(handleError(error, t('toast.rejectError')));
      }
    },
    [t],
  );

  async function handleApproveAll() {
    try {
      await approveAllPhotos();
      setPhotos([]);
      setSelectedIndex(-1);
      toast.success(t('toast.allApproved'));
    } catch (error) {
      toast.error(handleError(error, t('toast.allApproveError')));
    }
  }

  function openViewer(index: number) {
    setViewerIndex(index);
    setViewerOpen(true);
  }

  // Clamp selected index when photos change (e.g. after approve/reject)
  useEffect(() => {
    if (selectedIndex >= photos.length) {
      setSelectedIndex(photos.length > 0 ? photos.length - 1 : -1);
    }
  }, [photos.length, selectedIndex]);

  // Keyboard shortcuts for the grid (only when viewer is closed)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (viewerOpen || photos.length === 0) return;
      // Don't intercept when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const cols = getGridCols();

      switch (e.key.toLowerCase()) {
        case 'a': {
          const photoToApprove = photos[selectedIndex];
          if (selectedIndex >= 0 && photoToApprove) {
            e.preventDefault();
            handleApprove(photoToApprove.id);
          }
          break;
        }
        case 'r': {
          const photoToReject = photos[selectedIndex];
          if (selectedIndex >= 0 && photoToReject) {
            e.preventDefault();
            handleReject(photoToReject.id);
          }
          break;
        }
        case 'arrowleft': {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
          break;
        }
        case 'arrowright': {
          e.preventDefault();
          setSelectedIndex((i) => (i < 0 ? 0 : Math.min(photos.length - 1, i + 1)));
          break;
        }
        case 'arrowup': {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - cols));
          break;
        }
        case 'arrowdown': {
          e.preventDefault();
          setSelectedIndex((i) => (i < 0 ? 0 : Math.min(photos.length - 1, i + cols)));
          break;
        }
        case 'enter': {
          if (selectedIndex >= 0 && photos[selectedIndex]) {
            e.preventDefault();
            setViewerIndex(selectedIndex);
            setViewerOpen(true);
          }
          break;
        }
      }
    },
    [viewerOpen, photos, selectedIndex, handleApprove, handleReject],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="text-neutral-500">{t('subtitle', { count: photos.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-400">
                <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px]">
                  A
                </kbd>
                {t('actions.approve')}
                <kbd className="ml-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px]">
                  R
                </kbd>
                {t('actions.reject')}
              </span>
              <Button variant="outline" size="sm" onClick={() => handleApproveAll()}>
                {t('approveAll')}
              </Button>
            </>
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
            <Card
              key={photo.id}
              className={`overflow-hidden cursor-pointer transition-shadow ${
                idx === selectedIndex ? 'ring-2 ring-primary-600 shadow-md' : 'hover:shadow-sm'
              }`}
              onClick={() => setSelectedIndex(idx)}
              onDoubleClick={() => openViewer(idx)}
            >
              {photo.imageUrl ? (
                <Image
                  src={photo.imageUrl}
                  alt={t('photoOf', { name: photo.userName ?? '' })}
                  width={400}
                  height={400}
                  unoptimized
                  className="aspect-square w-full object-cover"
                />
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
                    onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(photo.id);
                    }}
                  >
                    {t('actions.approve')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReject(photo.id);
                    }}
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
