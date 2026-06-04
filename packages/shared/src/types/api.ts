export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiPaginated<T> {
  ok: true;
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ApiError {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiOk<T> | ApiPaginated<T> | ApiError;

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "DB_ERROR"
  | "UPSTREAM_ERROR"
  | "INTERNAL";

export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  DB_ERROR: 500,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
};
