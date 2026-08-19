import { ApiError } from '@/services/api/errors';
import type { MirrorRead } from '@/database/repositories/referenceRepository';
import { isOnlineNow } from '@/store/networkStore';
import { useMirrorStore, type MirrorResource } from '@/store/mirrorStore';

/**
 * Fetch, mirror, and fall back — the read half of offline-first.
 *
 * ```
 *   online   → GET /api/…  → mirror it → return it
 *   failed   → SELECT from the mirror → return that, marked as saved
 *   failed and nothing mirrored → rethrow, so the screen shows its error state
 * ```
 *
 * ---------------------------------------------------------------------------
 * Only a *transport* failure falls back
 * ---------------------------------------------------------------------------
 * A 403 is an answer: the server considered the request and refused it. Serving
 * a cached list over the top of a refusal would show a branch data it is no
 * longer allowed to see, and would hide a role change from the person it
 * happened to. So the fallback is limited to the kinds that mean *the request
 * never got an answer* — network, offline, timeout — plus 5xx, where the server
 * failed rather than decided.
 *
 * ---------------------------------------------------------------------------
 * A known-offline read does not wait to find out
 * ---------------------------------------------------------------------------
 * When NetInfo already says there is no usable connection, the request is fired
 * anyway in the naive version and the screen sits on a skeleton until the
 * client's timeout expires — twenty seconds, on the one device least able to
 * spare them, to learn something the radio already knew. Worse than the wait is
 * what it looks like: a shop that has been offline all afternoon sees every
 * screen hang before showing data that was on the phone the whole time.
 *
 * So the mirror is read **first** when we are known-offline, and the network is
 * not touched. `isOnline` is deliberately optimistic — `null` reachability
 * counts as online (see `networkStore`) — so this only skips the request when
 * NetInfo is *sure*. A captive portal or a dying signal still goes through the
 * request path and the timeout, which is the only way to find out.
 *
 * ---------------------------------------------------------------------------
 * Empty is not the same as absent
 * ---------------------------------------------------------------------------
 * A mirror that has never been written returns no rows, and that is rethrown
 * rather than served as an empty list. "No products" and "we could not reach
 * the server and have nothing saved" are different facts, and a screen that
 * renders the first when the second is true tells a cashier the catalogue is
 * empty.
 */

export interface ReadThroughOptions<T> {
  /** Which mirror this is, for the "showing data saved at…" mark. */
  resource: MirrorResource;
  /** The live call. */
  fetch: () => Promise<T[]>;
  /** Write the fetched collection to SQLite. Omit for a filtered fetch. */
  save?: (rows: T[]) => Promise<void>;
  /** Read the mirror. */
  read: () => Promise<MirrorRead<T>>;
}

export async function readThrough<T>({
  resource,
  fetch,
  save,
  read,
}: ReadThroughOptions<T>): Promise<T[]> {
  if (!isOnlineNow()) {
    const mirrored = await read().catch(() => null);
    if (mirrored && mirrored.rows.length > 0) {
      useMirrorStore.getState().setSavedAt(resource, mirrored.savedAt);
      return mirrored.rows;
    }
    // Nothing mirrored and no connection. Thrown rather than returned empty,
    // for the same reason as below: "no products" and "we are offline with
    // nothing saved" are different facts and only one is about the catalogue.
    // `offline` is the kind the sync queue and the error copy already expect.
    throw new ApiError({
      kind: 'offline',
      message: "You're offline and nothing is saved on this device yet.",
    });
  }

  try {
    const fresh = await fetch();
    // Mirroring must never break a working read: a full disk or a locked
    // database is a reason to lose the fallback, not to fail the screen.
    if (save) await save(fresh).catch(() => {});
    useMirrorStore.getState().clearSavedAt(resource);
    return fresh;
  } catch (error) {
    if (!isTransportFailure(error)) throw error;

    const mirrored = await read().catch(() => null);
    if (!mirrored || mirrored.rows.length === 0) throw error;

    useMirrorStore.getState().setSavedAt(resource, mirrored.savedAt);
    return mirrored.rows;
  }
}

/** The request never got an answer — as opposed to getting one it did not like. */
function isTransportFailure(error: unknown): boolean {
  return error instanceof ApiError && error.isRetryable;
}
