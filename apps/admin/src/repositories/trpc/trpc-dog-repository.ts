import type { ApiClient } from '@pawmeet/api-client';
import type { PaginatedResult } from '@pawmeet/types';
import type {
  AdminDogDetail,
  AdminDogListItem,
  AdminDogRepository,
  ListDogsParams,
} from '../interfaces';

export function createTrpcDogRepository(api: ApiClient): AdminDogRepository {
  return {
    async list(params: ListDogsParams): Promise<PaginatedResult<AdminDogListItem>> {
      const result = await api.admin.listDogs.query(params);
      return {
        data: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.page < result.totalPages,
      };
    },
    async getById(id: string): Promise<AdminDogDetail> {
      const result = await api.admin.getDog.query({ id });
      return {
        ...result,
        createdAt: String(result.createdAt),
        photos: result.photos.map(
          (p: { id: string; url: string; position: number; moderationStatus: string }) => ({
            id: p.id,
            url: p.url,
            position: p.position,
            moderationStatus: p.moderationStatus,
          }),
        ),
      };
    },
  };
}
