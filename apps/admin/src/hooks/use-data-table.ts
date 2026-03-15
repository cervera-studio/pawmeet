import type { PaginationState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

interface UseDataTableOptions {
  totalItems: number;
  initialPageSize?: number;
}

interface UseDataTableReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  offset: number;
}

export function useDataTable({
  totalItems,
  initialPageSize = 20,
}: UseDataTableOptions): UseDataTableReturn {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const totalPages = useMemo(
    () => Math.ceil(totalItems / pagination.pageSize) || 1,
    [totalItems, pagination.pageSize],
  );

  function onPageChange(pageIndex: number) {
    setPagination((prev) => ({ ...prev, pageIndex }));
  }

  function onPageSizeChange(pageSize: number) {
    setPagination({ pageIndex: 0, pageSize });
  }

  const offset = pagination.pageIndex * pagination.pageSize;

  return {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    totalPages,
    pagination,
    setPagination,
    onPageChange,
    onPageSizeChange,
    offset,
  };
}
