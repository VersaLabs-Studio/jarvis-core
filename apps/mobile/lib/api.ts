import type { ApiResponse, ListOpts } from '@jarvis/shared';
import { supabase } from './supabase';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// API Client Error
// ---------------------------------------------------------------------------

export class ApiClientError extends Error {
  code: string;
  details?: unknown;

  constructor(error: { code: string; message: string; details?: unknown }) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.details = error.details;
  }
}

// ---------------------------------------------------------------------------
// API URL resolution
// ---------------------------------------------------------------------------

export function getApiUrl(): string {
  return (
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_API_URL ??
    'http://localhost:4000'
  );
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init?.headers,
    },
  });

  const body = (await res.json()) as ApiResponse<T>;

  if (!('ok' in body) || body.ok === false) {
    throw new ApiClientError(
      body.ok === false
        ? body.error
        : { code: 'INTERNAL', message: res.statusText },
    );
  }

  return body as unknown as T;
}

// ---------------------------------------------------------------------------
// Public API — mirrors web surface exactly
// ---------------------------------------------------------------------------

export const api = {
  list: <T>(entity: string, opts?: ListOpts) => {
    const params = opts
      ? `?${new URLSearchParams(opts as Record<string, string>)}`
      : '';
    return request<{ data: T[]; total: number; hasMore: boolean }>(
      `/api/cms/${entity}${params}`,
    );
  },

  get: <T>(entity: string, id: string) =>
    request<{ data: T }>(`/api/cms/${entity}/${id}`),

  create: <T>(entity: string, body: unknown) =>
    request<{ data: T }>(`/api/cms/${entity}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: <T>(entity: string, id: string, body: unknown) =>
    request<{ data: T }>(`/api/cms/${entity}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (entity: string, id: string) =>
    request<void>(`/api/cms/${entity}/${id}`, { method: 'DELETE' }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  getRaw: <T>(path: string) => request<T>(path),
};
