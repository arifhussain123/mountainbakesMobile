import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { logger } from '@/shared/utils';
import { GEO_POSITION_HEADER, encodeGeoPosition, type GeoPosition } from './geo';
import type { ApiError } from './types';

// ─── Wiring to auth state, without api/ importing state/ directly ──────────
// (the folder-structure skill's import direction: state → api, never the other
// way — so the access token and the refresh/logout actions are injected here by
// authStore at startup, exactly like the reference app's `setTokenAccessor`.)

let getAccessToken: () => string | null = () => null;
let refreshTokens: () => Promise<boolean> = async () => false;
let onSessionExpired: () => void = () => {};

export function setTokenAccessor(fn: () => string | null): void {
  getAccessToken = fn;
}
export function setRefreshHandler(fn: () => Promise<boolean>): void {
  refreshTokens = fn;
}
export function setSessionExpiredHandler(fn: () => void): void {
  onSessionExpired = fn;
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'status' in value && 'message' in value;
}

const axiosInstance = axios.create({ baseURL: env.apiBaseUrl, timeout: 20_000 });

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ error?: string; code?: string; details?: unknown }>;
    if (!err.response) {
      return { status: null, message: 'No internet connection. Please check your network and try again.' };
    }
    return {
      status: err.response.status,
      message: err.response.data?.error ?? 'Something went wrong. Please try again.',
      code: err.response.data?.code,
      details: err.response.data?.details,
    };
  }
  logger.error('unexpected API client error', error);
  return { status: null, message: 'Something went wrong. Please try again.' };
}

// Endpoints where a 401 means "this request was rejected" (bad credentials, a
// dead/reused refresh token), never "an authenticated session's access token
// expired mid-use" — attempting a silent refresh here would be pointless, and
// forcing a sign-out would wipe a refresh token that was never implicated.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh'];

// A 401 is retried exactly once, after a successful refresh — never in a loop.
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthEndpoint = !!original?.url && AUTH_ENDPOINTS.some((path) => original.url!.includes(path));
    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      const refreshed = await refreshTokens();
      if (refreshed) return axiosInstance.request(original);
      onSessionExpired();
    }
    return Promise.reject(error);
  },
);

export interface MutationOptions {
  /**
   * Resend the SAME key on every retry of one logical operation (a UUID minted
   * once when the user taps Save) — never a new one, or the server's replay
   * protection cannot tell a retry from a second sale.
   */
  idempotencyKey?: string;
  /** Attached as `X-Geo-Position` for geofenced mutations (sale/order/return create). */
  geoPosition?: GeoPosition | null;
}

function mutationHeaders(options?: MutationOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options?.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  if (options?.geoPosition) headers[GEO_POSITION_HEADER] = encodeGeoPosition(options.geoPosition);
  return headers;
}

/** A client-generated key matching the server's `^[A-Za-z0-9._:-]{8,200}$` pattern. */
export function generateIdempotencyKey(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}

export const apiClient = {
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const response = await axiosInstance.get<T>(url, { params });
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  async post<T>(url: string, body?: unknown, options?: MutationOptions): Promise<T> {
    try {
      const response = await axiosInstance.post<T>(url, body, { headers: mutationHeaders(options) });
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  async put<T>(url: string, body?: unknown, options?: MutationOptions): Promise<T> {
    try {
      const response = await axiosInstance.put<T>(url, body, { headers: mutationHeaders(options) });
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  async delete<T>(url: string, options?: MutationOptions): Promise<T> {
    try {
      const response = await axiosInstance.delete<T>(url, { headers: mutationHeaders(options) });
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  async patch<T>(url: string, body?: unknown, options?: MutationOptions): Promise<T> {
    try {
      const response = await axiosInstance.patch<T>(url, body, { headers: mutationHeaders(options) });
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  /** For the rare DELETE that carries a reason in its body (e.g. `DELETE /finance/ledger/:id`) — `delete` above stays body-less for its existing offline-queue callers. */
  async deleteWithBody<T>(url: string, body: unknown, options?: MutationOptions): Promise<T> {
    try {
      const response = await axiosInstance.delete<T>(url, { data: body, headers: mutationHeaders(options) });
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
