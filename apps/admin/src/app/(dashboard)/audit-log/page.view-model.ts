import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { usePaginatedData } from '@/hooks/use-paginated-data';
import { fetchAuditLog } from './actions';

export type AuditLogData = Awaited<ReturnType<typeof fetchAuditLog>>;
export type AuditLogEntry = AuditLogData['data'][number];

const RESOURCE_TYPES = [
  'user',
  'dog',
  'photo',
  'report',
  'post',
  'story',
  'event',
  'organization',
  'sponsor',
  'settings',
  'deletion',
] as const;

type ResourceType = (typeof RESOURCE_TYPES)[number];

export type { ResourceType };
export { RESOURCE_TYPES };

export function isResourceType(v: string): v is ResourceType {
  return (RESOURCE_TYPES as readonly string[]).includes(v);
}

export function useAuditLogViewModel(initialData: AuditLogData, pageSize: number) {
  const tt = useTranslations('toast');
  const [resourceFilter, setResourceFilter] = useState<ResourceType | undefined>(undefined);

  const buildParams = useCallback(
    (ctx: { page: number; pageSize: number; search: string | undefined }) => ({
      page: ctx.page,
      pageSize: ctx.pageSize,
      search: ctx.search,
      resourceType: resourceFilter,
    }),
    [resourceFilter],
  );

  const paginated = usePaginatedData({
    initialData,
    pageSize,
    fetchFn: fetchAuditLog,
    buildParams,
    errorMessage: tt('auditLog.loadError'),
  });

  function handleResourceFilterChange(type: ResourceType | undefined) {
    setResourceFilter(type);
    paginated.resetPage();
  }

  return {
    ...paginated,
    resourceFilter,
    setResourceFilter: handleResourceFilterChange,
  };
}
