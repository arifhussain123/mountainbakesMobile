import { assertApiReachable } from '@/config/env';
import { initDatabase } from '@/database/localDb';
import { initStorage } from '@/services/storage/secureStorage';
import { queryClient } from '@/services/query/queryClient';
import {
  branchesQuery,
  categoriesQuery,
  productsQuery,
  settingsQuery,
  stockQuery,
} from '@/services/query/catalogQueries';
import { accessProfileFor, isKnownRole, type AccessProfile } from '@/navigation/roleConfig';
import { isBranchRole } from '@/navigation/roleNavigation';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore, waitForNetwork } from '@/store/networkStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSyncStore } from '@/store/syncStore';

/**
 * The app's start sequence.
 *
 * ```text
 *   Launch
 *    ↓ open            SQLite open + migrations  ‖  Keychain key → encrypted MMKV
 *    ↓ settings        theme mode and preferences, out of that storage
 *    ↓ network         subscribe to NetInfo and wait for its first answer
 *    ↓ session         restore the Supabase session
 *    ↓ profile         resolve the access profile from the session's claims
 *    ↓ sync            arm the sync engine and fire the first drain
 *    ↓ cache           warm the catalogue caches from the mirror
 *   Navigate
 * ```
 *
 * ---------------------------------------------------------------------------
 * `open` is one step because the two halves are independent
 * ---------------------------------------------------------------------------
 * The database and encrypted storage need nothing from each other — one is
 * SQLite opening a file and running migrations, the other is the Keychain
 * handing over a key for MMKV — and both are native I/O the JS thread does
 * nothing but wait on. Started together, the wait is the slower of the two
 * rather than their sum.
 *
 * They are **one declared step** rather than two overlapping ones, because a
 * sequence whose declared order is not its real order is a document that lies.
 * Two of the ordering constraints below run through this step, and both are
 * satisfied by it as a whole: everything after `open` has both.
 *
 * `Promise.all`, and never two bare promises awaited in turn. The latter leaves
 * a window where one has rejected and nothing is listening to it yet, which
 * Hermes reports as an unhandled rejection — a red box on a start that was
 * already failing, in front of the retry the user needs to see.
 *
 * ---------------------------------------------------------------------------
 * Why the order is this order
 * ---------------------------------------------------------------------------
 * Four constraints are load-bearing and the rest is convention:
 *
 * - **database before session**, because signing in can trigger a drain
 *   immediately and the drain needs the queue tables to exist.
 * - **storage before settings and before session**, because both live in it —
 *   the theme mode and the Supabase session are read out of encrypted MMKV,
 *   which cannot be opened before the Keychain hands over its key.
 *   (Both of those are why `settings` stays its own step after `open` rather
 *   than being chained onto storage inside it: hydrating settings is a handful
 *   of synchronous MMKV reads, so there is nothing left to overlap it with.)
 * - **network before session**, so the first reads of the run know whether they
 *   are offline. `readThrough` skips the request entirely when NetInfo is sure
 *   there is no connection; if the probe were still in flight, a phone that has
 *   been offline all afternoon would hang on the client timeout for data that
 *   was on the device the whole time.
 * - **profile before cache**, because the branch a stock mirror is keyed by
 *   comes out of the profile.
 *
 * ---------------------------------------------------------------------------
 * The last two steps are started, not awaited
 * ---------------------------------------------------------------------------
 * `sync` and `cache` are the two steps with no bound on how long they can take —
 * a drain is as long as the queue and the connection make it, and a warm may go
 * to the network. Navigation does not wait for either. Both are also the two
 * steps whose failure is not a failed start: a drain that cannot reach the
 * server is exactly the case the queue exists for, and a cache that did not warm
 * costs a skeleton on the first screen, not a working app.
 *
 * So they cannot fail boot, and they are not inside the boot timeout. What they
 * must not do is reject into nothing — an unhandled rejection during startup is
 * a red box over the first screen — hence the explicit catch on each.
 */

export type BootStep =
  /** The database and encrypted storage, opened together. */
  | 'open'
  | 'settings'
  | 'network'
  | 'session'
  | 'profile'
  | 'sync'
  | 'cache';

/** The declared order, in one place, so a test can assert it rather than restate it. */
export const BOOT_STEPS: readonly BootStep[] = [
  'open',
  'settings',
  'network',
  'session',
  'profile',
  'sync',
  'cache',
];

export interface BootResult {
  /** The signed-in user's access profile, or null when signed out. */
  profile: AccessProfile | null;
  /** Tears down what the sequence subscribed to. Safe to call twice. */
  dispose: () => void;
}

/**
 * Every step as an injectable unit.
 *
 * The defaults are the real thing; the seam exists because the *order* is the
 * design here, and order is precisely what a test cannot observe through eight
 * separately-mocked native modules. With this, one test asserts the sequence
 * directly — and it keeps holding when a step's implementation changes.
 */
export interface BootDeps {
  assertConfig: () => void;
  openDatabase: () => Promise<unknown>;
  openStorage: () => Promise<unknown>;
  loadSettings: () => void | Promise<void>;
  checkNetwork: () => Promise<() => void>;
  restoreSession: () => Promise<void>;
  loadProfile: () => AccessProfile | null;
  startSync: (profile: AccessProfile | null) => void;
  loadCachedData: (profile: AccessProfile | null) => void;
}

export const defaultBootDeps: BootDeps = {
  assertConfig: assertApiReachable,
  openDatabase: initDatabase,
  openStorage: initStorage,
  loadSettings: () => useSettingsStore.getState().hydrate(),
  checkNetwork: async () => {
    // Subscribe first, then wait: the listener is what catches the answer, and
    // registering it after the wait would race the event it is waiting for.
    const unsubscribe = useNetworkStore.getState().start();
    await waitForNetwork();
    return unsubscribe;
  },
  restoreSession: () => useAuthStore.getState().bootstrap(),
  loadProfile: resolveProfile,
  startSync: armSyncEngine,
  loadCachedData: warmCaches,
};

/**
 * Resolve the access profile from the restored session's claims.
 *
 * There is no profile endpoint and there must not be one: role and branch ride
 * in the JWT's `app_metadata`, so the profile is derived from the session rather
 * than fetched alongside it. A second source would be a second answer to
 * "what may this user reach", and the two would disagree on the day a role
 * changed mid-session.
 *
 * An unknown role resolves to the minimal shell rather than failing the start —
 * the same fail-open-narrow decision `AppNavigator` documents. A build that
 * predates a `user_role` the server is issuing should be usable, not bricked.
 */
export function resolveProfile(): AccessProfile | null {
  const claims = useAuthStore.getState().claims;
  if (!claims) return null;

  if (!isKnownRole(claims.role)) {
    console.warn(
      `[boot] Unknown role "${claims.role}" — falling back to the minimal shell. ` +
        'This build predates a user_role value the server is issuing.',
    );
  }

  // `allowSuperAdminWrite` mirrors a server-side finance setting this client
  // cannot read, so finance stays view-only for a Super Admin either way.
  return accessProfileFor(claims.role, claims.branchId, false);
}

/**
 * Arm the sync engine: refresh the pending counts, then start the first drain.
 *
 * Neither is awaited. The counts are a SQLite read that only feeds a badge, and
 * the drain is unbounded — the whole point of the queue is that it survives a
 * connection that never comes back, which is not something to hold a splash on.
 *
 * `useSyncEngine` keeps the ongoing triggers (reconnect, foreground, and the
 * mount that follows a sign-in). Its mount drain does not double this one:
 * `syncStore.sync()` flips `phase` to `syncing` synchronously, so by the time the
 * authenticated tree mounts the guard there has already closed.
 */
export function armSyncEngine(profile: AccessProfile | null): void {
  const sync = useSyncStore.getState();

  sync.refreshCounts().catch(() => {});
  // Signed out there is nothing to send, and every request would 401.
  if (!profile) return;
  sync.sync().catch(() => {});
}

/**
 * Warm the caches the first screen will ask for.
 *
 * `prefetchQuery` and not a bare fetch, so this fills the exact cache entries
 * the screens read — same key, same fetcher (`services/query/catalogQueries.ts`).
 * Online it resolves from the network and the first screen paints with data;
 * offline `readThrough` serves the SQLite mirror and it paints anyway. Either
 * way the screen's own query finds the entry already populated and does not
 * refetch, so this is one round of requests moved earlier, not an extra one.
 *
 * Failures are swallowed per query. A catalogue that would not warm is a
 * skeleton on one screen; it is not a reason to refuse to start, and it is not
 * even a reason to skip the other three.
 */
export function warmCaches(profile: AccessProfile | null): void {
  if (!profile) return;

  // Thunks rather than an array of options: each query has its own key tuple and
  // result type, and a mixed array of them widens to a union `prefetchQuery`
  // cannot accept. Deferring the call keeps each one checked against its own type.
  const warm: Array<() => Promise<void>> = [
    () => queryClient.prefetchQuery(categoriesQuery()),
    () => queryClient.prefetchQuery(productsQuery()),
    () => queryClient.prefetchQuery(settingsQuery()),
  ];

  // A branch role has no branch filter to draw and the server scopes it anyway,
  // so the branch list is a request whose answer it would discard.
  if (!isBranchRole(profile.role)) {
    warm.push(() => queryClient.prefetchQuery(branchesQuery()));
  }

  const branchId = profile.branchId;
  if (branchId) {
    warm.push(() =>
      queryClient.prefetchQuery(
        stockQuery({
          // Mirrors `useStock`: a branch role must not send a branchId.
          requestBranchId: isBranchRole(profile.role) ? null : branchId,
          mirrorScope: branchId,
        }),
      ),
    );
  }

  for (const run of warm) {
    run().catch(() => {});
  }
}

/** Run a tail step whose failure must not fail the start. */
function tolerate(step: BootStep, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.warn(`[boot] ${step} could not be started`, error);
  }
}

/**
 * Run the sequence.
 *
 * `isCancelled` is checked before each step and before the two fire-and-forget
 * tails: a start abandoned by an unmount — or by the retry button, which starts
 * a fresh run — must not go on to drain a queue or write state belonging to a
 * sequence nobody is watching.
 */
export async function runBootSequence({
  onStep,
  isCancelled = () => false,
  deps = defaultBootDeps,
}: {
  onStep?: (step: BootStep) => void;
  isCancelled?: () => boolean;
  deps?: Partial<BootDeps>;
} = {}): Promise<BootResult> {
  const d = { ...defaultBootDeps, ...deps };

  let unsubscribeNetwork: (() => void) | undefined;
  const dispose = () => {
    unsubscribeNetwork?.();
    unsubscribeNetwork = undefined;
  };

  // Not a step: a missing API URL is a build mistake, not a runtime one, and it
  // is worth failing on before touching the device at all.
  d.assertConfig();

  const step = (name: BootStep): boolean => {
    if (isCancelled()) return false;
    onStep?.(name);
    return true;
  };

  try {
    if (!step('open')) return { profile: null, dispose };
    // Both promises exist before either is awaited, and `Promise.all` attaches a
    // handler to each of them synchronously — see the note at the top about the
    // rejection window that two bare awaits would leave open.
    await Promise.all([d.openDatabase(), d.openStorage()]);

    if (!step('settings')) return { profile: null, dispose };
    await d.loadSettings();

    if (!step('network')) return { profile: null, dispose };
    unsubscribeNetwork = await d.checkNetwork();

    if (!step('session')) return { profile: null, dispose };
    await d.restoreSession();

    if (!step('profile')) return { profile: null, dispose };
    const profile = d.loadProfile();

    // Neither may fail the start, so a synchronous throw is contained here too —
    // not just the rejections each of them already swallows internally. A cache
    // warm that cannot even be *started* is still not a reason to refuse to run.
    if (step('sync')) tolerate('sync', () => d.startSync(profile));
    if (step('cache')) tolerate('cache', () => d.loadCachedData(profile));

    return { profile, dispose };
  } catch (error) {
    // A half-started sequence must not leave a live NetInfo listener behind;
    // the retry starts another one, and they would accumulate per attempt.
    dispose();
    throw error;
  }
}
