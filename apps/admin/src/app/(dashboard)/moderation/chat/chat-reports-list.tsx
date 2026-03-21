'use client';

import type { PaginatedResult } from '@pawmeet/types';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useModerationWs } from '@/hooks/use-moderation-ws';
import { useAuthContext } from '@/lib/auth-store';
import { PAGINATION } from '@/lib/constants';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import type { AdminReportListItem, ReportStatus, ResolveAction } from '@/repositories';
import { fetchChatReports, resolveChatReport } from './actions';

interface ChatReportsListProps {
  initialData: PaginatedResult<AdminReportListItem>;
}

export function ChatReportsList({ initialData }: ChatReportsListProps) {
  const t = useTranslations('chatModeration');
  const tt = useTranslations('toast');
  const { user } = useAuthContext();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>('pending');
  const [data, setData] = useState<PaginatedResult<AdminReportListItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  useModerationWs({
    onNewItem: useCallback(
      (queue: string) => {
        if (queue === 'chat') {
          toast.info(t('toast.newChatReportArrived'));
        }
      },
      [t],
    ),
    onItemActioned: useCallback(
      (queue: string, itemId: string, _action: string, adminId: string) => {
        if (queue !== 'chat') return;
        if (adminId === user?.id) return;
        setData((prev) => ({
          ...prev,
          data: prev.data.filter((r) => r.id !== itemId),
          total: prev.total - 1,
        }));
        toast.info(t('toast.actionedByOther'));
      },
      [user?.id, t],
    ),
  });

  const STATUS_TABS: { label: string; value: ReportStatus | undefined }[] = [
    { label: t('tabs.all'), value: undefined },
    { label: t('tabs.pending'), value: 'pending' },
    { label: t('tabs.resolved'), value: 'resolved' },
    { label: t('tabs.dismissed'), value: 'dismissed' },
  ];

  async function fetchReports(pageNum: number, status?: ReportStatus) {
    setIsLoading(true);
    try {
      const result = await fetchChatReports({
        page: pageNum,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
        status,
      });
      setData(result);
    } catch (error) {
      toast.error(handleError(error, tt('moderation.reportsLoadError')));
    } finally {
      setIsLoading(false);
    }
  }

  function handleStatusFilterChange(value: ReportStatus | undefined) {
    setStatusFilter(value);
    setPage(1);
    void fetchReports(1, value);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    void fetchReports(newPage, statusFilter);
  }

  async function handleResolve(reportId: string, action: ResolveAction) {
    try {
      await resolveChatReport(reportId, action);
      toast.success(t('actions.completed'));
      void fetchReports(page, statusFilter);
    } catch (error) {
      toast.error(handleError(error, t('actions.error')));
    }
  }

  const totalPages = Math.ceil(data.total / PAGINATION.DEFAULT_PAGE_SIZE);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusFilterChange(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`skeleton-${String(i)}`} className="animate-pulse p-6">
              <div className="h-4 w-1/3 rounded bg-neutral-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200" />
            </Card>
          ))}
        </div>
      ) : null}

      {!isLoading && data.data.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-neutral-500">{t('noPending')}</p>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && data.data.length > 0 ? (
        <div className="space-y-4">
          {data.data.map((report) => (
            <Card key={report.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Reporter / Reported */}
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      <span className="text-neutral-500">{t('reporter')}:</span>{' '}
                      <a
                        href={`/users/${report.reporterId}`}
                        className="font-medium hover:text-primary-600"
                      >
                        {report.reporterName}
                      </a>
                    </span>
                    <span className="text-neutral-300">&rarr;</span>
                    <span>
                      <span className="text-neutral-500">{t('reported')}:</span>{' '}
                      <a
                        href={`/users/${report.reportedUserId}`}
                        className="font-medium hover:text-primary-600"
                      >
                        {report.reportedName}
                      </a>
                    </span>
                  </div>

                  {/* Description (message content) */}
                  {report.description ? (
                    <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      &ldquo;{report.description}&rdquo;
                    </div>
                  ) : null}

                  {/* Meta */}
                  <div className="flex items-center gap-3">
                    <StatusBadge status={report.status} type="report" />
                    <span className="text-xs text-neutral-500">
                      {formatDateTime(report.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {report.status === 'pending' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger>{t('actions.manage')}</DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleResolve(report.id, 'dismiss')}>
                        {t('actions.dismiss')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResolve(report.id, 'warn')}>
                        {t('actions.warn')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleResolve(report.id, 'suspend')}
                        className="text-orange-600"
                      >
                        {t('actions.suspend')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                &larr;
              </Button>
              <span className="text-sm text-neutral-500">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                &rarr;
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
