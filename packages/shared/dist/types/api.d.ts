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
export type ErrorCode = "VALIDATION" | "UNAUTHENTICATED" | "NO_TENANT" | "FORBIDDEN" | "NOT_FOUND" | "RATE_LIMITED" | "DB_ERROR" | "UPSTREAM_ERROR" | "INTERNAL";
export declare const ERROR_STATUS: Record<ErrorCode, number>;
//# sourceMappingURL=api.d.ts.map