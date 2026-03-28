export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  hasMore: boolean;
}

export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const pages = Math.ceil(total / limit);
  return {
    data,
    total,
    page,
    pages,
    limit,
    hasMore: page < pages,
  };
}

export function getPaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));
  return { page, limit };
}
