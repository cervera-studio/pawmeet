import type { PaginatedResult } from '@dogwalk/types';
import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import { type AdminReportListItem, type ReportStatus, reportRepository } from '@/repositories';

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
  const [data, setData] = useState<PaginatedResult<AdminReportListItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await reportRepository.list({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        status: statusFilter,
      });
      setData(result);
    } catch (error) {
      console.error('[Reports] Failed to fetch reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, statusFilter]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

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
