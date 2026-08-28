import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/config/env';
import { getAccessToken, supabase } from '@/api/supabase/client';
import { ApiError, normalizeError } from './errors';

/**
 * The Mountain Bakes API client.
 *
 * Contract, all of it verified against the running server rather than assumed:
 *
 * - Base URL is the Express origin; every path is mounted under `/api`.
 * - Auth is `Authorization: Bearer <supabase access token>`, attached per request.
 * - There is NO `{success, data}` envelope. Bodies are resource-keyed
 *   (`{user}`, `{orders, total}`, `{success: true}`), so callers unwrap their own
 *   shape. Nothing is unwrapped here.
 * - Errors are `{error, details?}`; see ./errors.ts.
 * - A 401 triggers exactly one refresh-and-replay, mirroring the web client.
 *
 * `Idempotency-Key` is sent on mutations that supply one, and the server now
 * honours it (server migration 84 + src/middleware/idempotency.ts) on the five
 * offline-capable writes: order create, POS sale, production demand, expense and
 * branch return. A repeat of a request that already succeeded returns the
 * ORIGINAL response rather than acting again; a repeat that is still in flight
 * gets a 503 to retry shortly; a key reused with a different body gets a 422.
 * The key is the row's `client_operation_id`, minted once on device and never
 * regenerated across attempts — see services/sync/syncManager.ts.
 */

/**
 * Two deadlines, because a read and a write are not waiting for the same thing.
 *
 * A **write** gets the long one. It is a sale, an expense or a demand, it is
 * already queued locally, and every extra second is another chance it lands now
 * rather than on the next drain — nothing is lost either way, so patience is
 * free.
 *
 * A **read** gets the short one, because there is usually a better answer
 * already on the device. `readThrough` falls back to the SQLite mirror the
 * moment the request fails, so a long timeout does not buy fresher data — it
 * buys a longer skeleton in front of data the phone is already holding. On a
 * 2G-ish signal in a basement shop that is the difference between a screen that
 * feels slow and one that feels broken.
 *
 * Eight seconds is well past a healthy round trip on a bad connection and well
 * short of a user deciding the app has hung. A read that is merely slow still
 * completes; one that is not going to complete stops pretending sooner.
 */
const REQUEST_TIMEOUT_MS = 20_000;
const READ_TIMEOUT_MS = 8_000;

/** Methods with no side effect, and therefore a mirror to fall back to. */
const READ_METHODS = new Set(['get', 'head']);

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

interface RetryableConfig extends InternalAxiosRequestConfig {
  /** Guards the refresh-and-replay so a persistent 401 cannot loop. */
  _mbRetried?: boolean;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async config => {
  // Only when the call site has not asked for something specific — the report
  // export and any future long poll must keep their own budget.
  if (config.timeout === REQUEST_TIMEOUT_MS && READ_METHODS.has((config.method ?? 'get').toLowerCase())) {
    config.timeout = READ_TIMEOUT_MS;
  }

  const token = await getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  // FormData sets its own multipart boundary; leaving a JSON content-type on it
  // makes the server reject the upload.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const config = error?.config as RetryableConfig | undefined;
    const status = error?.response?.status;

    if (status === 401 && config && !config._mbRetried) {
      config._mbRetried = true;
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && data.session?.access_token) {
        config.headers.set('Authorization', `Bearer ${data.session.access_token}`);
        return apiClient.request(config);
      }
      // Refresh failed. Do NOT sign out here — offline, an unreachable refresh
      // endpoint is indistinguishable from a real sign-out, and signing out would
      // strand any unsynced local work behind a login screen. The auth store
      // decides, using connectivity.
    }

    return Promise.reject(normalizeError(error));
  },
);

export interface RequestOptions extends Omit<AxiosRequestConfig, 'url' | 'method'> {
  /**
   * Client-generated operation id (UUIDv7). Pass for every mutation that can be
   * created offline; it is the same value stored on the sync_queue row, and it
   * must never be regenerated across retries.
   */
  idempotencyKey?: string;
}

function withIdempotency(options: RequestOptions = {}): AxiosRequestConfig {
  const { idempotencyKey, ...rest } = options;
  if (!idempotencyKey) return rest;
  return {
    ...rest,
    headers: { ...(rest.headers ?? {}), [IDEMPOTENCY_HEADER]: idempotencyKey },
  };
}

async function request<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  try {
    const config = withIdempotency(options);
    const response =
      method === 'get' || method === 'delete'
        ? await apiClient.request<T>({ ...config, url: path, method })
        : await apiClient.request<T>({ ...config, url: path, method, data: body });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('get', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('post', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('put', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('patch', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('delete', path, undefined, options),
};

export { ApiError };
