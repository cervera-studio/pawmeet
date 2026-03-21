'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useModerationWs } from '@/hooks/use-moderation-ws';
import { useAuthContext } from '@/lib/auth-store';
import { PAGINATION } from '@/lib/constants';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import type { FeedPost, FeedPostPage, FeedStats } from '@/repositories';
import { fetchFeedPosts, fetchFeedStats, moderatePost } from './actions';

type StatusFilter = 'pending' | 'approved' | 'rejected' | undefined;

type StatusStyle = { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };

interface FeedListProps {
  initialPosts: FeedPostPage;
  initialStats: FeedStats;
}

function StatsCards({ stats }: { stats: FeedStats }) {
  const t = useTranslations('feed');
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-neutral-900">{stats.totalPosts}</p>
        <p className="text-sm text-neutral-500">{t('stats.totalPosts')}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-amber-600">{stats.pendingPosts}</p>
        <p className="text-sm text-neutral-500">{t('stats.pending')}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-red-600">{stats.rejectedPosts}</p>
        <p className="text-sm text-neutral-500">{t('stats.rejected')}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-neutral-900">{stats.totalStories}</p>
        <p className="text-sm text-neutral-500">{t('stats.stories')}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-red-600">{stats.pendingReports}</p>
        <p className="text-sm text-neutral-500">{t('stats.reports')}</p>
      </Card>
    </div>
  );
}

function FiltersSection({
  statusFilter,
  search,
  total,
  statusOptions,
  onStatusFilter,
  onSearch,
}: {
  statusFilter: StatusFilter;
  search: string;
  total: number;
  statusOptions: ReadonlyArray<{ value: StatusFilter; label: string }>;
  onStatusFilter: (status: StatusFilter) => void;
  onSearch: (value: string) => void;
}) {
  const t = useTranslations('feed');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1">
        {statusOptions.map((opt) => (
          <Button
            key={opt.label}
            variant={statusFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      <Input
        placeholder={t('searchPlaceholder')}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="w-64"
      />
      <span className="text-sm text-neutral-500">{t('resultCount', { count: total })}</span>
    </div>
  );
}

function PostListItem({
  post,
  statusStyles,
  updatingPostId,
  onModerate,
}: {
  post: FeedPost;
  statusStyles: Record<string, StatusStyle>;
  updatingPostId: string | null;
  onModerate: (postId: string, status: 'approved' | 'rejected') => void;
}) {
  const t = useTranslations('feed');
  const statusInfo = statusStyles[post.moderationStatus] ?? {
    label: post.moderationStatus,
    variant: 'outline' as const,
  };
  const caption = (() => {
    if (!post.caption) return t('noCaption');
    return post.caption.length > 120 ? `${post.caption.slice(0, 120)}...` : post.caption;
  })();

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        {post.media.length > 0 ? (
          <div className="flex-shrink-0">
            <img
              src={post.media[0]?.thumbnailUrl ?? post.media[0]?.url}
              alt=""
              className="h-20 w-20 rounded-lg object-cover"
            />
            {post.media.length > 1 ? (
              <p className="mt-1 text-center text-xs text-neutral-500">+{post.media.length - 1}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            {post.reportCount > 0 ? (
              <Badge variant="destructive">{t('reportCount', { count: post.reportCount })}</Badge>
            ) : null}
            {post.isDeleted ? <Badge variant="secondary">{t('deleted')}</Badge> : null}
          </div>
          <p className="text-sm text-neutral-700">{caption}</p>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span>{post.authorName ?? t('unknownUser')}</span>
            <span>{post.likesCount} like</span>
            <span>{post.commentsCount} commenti</span>
            <span>{formatDateTime(post.createdAt)}</span>
          </div>
        </div>

        <PostActions post={post} updatingPostId={updatingPostId} onModerate={onModerate} />
      </div>
    </Card>
  );
}

function PostActions({
  post,
  updatingPostId,
  onModerate,
}: {
  post: FeedPost;
  updatingPostId: string | null;
  onModerate: (postId: string, status: 'approved' | 'rejected') => void;
}) {
  const t = useTranslations('feed');

  if (post.moderationStatus === 'pending') {
    return (
      <div className="flex flex-shrink-0 items-start gap-2">
        <Button
          size="sm"
          variant="default"
          disabled={updatingPostId === post.id}
          onClick={() => onModerate(post.id, 'approved')}
        >
          {t('approve')}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={updatingPostId === post.id}
          onClick={() => onModerate(post.id, 'rejected')}
        >
          {t('reject')}
        </Button>
      </div>
    );
  }

  if (post.moderationStatus === 'approved') {
    return (
      <div className="flex flex-shrink-0 items-start">
        <Button
          size="sm"
          variant="destructive"
          disabled={updatingPostId === post.id}
          onClick={() => onModerate(post.id, 'rejected')}
        >
          {t('reject')}
        </Button>
      </div>
    );
  }

  return null;
}

function PostListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={`skeleton-${String(i)}`} className="animate-pulse p-6">
          <div className="h-4 w-1/3 rounded bg-neutral-200" />
          <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200" />
        </Card>
      ))}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const tTable = useTranslations('table');
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {tTable('previous')}
      </Button>
      <span className="text-sm text-neutral-500">
        {tTable('pageOf', { current: page, total: totalPages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {tTable('next')}
      </Button>
    </div>
  );
}

export function FeedList({ initialPosts, initialStats }: FeedListProps) {
  const t = useTranslations('feed');
  const tt = useTranslations('toast');
  const { user } = useAuthContext();
  const [posts, setPosts] = useState(initialPosts.data);
  const [total, setTotal] = useState(initialPosts.total);
  const [totalPages, setTotalPages] = useState(initialPosts.totalPages);
  const [page, setPageState] = useState(1);
  const [stats, setStats] = useState<FeedStats>(initialStats);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);

  useModerationWs({
    onNewItem: useCallback(
      (queue: string) => {
        if (queue === 'feed') {
          toast.info(t('toast.newPostArrived'));
        }
      },
      [t],
    ),
    onItemActioned: useCallback(
      (queue: string, itemId: string, _action: string, adminId: string) => {
        if (queue !== 'feed') return;
        if (adminId === user?.id) return;
        setPosts((prev) => prev.filter((p) => p.id !== itemId));
        toast.info(t('toast.actionedByOther'));
      },
      [user?.id, t],
    ),
  });

  const STATUS_STYLES: Record<string, StatusStyle> = {
    pending: { label: t('statuses.pending'), variant: 'outline' },
    approved: { label: t('statuses.approved'), variant: 'default' },
    rejected: { label: t('statuses.rejected'), variant: 'destructive' },
  };

  const STATUS_OPTIONS = [
    { value: undefined, label: t('tabs.all') },
    { value: 'pending' as const, label: t('tabs.pending') },
    { value: 'approved' as const, label: t('tabs.approved') },
    { value: 'rejected' as const, label: t('tabs.rejected') },
  ];

  async function fetchPosts(params?: {
    pageOverride?: number;
    statusOverride?: StatusFilter;
    searchOverride?: string;
  }) {
    const p = params?.pageOverride ?? page;
    const s = params?.statusOverride === undefined ? statusFilter : params.statusOverride;
    const q = params?.searchOverride === undefined ? search : params.searchOverride;
    setIsLoading(true);
    try {
      const result = await fetchFeedPosts({
        page: p,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
        status: s,
        search: q || undefined,
      });
      setPosts(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (error) {
      toast.error(handleError(error, tt('moderation.feedLoadError')));
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const result = await fetchFeedStats();
      setStats(result);
    } catch (error) {
      toast.error(handleError(error, tt('moderation.feedStatsError')));
    }
  }

  function handleModeration(postId: string, status: 'approved' | 'rejected') {
    setUpdatingPostId(postId);
    const toastMessage = status === 'approved' ? t('postApproved') : t('postRejected');
    moderatePost(postId, status)
      .then(() => {
        toast.success(toastMessage);
        void fetchPosts();
        void fetchStats();
      })
      .catch((error) => {
        toast.error(handleError(error, tt('moderation.feedModerateError')));
      })
      .finally(() => {
        setUpdatingPostId(null);
      });
  }

  function handleStatusFilter(status: StatusFilter) {
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
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      <StatsCards stats={stats} />

      <FiltersSection
        statusFilter={statusFilter}
        search={search}
        total={total}
        statusOptions={STATUS_OPTIONS}
        onStatusFilter={handleStatusFilter}
        onSearch={handleSearch}
      />

      {isLoading ? <PostListSkeleton /> : null}
      {!isLoading && posts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-neutral-500">{t('noPostsFound')}</p>
        </Card>
      ) : null}
      {!isLoading && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostListItem
              key={post.id}
              post={post}
              statusStyles={STATUS_STYLES}
              updatingPostId={updatingPostId}
              onModerate={handleModeration}
            />
          ))}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </>
  );
}
