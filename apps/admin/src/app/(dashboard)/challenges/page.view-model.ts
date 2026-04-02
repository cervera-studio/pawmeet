import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { usePaginatedData } from '@/hooks/use-paginated-data';
import { fetchChallenges } from './actions';

export type ChallengesData = Awaited<ReturnType<typeof fetchChallenges>>;
export type Challenge = ChallengesData['data'][number];

export function useChallengesViewModel(initialData: ChallengesData, pageSize: number) {
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
    fetchFn: fetchChallenges,
    buildParams,
    errorMessage: tt('challenges.loadError'),
    enableSearch: false,
  });
}
