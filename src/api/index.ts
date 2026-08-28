/**
 * Network layer.
 *
 * Bodies are resource-keyed (`{user}`, `{orders, total}`) — there is no
 * `{success, data}` envelope, so each caller unwraps its own shape. Errors are
 * normalised to `ApiError` by `errors.ts`, and that error's `kind` is what the
 * sync queue branches on: changing the mapping changes retry behaviour for real
 * money.
 */

export { api, apiClient, IDEMPOTENCY_HEADER } from './client';
export type { RequestOptions } from './client';

export { ApiError, normalizeError } from './errors';
export type { ApiErrorKind, FieldError } from './errors';

export { queryClient, clearCachedServerState, STALE_TIME_MS, LIVE_STALE_TIME_MS } from './queryClient';
export { qk } from './queryKeys';

export { readThrough } from './readThrough';
export type { ReadThroughOptions } from './readThrough';

export {
  categoriesQuery,
  branchesQuery,
  settingsQuery,
  productsQuery,
  stockQuery,
} from './catalogQueries';
