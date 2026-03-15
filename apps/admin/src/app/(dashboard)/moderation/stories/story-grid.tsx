'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PAGINATION } from '@/lib/constants';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import type { AdminStory, AdminStoryPage } from '@/repositories';
import { deleteStory as deleteStoryAction, fetchStories as fetchStoriesAction } from './actions';

function getTimeUntilExpiry(expiresAt: string, expiredLabel: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return expiredLabel;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${String(hours)}h ${String(minutes)}m`;
  return `${String(minutes)}m`;
}

interface StoryGridProps {
  initialData: AdminStoryPage;
}

export function StoryGrid({ initialData }: StoryGridProps) {
  const t = useTranslations('stories');
  const tTable = useTranslations('table');
  const [stories, setStories] = useState<AdminStory[]>(initialData.data);
  const [page, setPage] = useState(initialData.page);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [total, setTotal] = useState(initialData.total);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStories = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    try {
      const result = await fetchStoriesAction({ page: targetPage, pageSize: PAGINATION.DEFAULT_PAGE_SIZE });
      setStories(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
      setPage(targetPage);
    } catch (error) {
      toast.error(handleError(error, 'Errore nel caricamento delle storie'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function handleDelete(storyId: string) {
    setDeletingStoryId(storyId);
    try {
      await deleteStoryAction(storyId);
      toast.success(t('toast.deleted'));
      void fetchStories(page);
    } catch (error) {
      toast.error(handleError(error, t('toast.deleteError')));
    } finally {
      setDeletingStoryId(null);
    }
  }

  function handlePageChange(newPage: number) {
    void fetchStories(newPage);
  }

  return (
    <>
      {/* Summary */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('count', { count: total })}
        </span>
      </div>

      {/* Stories grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={`skeleton-${String(i)}`} className="animate-pulse p-4">
              <div className="aspect-[9/16] w-full rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="mt-3 h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
            </Card>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-neutral-500 dark:text-neutral-400">{t('noStories')}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {stories.map((story) => {
              const isExpired = new Date(story.expiresAt).getTime() <= Date.now();
              return (
                <Card key={story.id} className="overflow-hidden">
                  {/* Media preview */}
                  <div className="relative aspect-[9/16] w-full bg-neutral-100 dark:bg-neutral-800">
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
                        {isExpired
                          ? t('expired')
                          : getTimeUntilExpiry(story.expiresAt, t('expired'))}
                      </Badge>
                    </div>
                  </div>

                  {/* Story details */}
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        {story.authorName ?? t('unknownUser')}
                      </span>
                      <Badge variant="outline">
                        {t.has(`types.${story.mediaType}`)
                          ? t(`types.${story.mediaType}` as 'types.image')
                          : story.mediaType}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>
                        {story.viewCount} {t('views')}
                      </span>
                      <span>{formatDateTime(story.createdAt)}</span>
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      disabled={deletingStoryId === story.id}
                      onClick={() => handleDelete(story.id)}
                    >
                      {t('deleteAction')}
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
                {tTable('previous')}
              </Button>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {tTable('pageOf', { current: page, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                {tTable('next')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
