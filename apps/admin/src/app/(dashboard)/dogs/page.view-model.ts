import type { PaginationState } from '@tanstack/react-table';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export function useDogsViewModel() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  // Simple debounce via timeout ref
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    setDebounceTimer(timer);
  }

  const { data, isLoading } = trpc.admin.listDogs.useQuery({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: debouncedSearch || undefined,
  });

  return {
    search,
    handleSearchChange,
    data,
    isLoading,
    pagination,
    setPagination,
  };
}
