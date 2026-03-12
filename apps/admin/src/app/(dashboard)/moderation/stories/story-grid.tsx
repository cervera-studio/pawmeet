'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/formatters';
import type { AdminStory, AdminStoryPage } from '@/repositories';
import { deleteStory as deleteStoryAction, fetchStories as fetchStoriesAction } from './actions';

function getTimeUntilExpiry(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return 'Scaduta';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${String(hours)}h ${String(minutes)}m`;
  return `${String(minutes)}m`;
}

const MEDIA_TYPE_LABEL: Record<string, string> = {
  image: 'Immagine',
  video: 'Video',
};

interface StoryGridProps {
  initialData: AdminStoryPage;
}

export function StoryGrid({ initialData }: StoryGridProps) {
  const [stories, setStories] = useState<AdminStory[]>(initialData.data);
  const [page, setPage] = useState(initialData.page);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [total, setTotal] = useState(initialData.total);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStories = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    try {
      const result = await fetchStoriesAction({ page: targetPage, pageSize: 20 });
      setStories(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
      setPage(targetPage);
    } catch (error) {
      console.error('[StoryModeration] Failed to fetch stories:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function handleDelete(storyId: string) {
    setIsDeleting(true);
    try {
      await deleteStoryAction(storyId);
      toast.success('Storia eliminata');
      void fetchStories(page);
    } catch (error) {
      console.error('[StoryModeration] Failed to delete story:', error);
      toast.error("Errore durante l'eliminazione");
    } finally {
      setIsDeleting(false);
    }
  }

  function handlePageChange(newPage: number) {
    void fetchStories(newPage);
  }

  return (
    <>
      {/* Summary */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-500">
          {total} {total === 1 ? 'storia' : 'storie'} totali
        </span>
      </div>

      {/* Stories grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={`skeleton-${String(i)}`} className="animate-pulse p-4">
              <div className="aspect-[9/16] w-full rounded bg-neutral-200" />
              <div className="mt-3 h-3 w-2/3 rounded bg-neutral-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200" />
            </Card>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-neutral-500">Nessuna storia trovata</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {stories.map((story) => {
              const isExpired = new Date(story.expiresAt).getTime() <= Date.now();
              return (
                <Card key={story.id} className="overflow-hidden">
                  {/* Media preview */}
                  <div className="relative aspect-[9/16] w-full bg-neutral-100">
                    {story.mediaType === 'video' ? (
                      <video
                        src={story.mediaUrl}
                        className="h-full w-full object-cover"
                        muted
                        preload="metadata"
                      />
                    ) : (
                      // biome-ignore lint/performance/noImgElement: external URLs
                      <img src={story.mediaUrl} alt="" className="h-full w-full object-cover" />
                    )}
                    <div className="absolute left-2 top-2">
                      <Badge variant={isExpired ? 'secondary' : 'default'}>
                        {isExpired ? 'Scaduta' : getTimeUntilExpiry(story.expiresAt)}
                      </Badge>
                    </div>
                  </div>

                  {/* Story details */}
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-900">
                        {story.authorName ?? 'Utente sconosciuto'}
                      </span>
                      <Badge variant="outline">
                        {MEDIA_TYPE_LABEL[story.mediaType] ?? story.mediaType}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span>{story.viewCount} visualizzazioni</span>
                      <span>{formatDateTime(story.createdAt)}</span>
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      disabled={isDeleting}
                      onClick={() => handleDelete(story.id)}
                    >
                      Elimina
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Precedente
              </Button>
              <span className="text-sm text-neutral-500">
                Pagina {page} di {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Successiva
              </Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
