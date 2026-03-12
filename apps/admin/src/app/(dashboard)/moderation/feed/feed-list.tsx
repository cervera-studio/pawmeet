'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/formatters';
import type { FeedPostPage, FeedStats } from '@/repositories';
import { fetchFeedPosts, fetchFeedStats, moderatePost } from './actions';

const STATUS_STYLES: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'In attesa', variant: 'outline' },
  approved: { label: 'Approvato', variant: 'default' },
  rejected: { label: 'Rifiutato', variant: 'destructive' },
};

const STATUS_OPTIONS = [
  { value: undefined, label: 'Tutti' },
  { value: 'pending' as const, label: 'In attesa' },
  { value: 'approved' as const, label: 'Approvati' },
  { value: 'rejected' as const, label: 'Rifiutati' },
];

interface FeedListProps {
  initialPosts: FeedPostPage;
  initialStats: FeedStats;
}

export function FeedList({ initialPosts, initialStats }: FeedListProps) {
  const [posts, setPosts] = useState(initialPosts.data);
  const [total, setTotal] = useState(initialPosts.total);
  const [totalPages, setTotalPages] = useState(initialPosts.totalPages);
  const [page, setPageState] = useState(1);
  const [stats, setStats] = useState<FeedStats>(initialStats);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | undefined>(
    undefined,
  );
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  async function fetchPosts(params?: {
    pageOverride?: number;
    statusOverride?: 'pending' | 'approved' | 'rejected' | undefined;
    searchOverride?: string;
  }) {
    const p = params?.pageOverride ?? page;
    const s = params?.statusOverride !== undefined ? params.statusOverride : statusFilter;
    const q = params?.searchOverride !== undefined ? params.searchOverride : search;
    setIsLoading(true);
    try {
      const result = await fetchFeedPosts({
        page: p,
        pageSize: 20,
        status: s,
        search: q || undefined,
      });
      setPosts(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (error) {
      console.error('[FeedModeration] Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const result = await fetchFeedStats();
      setStats(result);
    } catch (error) {
      console.error('[FeedModeration] Failed to fetch stats:', error);
    }
  }

  async function handleModeration(postId: string, status: 'approved' | 'rejected') {
    setIsUpdating(true);
    try {
      await moderatePost(postId, status);
      void fetchPosts();
      void fetchStats();
    } catch (error) {
      console.error('[FeedModeration] Failed to update post:', error);
    } finally {
      setIsUpdating(false);
    }
  }

  function handleStatusFilter(status: 'pending' | 'approved' | 'rejected' | undefined) {
    setStatusFilter(status);
    setPageState(1);
    void fetchPosts({ pageOverride: 1, statusOverride: status });
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPageState(1);
    void fetchPosts({ pageOverride: 1, searchOverride: value });
  }

  function setPage(newPage: number) {
    setPageState(newPage);
    void fetchPosts({ pageOverride: newPage });
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Gestione feed</h1>
        <p className="text-neutral-500">Modera i post del feed e monitora le statistiche</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">{stats.totalPosts}</p>
          <p className="text-sm text-neutral-500">Post totali</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.pendingPosts}</p>
          <p className="text-sm text-neutral-500">In attesa</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.rejectedPosts}</p>
          <p className="text-sm text-neutral-500">Rifiutati</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">{stats.totalStories}</p>
          <p className="text-sm text-neutral-500">Storie</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.pendingReports}</p>
          <p className="text-sm text-neutral-500">Segnalazioni</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.label}
              variant={statusFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Cerca per autore..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-64"
        />
        <span className="text-sm text-neutral-500">
          {total} {total === 1 ? 'risultato' : 'risultati'}
        </span>
      </div>

      {/* Posts list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`skeleton-${String(i)}`} className="animate-pulse p-6">
              <div className="h-4 w-1/3 rounded bg-neutral-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200" />
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-neutral-500">Nessun post trovato</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const statusInfo = STATUS_STYLES[post.moderationStatus] ?? {
              label: 'Sconosciuto',
              variant: 'outline' as const,
            };
            return (
              <Card key={post.id} className="p-4">
                <div className="flex gap-4">
                  {/* Media preview */}
                  {post.media.length > 0 ? (
                    <div className="flex-shrink-0">
                      {/* biome-ignore lint/performance/noImgElement: external user-uploaded URLs */}
                      <img
                        src={post.media[0]?.thumbnailUrl ?? post.media[0]?.url}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                      {post.media.length > 1 ? (
                        <p className="mt-1 text-center text-xs text-neutral-400">
                          +{post.media.length - 1}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Post details */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      {post.reportCount > 0 ? (
                        <Badge variant="destructive">
                          {post.reportCount} segnalazion{post.reportCount === 1 ? 'e' : 'i'}
                        </Badge>
                      ) : null}
                      {post.isDeleted ? <Badge variant="secondary">Eliminato</Badge> : null}
                    </div>

                    <p className="text-sm text-neutral-700">
                      {post.caption
                        ? post.caption.length > 120
                          ? `${post.caption.slice(0, 120)}...`
                          : post.caption
                        : 'Senza didascalia'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>{post.authorName ?? 'Utente sconosciuto'}</span>
                      <span>{post.likesCount} like</span>
                      <span>{post.commentsCount} commenti</span>
                      <span>{formatDateTime(post.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {post.moderationStatus === 'pending' ? (
                    <div className="flex flex-shrink-0 items-start gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={isUpdating}
                        onClick={() => {
                          handleModeration(post.id, 'approved');
                          toast.success('Post approvato');
                        }}
                      >
                        Approva
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isUpdating}
                        onClick={() => {
                          handleModeration(post.id, 'rejected');
                          toast.success('Post rifiutato');
                        }}
                      >
                        Rifiuta
                      </Button>
                    </div>
                  ) : post.moderationStatus === 'approved' ? (
                    <div className="flex flex-shrink-0 items-start">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isUpdating}
                        onClick={() => {
                          handleModeration(post.id, 'rejected');
                          toast.success('Post rifiutato');
                        }}
                      >
                        Rifiuta
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
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
                onClick={() => setPage(page + 1)}
              >
                Successiva
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
