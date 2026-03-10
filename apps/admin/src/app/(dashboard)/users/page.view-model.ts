import { useServerTable } from '@/hooks/use-server-table';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended' | 'banned';
  dogsCount: number;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUsersViewModel() {
  const result = useServerTable<User>({ endpoint: '/admin/users', queryKey: 'admin-users' });
  return {
    data: result.data as User[],
    total: result.total,
    totalPages: result.totalPages,
    isLoading: result.isLoading,
    sorting: result.sorting,
    setSorting: result.setSorting,
    pagination: result.pagination,
    setPagination: result.setPagination,
    globalFilter: result.globalFilter,
    setGlobalFilter: result.setGlobalFilter,
  };
}
