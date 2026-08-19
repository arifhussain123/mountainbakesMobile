jest.mock('@/services/supabase/client', () => ({
  getAccessToken: jest.fn(async () => null),
  refreshSession: jest.fn(),
}));

import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosHeaders } from 'axios';
import { apiClient } from '../client';

/**
 * A read and a write are not waiting for the same thing.
 *
 * A write is a sale, an expense or a demand: it is already queued locally, so
 * every extra second is another chance it lands now rather than on the next
 * drain, and patience costs nothing. A read has the SQLite mirror behind it —
 * `readThrough` falls back the moment the request fails — so a long timeout
 * does not buy fresher data, it buys a longer skeleton in front of data the
 * phone is already holding. In a basement shop on a dying signal that is the
 * difference between a screen that feels slow and one that feels broken.
 */

/** Run a config through the request interceptor chain, as axios would. */
async function throughInterceptor(
  partial: Partial<InternalAxiosRequestConfig>,
): Promise<InternalAxiosRequestConfig> {
  const config = {
    headers: new AxiosHeaders(),
    timeout: apiClient.defaults.timeout,
    ...partial,
  } as InternalAxiosRequestConfig;

  // Index 0 is the auth/timeout interceptor registered in client.ts.
  const handler = (apiClient.interceptors.request as unknown as {
    handlers: Array<{ fulfilled: (c: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig> }>;
  }).handlers[0]!;

  return handler.fulfilled(config);
}

describe('request deadlines', () => {
  it('gives a write the long budget', async () => {
    // A real path: the POS write goes to /api/orders/pos. There is no /api/sales.
    const config = await throughInterceptor({ method: 'post', url: '/api/orders/pos' });
    expect(config.timeout).toBe(20_000);
  });

  it('gives a read the short one, so the mirror is reached sooner', async () => {
    const config = await throughInterceptor({ method: 'get', url: '/api/products' });
    expect(config.timeout).toBe(8_000);
  });

  it('treats an unspecified method as a read — axios defaults to GET', async () => {
    const config = await throughInterceptor({ url: '/api/products' });
    expect(config.timeout).toBe(8_000);
  });

  it('does not touch a budget the call site asked for', async () => {
    // A report export or any future long poll keeps its own, whichever way it
    // differs from the default.
    const config = await throughInterceptor({ method: 'get', url: '/api/reports/export', timeout: 60_000 });
    expect(config.timeout).toBe(60_000);
  });

  it('leaves PUT and DELETE on the write budget', async () => {
    for (const method of ['put', 'patch', 'delete'] as const) {
      const config = await throughInterceptor({ method, url: '/api/products/p1' });
      expect(config.timeout).toBe(20_000);
    }
  });
});
