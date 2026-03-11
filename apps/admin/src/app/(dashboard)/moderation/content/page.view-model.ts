import { useCallback, useEffect, useState } from 'react';
import { type ContentReport, contentModerationRepository, type ReviewAction } from '@/repositories';

export function useContentModerationViewModel() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchReports = useCallback(async (cursor?: string) => {
    setIsLoading(true);
    try {
      const result = await contentModerationRepository.listPending({ cursor, limit: 20 });
      setReports(result.reports);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('[ContentModeration] Failed to fetch reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  async function handleReview(reportId: string, action: ReviewAction) {
    setIsReviewing(true);
    try {
      await contentModerationRepository.review(reportId, action);
      void fetchReports();
    } catch (error) {
      console.error('[ContentModeration] Failed to review report:', error);
    } finally {
      setIsReviewing(false);
    }
  }

  function loadMore() {
    if (nextCursor) {
      void fetchReports(nextCursor);
    }
  }

  return {
    reports,
    nextCursor,
    isLoading,
    isReviewing,
    handleReview,
    loadMore,
    refetch: fetchReports,
  };
}
