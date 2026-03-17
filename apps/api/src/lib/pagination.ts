interface PaginationInput {
  page: number;
  pageSize: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
}

/** Build a standard paginated response from a data+total result and the page/pageSize input. */
export function paginate<T>(result: PaginatedResult<T>, input: PaginationInput) {
  return {
    data: result.data,
    total: result.total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.ceil(result.total / input.pageSize),
  };
}
