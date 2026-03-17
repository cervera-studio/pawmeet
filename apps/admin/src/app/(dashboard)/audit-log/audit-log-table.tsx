'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/formatters';
import {
  type AuditLogData,
  type AuditLogEntry,
  isResourceType,
  RESOURCE_TYPES,
  useAuditLogViewModel,
} from './page.view-model';

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
    return <span className="text-sm text-neutral-500">{noChangesLabel}</span>;
  }

  const before = (changes.before ?? null) as Record<string, unknown> | null;
  const after = (changes.after ?? null) as Record<string, unknown> | null;

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '-' : '+'}
      </Button>
      {isOpen && (
        <div className="absolute right-0 top-8 z-50 w-96 rounded-md border border-neutral-200 bg-surface p-4 shadow-lg">
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

interface AuditLogTableProps {
  initialData: AuditLogData;
  pageSize: number;
}

export function AuditLogTable({ initialData, pageSize }: AuditLogTableProps) {
  const t = useTranslations('auditLog');
  const vm = useAuditLogViewModel(initialData, pageSize);

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
          if (!id) return <span className="text-neutral-500">-</span>;
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
          value={vm.search}
          onChange={(e) => vm.setSearch(e.target.value)}
        />
        <select
          className="rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
          value={vm.resourceFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            vm.setResourceFilter(isResourceType(v) ? v : undefined);
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
        data={vm.data ?? []}
        total={vm.total}
        totalPages={vm.totalPages}
        isLoading={vm.isLoading}
        pagination={vm.pagination}
        onPaginationChange={vm.setPagination}
      />
    </>
  );
}
