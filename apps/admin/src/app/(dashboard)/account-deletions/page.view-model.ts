import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { usePaginatedData } from '@/hooks/use-paginated-data';
import { fetchPendingDeletions } from './actions';

export type DeletionsData = Awaited<ReturnType<typeof fetchPendingDeletions>>;
export type PendingDeletion = DeletionsData['data'][number];

export function useDeletionsViewModel(initialData: DeletionsData, pageSize: number) {
  const tt = useTranslations('toast');

  const buildParams = useCallback(
    (ctx: { page: number; pageSize: number }) => ({
      page: ctx.page,
      pageSize: ctx.pageSize,
    }),
    [],
  );

  return usePaginatedData({
    initialData,
    pageSize,
    fetchFn: fetchPendingDeletions,
    buildParams,
    errorMessage: tt('deletions.loadError'),
    enableSearch: false,
  });
}
