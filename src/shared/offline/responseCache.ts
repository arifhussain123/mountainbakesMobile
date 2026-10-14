import { getOfflineDb } from './db';

/**
 * The "last successful response of each list" cache (productionApp.md Step 4 /
 * financeApp.md Phase 1.4) — one row per query-key string, overwritten on
 * every successful fetch. Screens show a "Showing saved data from HH:MM"
 * banner from `updatedAt` when `useNetworkStatus().isOffline` is true and
 * they render from this instead of a live query result.
 */
export async function getCachedResponse<T>(cacheKey: string): Promise<{ data: T; updatedAt: number } | null> {
  const db = getOfflineDb();
  const result = await db.execute('SELECT response, updated_at FROM response_cache WHERE cache_key = ?', [cacheKey]);
  const row = result.rows[0] as { response: string; updated_at: number } | undefined;
  if (!row) return null;
  return { data: JSON.parse(row.response) as T, updatedAt: row.updated_at };
}

export async function setCachedResponse(cacheKey: string, data: unknown): Promise<void> {
  const db = getOfflineDb();
  await db.execute(
    `INSERT INTO response_cache (cache_key, response, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET response = excluded.response, updated_at = excluded.updated_at`,
    [cacheKey, JSON.stringify(data), Date.now()],
  );
}
