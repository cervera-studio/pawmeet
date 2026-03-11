'use client';

import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/formatters';
import { useStoryModerationViewModel } from './page.view-model';

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

export default function StoryModerationPage() {
  const vm = useStoryModerationViewModel();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Gestione storie</h1>
        <p className="text-neutral-500">Visualizza e modera le storie degli utenti</p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-500">
          {vm.total} {vm.total === 1 ? 'storia' : 'storie'} totali
        </span>
      </div>

      {/* Stories grid */}
      {vm.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={`skeleton-${String(i)}`} className="animate-pulse p-4">
              <div className="aspect-[9/16] w-full rounded bg-neutral-200" />
              <div className="mt-3 h-3 w-2/3 rounded bg-neutral-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200" />
            </Card>
          ))}
        </div>
      ) : vm.stories.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-neutral-500">Nessuna storia trovata</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {vm.stories.map((story) => {
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
                      disabled={vm.isDeleting}
                      onClick={() => {
                        vm.handleDelete(story.id);
                        toast.success('Storia eliminata');
                      }}
                    >
                      Elimina
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {vm.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={vm.page <= 1}
                onClick={() => vm.setPage(vm.page - 1)}
              >
                Precedente
              </Button>
              <span className="text-sm text-neutral-500">
                Pagina {vm.page} di {vm.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={vm.page >= vm.totalPages}
                onClick={() => vm.setPage(vm.page + 1)}
              >
                Successiva
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
