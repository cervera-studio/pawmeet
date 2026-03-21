'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useModerationWs } from '@/hooks/use-moderation-ws';
import { useAuthContext } from '@/lib/auth-store';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import { translateDynamic } from '@/lib/utils';
import type { ContentReport, ContentReportPage, ReviewAction } from '@/repositories';
import { fetchPendingContent, reviewContent } from './actions';

interface ContentListProps {
  initialData: ContentReportPage;
}

export function ContentList({ initialData }: ContentListProps) {
  const t = useTranslations('content');
  const tt = useTranslations('toast');
  const { user } = useAuthContext();
  const [reports, setReports] = useState<ContentReport[]>(initialData.reports);
  const [nextCursor, setNextCursor] = useState<string | null>(initialData.nextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewingReportId, setReviewingReportId] = useState<string | null>(null);

  useModerationWs({
    onNewItem: useCallback(
      (queue: string) => {
        if (queue === 'content') {
          toast.info(t('toast.newContentReportArrived'));
        }
      },
      [t],
    ),
    onItemActioned: useCallback(
      (queue: string, itemId: string, _action: string, adminId: string) => {
        if (queue !== 'content') return;
        if (adminId === user?.id) return;
        setReports((prev) => prev.filter((r) => r.id !== itemId));
        toast.info(t('toast.actionedByOther'));
      },
      [user?.id, t],
    ),
  });

  async function fetchReports(cursor?: string) {
    setIsLoading(true);
    try {
      const result = await fetchPendingContent({ cursor, limit: 20 });
      setReports(result.reports);
      setNextCursor(result.nextCursor);
    } catch (error) {
      toast.error(handleError(error, tt('moderation.contentLoadError')));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReview(reportId: string, action: ReviewAction) {
    setReviewingReportId(reportId);
    try {
      await reviewContent(reportId, action);
      void fetchReports();
    } catch (error) {
      toast.error(handleError(error, tt('moderation.contentReviewError')));
    } finally {
      setReviewingReportId(null);
    }
  }

  function loadMore() {
    if (nextCursor) {
      void fetchReports(nextCursor);
    }
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
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
      {!isLoading && reports.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-neutral-500">{t('noPending')}</p>
        </Card>
      ) : null}
      {!isLoading && reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {translateDynamic(t, 'types', report.contentType)}
                    </Badge>
                    <Badge variant="secondary">
                      {translateDynamic(t, 'reasons', report.reason)}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-500">
                    {t('contentId')}: <span className="font-mono text-xs">{report.contentId}</span>
                  </p>
                  <p className="text-sm text-neutral-500">
                    {t('reporter')}: <span className="font-mono text-xs">{report.reporterId}</span>
                  </p>
                  {report.description ? (
                    <p className="text-sm text-neutral-500 italic">
                      &quot;{report.description}&quot;
                    </p>
                  ) : null}
                  <p className="text-xs text-neutral-500">{formatDateTime(report.createdAt)}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reviewingReportId === report.id}
                    onClick={() => {
                      handleReview(report.id, 'dismissed');
                      toast.success(t('dismissed'));
                    }}
                  >
                    {t('dismiss')}
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={reviewingReportId === report.id}
                    onClick={() => {
                      handleReview(report.id, 'reviewed');
                      toast.success(t('reviewed'));
                    }}
                  >
                    {t('review')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {nextCursor ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                {t('loadMore')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
