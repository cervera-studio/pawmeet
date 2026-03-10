import type { PaginationState } from '@tanstack/react-table';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export const STATUS_TABS: { label: string; value: ReportStatus | undefined }[] = [
  { label: 'Tutte', value: undefined },
  { label: 'In attesa', value: 'pending' },
  { label: 'Risolte', value: 'resolved' },
  { label: 'Archiviate', value: 'dismissed' },
];

export function useReportsViewModel() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const { data, isLoading } = trpc.admin.listReports.useQuery({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    status: statusFilter,
  });

  function handleStatusFilterChange(value: ReportStatus | undefined) {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  return {
    statusFilter,
    handleStatusFilterChange,
    data,
    isLoading,
    pagination,
    setPagination,
  };
}
