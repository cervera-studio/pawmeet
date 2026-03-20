'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { PAGINATION } from '@/lib/constants';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import { translateDynamic } from '@/lib/utils';
import {
  type FetchSupportTicketsParams,
  fetchSupportTickets as fetchTicketsAction,
  type SupportTicketListItem,
  type SupportTicketsResult,
} from './actions';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketCategory = 'general' | 'bug' | 'account' | 'safety' | 'billing' | 'other';

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const CATEGORIES: TicketCategory[] = ['general', 'bug', 'account', 'safety', 'billing', 'other'];

interface TicketListProps {
  initialData: SupportTicketsResult;
}

export function TicketList({ initialData }: TicketListProps) {
  const t = useTranslations('support');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | undefined>(undefined);
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  });
  const [data, setData] = useState<SupportTicketsResult>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchTickets(
    paginationOverride?: { pageIndex: number; pageSize: number },
    statusOverride?: TicketStatus | undefined,
    categoryOverride?: TicketCategory | undefined,
  ) {
    const pag = paginationOverride ?? pagination;
    const status = statusOverride === undefined ? statusFilter : statusOverride;
    const category = categoryOverride === undefined ? categoryFilter : categoryOverride;
    setIsLoading(true);
    try {
      const params: FetchSupportTicketsParams = {
        page: pag.pageIndex + 1,
        pageSize: pag.pageSize,
        status,
        category,
      };
      const result = await fetchTicketsAction(params);
      setData(result);
    } catch (error) {
      toast.error(handleError(error, t('toast.loadError')));
    } finally {
      setIsLoading(false);
    }
  }

  function handleStatusFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const newStatus = value === 'all' ? undefined : (value as TicketStatus);
    setStatusFilter(newStatus);
    const newPagination = { ...pagination, pageIndex: 0 };
    setPagination(newPagination);
    void fetchTickets(newPagination, newStatus, categoryFilter);
  }

  function handleCategoryFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const newCategory = value === 'all' ? undefined : (value as TicketCategory);
    setCategoryFilter(newCategory);
    const newPagination = { ...pagination, pageIndex: 0 };
    setPagination(newPagination);
    void fetchTickets(newPagination, statusFilter, newCategory);
  }

  function handlePaginationChange(newPagination: { pageIndex: number; pageSize: number }) {
    setPagination(newPagination);
    void fetchTickets(newPagination);
  }

  const totalPages = Math.ceil(data.total / pagination.pageSize);

  const columns: ColumnDef<SupportTicketListItem>[] = [
    {
      accessorKey: 'status',
      header: t('columns.status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} type="support" />,
    },
    {
      accessorKey: 'subject',
      header: t('columns.subject'),
      cell: ({ row }) => (
        <Link
          href={`/support/${row.original.id}`}
          className="font-medium text-sm hover:text-primary-600 hover:underline"
        >
          {row.original.subject}
        </Link>
      ),
    },
    {
      accessorKey: 'userName',
      header: t('columns.user'),
      cell: ({ row }) => {
        const { userName, guestName, guestEmail } = row.original;
        if (userName) return <span className="text-sm">{userName}</span>;
        if (guestName) {
          return (
            <span className="text-sm">
              {guestName}
              {guestEmail ? <span className="ml-1 text-neutral-500">({guestEmail})</span> : null}
            </span>
          );
        }
        return <span className="text-sm text-neutral-500">-</span>;
      },
    },
    {
      accessorKey: 'category',
      header: t('columns.category'),
      cell: ({ row }) => (
        <Badge variant="outline">{translateDynamic(t, 'categories', row.original.category)}</Badge>
      ),
    },
    {
      accessorKey: 'assignedAdminName',
      header: t('columns.assignedTo'),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.assignedAdminName ?? <span className="text-neutral-500">-</span>}
        </span>
      ),
    },
    {
      accessorKey: 'lastMessageAt',
      header: t('columns.lastMessage'),
      cell: ({ row }) => (
        <span className="text-sm text-neutral-500">
          {row.original.lastMessageAt ? formatDateTime(row.original.lastMessageAt) : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'messageCount',
      header: t('columns.messages'),
      cell: ({ row }) => <span className="text-sm text-center">{row.original.messageCount}</span>,
    },
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter ?? 'all'}
          onChange={handleStatusFilterChange}
          className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">{t('allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {translateDynamic(t, 'statuses', s)}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter ?? 'all'}
          onChange={handleCategoryFilterChange}
          className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">{t('allCategories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {translateDynamic(t, 'categories', c)}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data.data}
        total={data.total}
        totalPages={totalPages}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
      />
    </>
  );
}
