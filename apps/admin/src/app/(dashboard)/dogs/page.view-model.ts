import type { PaginatedResult } from '@dogwalk/types';
import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import { type AdminDogListItem, dogRepository } from '@/repositories';

export function useDogsViewModel() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [data, setData] = useState<PaginatedResult<AdminDogListItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const fetchDogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await dogRepository.list({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
      });
      setData(result);
    } catch (error) {
      console.error('[Dogs] Failed to fetch dogs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch]);

  useEffect(() => {
    void fetchDogs();
  }, [fetchDogs]);

  return {
    search,
    handleSearchChange,
    data,
    isLoading,
    pagination,
    setPagination,
  };
}
