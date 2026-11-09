import { getOfflineDb } from './db';

const SESSION_USER_KEY = 'session_user';

/**
 * The signed-in person (id, role, branch id/name) mirrored into SQLite beside
 * the offline write queue, so anything rendering from the offline cache can
 * still answer "which branch is this?" without the auth store having been
 * hydrated by a network round-trip. Written on sign-in and on every token
 * refresh, cleared on sign-out / session expiry.
 *
 * It deliberately holds NO token and NO password: the refresh token lives in
 * the Keychain only, the access token in memory only.
 */
export async function saveSessionUser(user: object): Promise<void> {
  const db = getOfflineDb();
  await db.execute(
    `INSERT INTO session_cache (cache_key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [SESSION_USER_KEY, JSON.stringify(user), Date.now()],
  );
}

export async function readSessionUser<TUser>(): Promise<{
  user: TUser;
  updatedAt: number;
} | null> {
  const db = getOfflineDb();
  const result = await db.execute(
    'SELECT value, updated_at FROM session_cache WHERE cache_key = ?',
    [SESSION_USER_KEY],
  );
  const row = result.rows[0] as
    | { value: string; updated_at: number }
    | undefined;
  if (!row) return null;
  return { user: JSON.parse(row.value) as TUser, updatedAt: row.updated_at };
}

export async function clearSessionUser(): Promise<void> {
  const db = getOfflineDb();
  await db.execute('DELETE FROM session_cache WHERE cache_key = ?', [
    SESSION_USER_KEY,
  ]);
}
