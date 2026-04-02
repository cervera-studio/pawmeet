import type { PaginatedResult } from '@pawmeet/types';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { usePaginatedData } from '@/hooks/use-paginated-data';
import type { AdminOrganizationListItem, ListOrganizationsParams } from '@/repositories';
import { fetchOrganizations } from './actions';

type OrgType = NonNullable<ListOrganizationsParams['type']>;

export function useOrganizationsViewModel(
  initialData: PaginatedResult<AdminOrganizationListItem>,
  pageSize: number,
) {
  const tt = useTranslations('toast');
  const [typeFilter, setTypeFilter] = useState<OrgType | undefined>(undefined);

  const buildParams = useCallback(
    (ctx: { page: number; pageSize: number; search: string | undefined }) => ({
      page: ctx.page,
      pageSize: ctx.pageSize,
      search: ctx.search,
      type: typeFilter,
    }),
    [typeFilter],
  );

  const paginated = usePaginatedData({
    initialData,
    pageSize,
    fetchFn: fetchOrganizations,
    buildParams,
    errorMessage: tt('organizations.loadError'),
  });

  function handleTypeFilterChange(type: OrgType | undefined) {
    setTypeFilter(type);
    paginated.resetPage();
  }

  return {
    ...paginated,
    typeFilter,
    setTypeFilter: handleTypeFilterChange,
  };
}
