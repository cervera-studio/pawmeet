import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export function useContentModerationViewModel() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data, isLoading, refetch } = trpc.contentModeration.pendingReports.useQuery({
    cursor,
    limit: 20,
  });

  const reviewMutation = trpc.contentModeration.reviewReport.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  function handleReview(reportId: string, action: 'reviewed' | 'dismissed') {
    reviewMutation.mutate({ reportId, action });
  }

  function loadMore() {
    if (data?.nextCursor) {
      setCursor(data.nextCursor);
    }
  }

  return {
    reports: data?.reports ?? [],
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    isReviewing: reviewMutation.isPending,
    handleReview,
    loadMore,
    refetch,
  };
}
