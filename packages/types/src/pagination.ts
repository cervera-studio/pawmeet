/**
 * Generic paginated result for list endpoints.
 * Used by repository interfaces across mobile and admin.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
