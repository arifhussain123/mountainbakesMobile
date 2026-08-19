import { readThrough } from '@/services/query/readThrough';
import { ApiError } from '@/services/api/errors';
import { useMirrorStore } from '@/store/mirrorStore';
import { useNetworkStore } from '@/store/networkStore';

/**
 * The read half of offline-first.
 *
 * The failure this exists to prevent: the write path is genuinely offline —
 * SQLite row plus queue row in one transaction, idempotency key, backoff — but
 * a cold start with no signal used to leave every catalogue read in an error
 * state, so a cashier could not build a cart and therefore could not reach any
 * of it.
 */

const OFFLINE = new ApiError({ kind: 'offline', message: 'No connection' });
const FORBIDDEN = new ApiError({ kind: 'authorization', message: 'Forbidden', status: 403 });

beforeEach(() => {
  useMirrorStore.setState({
    savedAt: { products: null, categories: null, branches: null, stock: null },
  });
  // Online unless a test says otherwise — the store's own default, and the
  // condition every case below except the offline block assumes.
  useNetworkStore.setState({ isOnline: true });
});

/** NetInfo is sure there is no usable connection. */
function goOffline() {
  useNetworkStore.setState({ isOnline: false });
}

describe('readThrough', () => {
  it('serves the server and mirrors what it got', async () => {
    const save = jest.fn(async () => {});
    const rows = await readThrough({
      resource: 'products',
      fetch: async () => [{ id: 'p1' }],
      save,
      read: async () => ({ rows: [], savedAt: null }),
    });

    expect(rows).toEqual([{ id: 'p1' }]);
    expect(save).toHaveBeenCalledWith([{ id: 'p1' }]);
    expect(useMirrorStore.getState().savedAt.products).toBeNull();
  });

  it('serves the mirror when the request never reached the server', async () => {
    const rows = await readThrough({
      resource: 'products',
      fetch: async () => {
        throw OFFLINE;
      },
      read: async () => ({ rows: [{ id: 'saved' }], savedAt: 1_755_600_000_000 }),
    });

    expect(rows).toEqual([{ id: 'saved' }]);
    // …and says how old it is, so the header cannot show "now" over stale data.
    expect(useMirrorStore.getState().savedAt.products).toBe(1_755_600_000_000);
  });

  it('does NOT serve the mirror over a refusal', async () => {
    // A 403 is an answer. Painting a cached list over it would show a branch
    // data it is no longer allowed to see, and hide a role change from them.
    await expect(
      readThrough({
        resource: 'products',
        fetch: async () => {
          throw FORBIDDEN;
        },
        read: async () => ({ rows: [{ id: 'saved' }], savedAt: 1 }),
      }),
    ).rejects.toBe(FORBIDDEN);
  });

  it('rethrows when nothing has ever been mirrored', async () => {
    // "No products" and "we could not reach the server and have nothing saved"
    // are different facts. Serving an empty list tells a cashier the catalogue
    // is empty.
    await expect(
      readThrough({
        resource: 'products',
        fetch: async () => {
          throw OFFLINE;
        },
        read: async () => ({ rows: [], savedAt: null }),
      }),
    ).rejects.toBe(OFFLINE);
  });

  it('never fails a working read because mirroring failed', async () => {
    const rows = await readThrough({
      resource: 'categories',
      fetch: async () => [{ id: 'c1' }],
      save: async () => {
        throw new Error('disk full');
      },
      read: async () => ({ rows: [], savedAt: null }),
    });

    expect(rows).toEqual([{ id: 'c1' }]);
  });

  it('clears the saved mark once a live fetch succeeds again', async () => {
    useMirrorStore.getState().setSavedAt('branches', 123);

    await readThrough({
      resource: 'branches',
      fetch: async () => [{ id: 'b1' }],
      read: async () => ({ rows: [], savedAt: null }),
    });

    expect(useMirrorStore.getState().savedAt.branches).toBeNull();
  });
});

/**
 * What a shop that has been offline all afternoon actually experiences.
 *
 * The request cannot succeed, and firing it anyway means every screen sits on a
 * skeleton until the client's timeout expires — to learn something the radio
 * already knew, in front of data that is on the phone the whole time.
 */
describe('readThrough when the device is known to be offline', () => {
  it('reads the mirror without touching the network', async () => {
    goOffline();
    const fetch = jest.fn(async () => [{ id: 'live' }]);

    const rows = await readThrough({
      resource: 'products',
      fetch,
      read: async () => ({ rows: [{ id: 'saved' }], savedAt: 1_755_600_000_000 }),
    });

    expect(rows).toEqual([{ id: 'saved' }]);
    // The whole point: no request, so no timeout to sit through.
    expect(fetch).not.toHaveBeenCalled();
    expect(useMirrorStore.getState().savedAt.products).toBe(1_755_600_000_000);
  });

  it('does not write the mirror back over itself', async () => {
    goOffline();
    const save = jest.fn(async () => {});

    await readThrough({
      resource: 'products',
      fetch: async () => [],
      save,
      read: async () => ({ rows: [{ id: 'saved' }], savedAt: 1 }),
    });

    expect(save).not.toHaveBeenCalled();
  });

  /**
   * "No products" and "we are offline with nothing saved" are different facts,
   * and a screen that renders the first when the second is true tells a cashier
   * the catalogue is empty.
   */
  it('throws an offline error rather than an empty list when nothing is mirrored', async () => {
    goOffline();

    await expect(
      readThrough({
        resource: 'products',
        fetch: async () => [{ id: 'live' }],
        read: async () => ({ rows: [], savedAt: null }),
      }),
    ).rejects.toMatchObject({ kind: 'offline' });
  });

  it('throws offline rather than the database error when the mirror itself fails', async () => {
    goOffline();

    await expect(
      readThrough({
        resource: 'products',
        fetch: async () => [{ id: 'live' }],
        read: async () => {
          throw new Error('database is locked');
        },
      }),
    ).rejects.toMatchObject({ kind: 'offline' });
  });

  /**
   * `isOnline` is deliberately optimistic — `null` reachability counts as
   * online — so a captive portal or a dying signal still goes through the
   * request path. That is the only way to find out, and skipping it would
   * strand a device that could actually reach the server.
   */
  it('still asks the server when NetInfo is merely unsure', async () => {
    useNetworkStore.setState({ isOnline: true, isInternetReachable: null });
    const fetch = jest.fn(async () => [{ id: 'live' }]);

    const rows = await readThrough({
      resource: 'products',
      fetch,
      read: async () => ({ rows: [{ id: 'saved' }], savedAt: 1 }),
    });

    expect(fetch).toHaveBeenCalled();
    expect(rows).toEqual([{ id: 'live' }]);
  });
});
