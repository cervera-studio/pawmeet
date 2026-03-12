'use client';

import type { PaginatedResult } from '@pawmeet/types';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/formatters';
import type { AdminGroupEventListItem, ListGroupEventsParams } from '@/repositories';
import { fetchGroupEvents } from './actions';

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

const categoryLabels: Record<string, string> = {
  walk: 'Passeggiata',
  meetup: 'Incontro',
  training: 'Addestramento',
};

const visibilityLabels: Record<string, string> = {
  public: 'Pubblico',
  friends_only: 'Solo amici',
  invite_only: 'Su invito',
};

const statusConfig: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }
> = {
  scheduled: { label: 'Programmato', variant: 'success' },
  in_progress: { label: 'In corso', variant: 'warning' },
  completed: { label: 'Completato', variant: 'outline' },
  cancelled: { label: 'Annullato', variant: 'destructive' },
  template: { label: 'Template', variant: 'secondary' },
};

const columns: ColumnDef<AdminGroupEventListItem>[] = [
  {
    accessorKey: 'title',
    header: 'Titolo',
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
    header: 'Categoria',
    cell: ({ row }) => (
      <Badge variant="outline">
        {categoryLabels[row.original.category] ?? row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => {
      const config = statusConfig[row.original.status] ?? {
        label: row.original.status,
        variant: 'outline' as const,
      };
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
  },
  {
    accessorKey: 'visibility',
    header: 'Visibilità',
    cell: ({ row }) => visibilityLabels[row.original.visibility] ?? row.original.visibility,
  },
  {
    accessorKey: 'scheduledAt',
    header: 'Data',
    cell: ({ row }) => formatDateTime(row.original.scheduledAt),
  },
  {
    accessorKey: 'creatorName',
    header: 'Creatore',
    cell: ({ row }) => {
      const name = row.original.creatorName ?? 'Sconosciuto';
      return (
        <a href={`/users/${row.original.creatorId}`} className="text-primary-600 hover:underline">
          {name}
        </a>
      );
    },
  },
  {
    id: 'participants',
    header: 'Partecipanti',
    cell: ({ row }) => {
      const { participantCount, maxParticipants, pendingCount } = row.original;
      return (
        <span>
          {participantCount}/{maxParticipants}
          {pendingCount > 0 && (
            <Badge variant="warning" className="ml-2">
              {pendingCount} in attesa
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
        {row.original.isRecurring && <Badge variant="secondary">Ricorrente</Badge>}
        {row.original.requiresApproval && <Badge variant="outline">Approvazione</Badge>}
      </span>
    ),
  },
];

interface GroupEventsTableProps {
  initialData: PaginatedResult<AdminGroupEventListItem>;
  pageSize: number;
}

export function GroupEventsTable({ initialData, pageSize }: GroupEventsTableProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [data, setData] = useState<PaginatedResult<AdminGroupEventListItem>>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const isInitialState =
    pagination.pageIndex === 0 && debouncedSearch === '' && !statusFilter && !categoryFilter;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    setDebounceTimer(timer);
  }

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchGroupEvents({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter,
        category: categoryFilter,
      });
      setData(result);
    } catch (error) {
      console.error('[GroupEvents] Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, statusFilter, categoryFilter]);

  useEffect(() => {
    if (isInitialState) return;
    void loadEvents();
  }, [loadEvents, isInitialState]);

  return (
    <>
      <div className="flex items-center gap-4">
        <Input
          placeholder="Cerca per titolo..."
          className="max-w-sm"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
          value={statusFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setStatusFilter(isEventStatus(v) ? v : undefined);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        >
          <option value="">Tutti gli stati</option>
          <option value="scheduled">Programmato</option>
          <option value="in_progress">In corso</option>
          <option value="completed">Completato</option>
          <option value="cancelled">Annullato</option>
          <option value="template">Template</option>
        </select>
        <select
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
          value={categoryFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setCategoryFilter(isEventCategory(v) ? v : undefined);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        >
          <option value="">Tutte le categorie</option>
          <option value="walk">Passeggiata</option>
          <option value="meetup">Incontro</option>
          <option value="training">Addestramento</option>
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
