import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
}

export function parsePagination(query: unknown): PaginationParams {
  const result = paginationSchema.safeParse(query);
  const page = result.success ? result.data.page : 1;
  const pageSize = result.success ? result.data.pageSize : 20;
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}