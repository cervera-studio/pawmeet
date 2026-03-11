import type { PaginatedResult } from '@dogwalk/types';
import type { api as ApiClientInstance } from '@/lib/api';
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUserRepository,
  ListUsersParams,
} from '../interfaces';

type RestClient = typeof ApiClientInstance;

interface RestPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function createRestUserRepository(client: RestClient): AdminUserRepository {
  return {
    async list(params: ListUsersParams): Promise<PaginatedResult<AdminUserListItem>> {
      const queryParams: Record<string, string | number | boolean | undefined> = {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      };
      const result = await client.get<RestPaginatedResponse<AdminUserListItem>>('/admin/users', {
        params: queryParams,
      });
      return {
        data: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.page < result.totalPages,
      };
    },
    async getById(id: string): Promise<AdminUserDetail> {
      return client.get<AdminUserDetail>(`/admin/users/${id}`);
    },
    async suspend(id: string): Promise<void> {
      await client.post(`/admin/users/${id}/suspend`);
    },
    async ban(id: string): Promise<void> {
      await client.post(`/admin/users/${id}/ban`);
    },
    async reactivate(id: string): Promise<void> {
      await client.post(`/admin/users/${id}/reactivate`);
    },
  };
}
