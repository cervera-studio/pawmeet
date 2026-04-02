'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/formatters';
import type { AdminGroupEventListItem, ListGroupEventsParams } from '@/repositories';
import { useGroupEventsViewModel } from './page.view-model';

type EventStatus = NonNullable<ListGroupEventsParams['status']>;
type EventCategory = NonNullable<ListGroupEventsParams['category']>;

const EVENT_STATUSES: EventStatus[] = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'template',
];
const EVENT_CATEGORIES: EventCategory[] = ['walk', 'meetup', 'training'];

function isEventStatus(v: string): v is EventStatus {
  return (EVENT_STATUSES as string[]).includes(v);
}

function isEventCategory(v: string): v is EventCategory {
  return (EVENT_CATEGORIES as string[]).includes(v);
}

const statusVariants: Record<
  string,
  'success' | 'warning' | 'destructive' | 'outline' | 'secondary'
> = {
  scheduled: 'success',
  in_progress: 'warning',
  completed: 'outline',
  cancelled: 'destructive',
  template: 'secondary',
};

interface GroupEventsTableProps {
  initialData: PaginatedResult<AdminGroupEventListItem>;
  pageSize: number;
}

export function GroupEventsTable({ initialData, pageSize }: GroupEventsTableProps) {
  const t = useTranslations('events');
  const tc = useTranslations('common');
  const vm = useGroupEventsViewModel(initialData, pageSize);

  const columns: ColumnDef<AdminGroupEventListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: t('columns.title'),
        cell: ({ row }) => (
          <a
            href={`/group-events/${row.original.id}`}
            className="font-medium text-primary-600 hover:underline"
          >
            {row.original.title}
          </a>
        ),
      },
      {
        accessorKey: 'category',
        header: t('columns.category'),
        cell: ({ row }) => (
          <Badge variant="outline">
            {t(
              `categories.${row.original.category}` as
                | 'categories.walk'
                | 'categories.meetup'
                | 'categories.training',
            ) ?? row.original.category}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: t('columns.status'),
        cell: ({ row }) => {
          const variant = statusVariants[row.original.status] ?? 'outline';
          const label =
            t(
              `statuses.${row.original.status}` as
                | 'statuses.scheduled'
                | 'statuses.in_progress'
                | 'statuses.completed'
                | 'statuses.cancelled'
                | 'statuses.template',
            ) ?? row.original.status;
          return <Badge variant={variant}>{label}</Badge>;
        },
      },
      {
        accessorKey: 'visibility',
        header: t('columns.visibility'),
        cell: ({ row }) =>
          t(
            `visibility.${row.original.visibility}` as
              | 'visibility.public'
              | 'visibility.friends_only'
              | 'visibility.invite_only',
          ) ?? row.original.visibility,
      },
      {
        accessorKey: 'scheduledAt',
        header: t('columns.date'),
        cell: ({ row }) => formatDateTime(row.original.scheduledAt),
      },
      {
        accessorKey: 'creatorName',
        header: t('columns.creator'),
        cell: ({ row }) => {
          const name = row.original.creatorName ?? tc('unknown');
          return (
            <a
              href={`/users/${row.original.creatorId}`}
              className="text-primary-600 hover:underline"
            >
              {name}
            </a>
          );
        },
      },
      {
        id: 'participants',
        header: t('columns.participants'),
        cell: ({ row }) => {
          const { participantCount, maxParticipants, pendingCount } = row.original;
          return (
            <span>
              {participantCount}/{maxParticipants}
              {pendingCount > 0 && (
                <Badge variant="warning" className="ml-2">
                  {pendingCount} {t('columns.pending')}
                </Badge>
              )}
            </span>
          );
        },
      },
      {
        id: 'flags',
        header: '',
        cell: ({ row }) => (
          <span className="flex gap-1">
            {row.original.isRecurring && (
              <Badge variant="secondary">{t('columns.recurring')}</Badge>
            )}
            {row.original.requiresApproval && (
              <Badge variant="outline">{t('columns.approval')}</Badge>
            )}
          </span>
        ),
      },
    ],
    [t, tc],
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
          value={vm.statusFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            vm.setStatusFilter(isEventStatus(v) ? v : undefined);
          }}
        >
          <option value="">{t('allStatuses')}</option>
          <option value="scheduled">{t('statuses.scheduled')}</option>
          <option value="in_progress">{t('statuses.in_progress')}</option>
          <option value="completed">{t('statuses.completed')}</option>
          <option value="cancelled">{t('statuses.cancelled')}</option>
          <option value="template">{t('statuses.template')}</option>
        </select>
        <select
          className="rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
          value={vm.categoryFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            vm.setCategoryFilter(isEventCategory(v) ? v : undefined);
          }}
        >
          <option value="">{t('allCategories')}</option>
          <option value="walk">{t('categories.walk')}</option>
          <option value="meetup">{t('categories.meetup')}</option>
          <option value="training">{t('categories.training')}</option>
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
