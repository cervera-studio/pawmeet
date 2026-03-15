'use client';

import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/formatters';
import { fetchAuditLog } from './actions';

interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
  reason: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogData {
  data: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AuditLogTableProps {
  initialData: AuditLogData;
  pageSize: number;
}

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

function isResourceType(v: string): v is ResourceType {
  return (RESOURCE_TYPES as readonly string[]).includes(v);
}

const DESTRUCTIVE_ACTIONS = ['ban', 'delete', 'reject'];
const WARNING_ACTIONS = ['suspend', 'cancel', 'revoke', 'remove'];
const SUCCESS_ACTIONS = ['approve', 'verify', 'reactivate'];

function getActionVariant(action: string) {
  const lower = action.toLowerCase();
  if (DESTRUCTIVE_ACTIONS.some((a) => lower.includes(a))) return 'destructive' as const;
  if (WARNING_ACTIONS.some((a) => lower.includes(a))) return 'warning' as const;
  if (SUCCESS_ACTIONS.some((a) => lower.includes(a))) return 'success' as const;
  return 'outline' as const;
}

function ChangesDetail({
  changes,
  beforeLabel,
  afterLabel,
  noChangesLabel,
}: {
  changes: Record<string, unknown> | null;
  beforeLabel: string;
  afterLabel: string;
  noChangesLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!changes || Object.keys(changes).length === 0) {
    return <span className="text-sm text-neutral-400">{noChangesLabel}</span>;
  }

  const before = (changes.before ?? null) as Record<string, unknown> | null;
  const after = (changes.after ?? null) as Record<string, unknown> | null;

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '-' : '+'}
      </Button>
      {isOpen && (
        <div className="absolute right-0 top-8 z-50 w-96 rounded-md border border-neutral-200 bg-white p-4 shadow-lg">
          {before && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-semibold text-neutral-500">{beforeLabel}</p>
              <pre className="max-h-40 overflow-auto rounded bg-neutral-50 p-2 text-xs">
                {JSON.stringify(before, null, 2)}
              </pre>
            </div>
          )}
          {after && (
            <div>
              <p className="mb-1 text-xs font-semibold text-neutral-500">{afterLabel}</p>
              <pre className="max-h-40 overflow-auto rounded bg-neutral-50 p-2 text-xs">
                {JSON.stringify(after, null, 2)}
              </pre>
            </div>
          )}
          {!before && !after && (
            <pre className="max-h-40 overflow-auto rounded bg-neutral-50 p-2 text-xs">
              {JSON.stringify(changes, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditLogTable({ initialData, pageSize }: AuditLogTableProps) {
  const t = useTranslations('auditLog');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState<ResourceType | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<AuditLogData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const isInitialState = pagination.pageIndex === 0 && debouncedSearch === '' && !resourceFilter;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    setDebounceTimer(timer);
  }

  const loadAuditLog = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchAuditLog({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
        resourceType: resourceFilter,
      });
      setData(result);
    } catch (error) {
      console.error('[AuditLog] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, resourceFilter]);

  useEffect(() => {
    if (isInitialState) return;
    void loadAuditLog();
  }, [loadAuditLog, isInitialState]);

  const columns: ColumnDef<AuditLogEntry>[] = useMemo(
    () => [
      {
        accessorKey: 'adminName',
        header: t('columns.admin'),
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.adminName}</span>
            <br />
            <span className="text-sm text-neutral-500">{row.original.adminEmail}</span>
          </div>
        ),
      },
      {
        accessorKey: 'action',
        header: t('columns.action'),
        cell: ({ row }) => (
          <Badge variant={getActionVariant(row.original.action)}>{row.original.action}</Badge>
        ),
      },
      {
        accessorKey: 'resourceType',
        header: t('columns.resource'),
        cell: ({ row }) => {
          const rt = row.original.resourceType;
          const key = `resourceTypes.${rt}` as
            | 'resourceTypes.user'
            | 'resourceTypes.dog'
            | 'resourceTypes.photo'
            | 'resourceTypes.report'
            | 'resourceTypes.post'
            | 'resourceTypes.story'
            | 'resourceTypes.event'
            | 'resourceTypes.organization'
            | 'resourceTypes.sponsor'
            | 'resourceTypes.settings'
            | 'resourceTypes.deletion';
          return <span>{t(key) ?? rt}</span>;
        },
      },
      {
        accessorKey: 'resourceId',
        header: t('columns.resourceId'),
        cell: ({ row }) => {
          const id = row.original.resourceId;
          if (!id) return <span className="text-neutral-400">-</span>;
          return (
            <span className="font-mono text-sm text-neutral-500" title={id}>
              {id.length > 12 ? `${id.slice(0, 12)}...` : id}
            </span>
          );
        },
      },
      {
        id: 'changes',
        header: t('columns.changes'),
        cell: ({ row }) => (
          <ChangesDetail
            changes={row.original.changes}
            beforeLabel={t('before')}
            afterLabel={t('after')}
            noChangesLabel={t('noChanges')}
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.date'),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [t],
  );

  return (
    <>
      <div className="flex items-center gap-4">
        <Input
          placeholder={t('searchPlaceholder')}
          className="max-w-sm"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
          value={resourceFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setResourceFilter(isResourceType(v) ? v : undefined);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        >
          <option value="">{t('allResources')}</option>
          {RESOURCE_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {t(
                `resourceTypes.${rt}` as
                  | 'resourceTypes.user'
                  | 'resourceTypes.dog'
                  | 'resourceTypes.photo'
                  | 'resourceTypes.report'
                  | 'resourceTypes.post'
                  | 'resourceTypes.story'
                  | 'resourceTypes.event'
                  | 'resourceTypes.organization'
                  | 'resourceTypes.sponsor'
                  | 'resourceTypes.settings'
                  | 'resourceTypes.deletion',
              )}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data.data ?? []}
        total={data.total}
        totalPages={Math.ceil(data.total / pagination.pageSize)}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </>
  );
}
