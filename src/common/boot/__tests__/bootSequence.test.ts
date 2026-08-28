import {
  BOOT_STEPS,
  runBootSequence,
  type BootDeps,
  type BootStep,
} from '@/common/boot/bootSequence';
import type { AccessProfile } from '@/navigation/roleConfig';

/**
 * The start sequence.
 *
 * These tests are about ORDER and about what a failure does — the two things the
 * sequence exists to decide. What each step does is tested where that step lives.
 */

const PROFILE: AccessProfile = {
  role: 'branch_manager',
  group: 'branch',
  branchId: 'branch-1',
  capabilities: new Set(['branch', 'reports']),
};

/** Records the order steps actually ran in, independently of `onStep`. */
function trackingDeps(overrides: Partial<BootDeps> = {}) {
  const ran: string[] = [];
  const mark =
    <T,>(name: string, value: T) =>
    () => {
      ran.push(name);
      return value;
    };

  const deps: BootDeps = {
    assertConfig: mark('config', undefined),
    openDatabase: mark('database', Promise.resolve(undefined)),
    openStorage: mark('storage', Promise.resolve(undefined)),
    loadSettings: mark('settings', undefined),
    checkNetwork: mark('network', Promise.resolve(() => {})),
    restoreSession: mark('session', Promise.resolve()),
    loadProfile: mark('profile', PROFILE),
    startSync: mark('sync', undefined),
    loadCachedData: mark('cache', undefined),
    ...overrides,
  };

  return { ran, deps };
}

/** Every unit of work, in the order the sequence actually invokes them. */
const IN_ORDER = [
  'config',
  'database',
  'storage',
  'settings',
  'network',
  'session',
  'profile',
  'sync',
  'cache',
];

describe('the order', () => {
  it('runs the steps in the declared sequence', async () => {
    const { ran, deps } = trackingDeps();

    await runBootSequence({ deps });

    expect(ran).toEqual(IN_ORDER);
  });

  it('reports each step as it starts', async () => {
    const seen: BootStep[] = [];
    const { deps } = trackingDeps();

    await runBootSequence({ deps, onStep: step => seen.push(step) });

    expect(seen).toEqual([...BOOT_STEPS]);
  });

  /**
   * The four constraints that are load-bearing rather than conventional. Stated
   * as relationships, not as indices, so reordering the conventional steps does
   * not rewrite this test — and breaking a real one does fail it.
   */
  it('holds the constraints the order exists for', async () => {
    const { ran, deps } = trackingDeps();
    await runBootSequence({ deps });
    const at = (step: string) => ran.indexOf(step);

    // A sign-in can trigger a drain immediately; the queue tables must exist.
    expect(at('database')).toBeLessThan(at('session'));
    // Settings and the session are both read out of encrypted storage.
    expect(at('storage')).toBeLessThan(at('settings'));
    expect(at('storage')).toBeLessThan(at('session'));
    // Both halves of `open` are done before anything after it runs — which is
    // what lets the two constraints above be carried by one declared step.
    expect(Math.max(at('database'), at('storage'))).toBeLessThan(at('settings'));
    // So the first reads of the run know whether they are offline.
    expect(at('network')).toBeLessThan(at('session'));
    // The stock mirror is keyed by the branch the profile carries.
    expect(at('profile')).toBeLessThan(at('cache'));
  });
});

/**
 * The database and encrypted storage need nothing from each other, and both are
 * native I/O the JS thread only waits on. Started together the wait is the
 * slower of the two rather than their sum — this is what asserts they really are
 * started together, rather than merely declared as one step.
 */
describe('the open step', () => {
  it('starts storage without waiting for the database', async () => {
    let releaseDatabase!: () => void;
    let storageStarted = false;

    const { deps } = trackingDeps({
      openDatabase: () =>
        new Promise<void>(resolve => {
          releaseDatabase = resolve;
        }),
      openStorage: () => {
        storageStarted = true;
        return Promise.resolve(undefined);
      },
    });

    const running = runBootSequence({ deps });
    await Promise.resolve();

    expect(storageStarted).toBe(true);

    releaseDatabase();
    await running;
  });

  it('waits for both halves before moving on', async () => {
    let releaseStorage!: () => void;
    const { ran, deps } = trackingDeps({
      openStorage: () =>
        new Promise<void>(resolve => {
          releaseStorage = () => resolve();
        }),
    });

    const running = runBootSequence({ deps });
    await Promise.resolve();

    expect(ran).not.toContain('settings');

    releaseStorage();
    await running;
    expect(ran).toContain('settings');
  });

  it('reports one step, not two', async () => {
    const seen: BootStep[] = [];
    const { deps } = trackingDeps();

    await runBootSequence({ deps, onStep: step => seen.push(step) });

    expect(seen[0]).toBe('open');
    expect(seen).toHaveLength(BOOT_STEPS.length);
  });
});

describe('failure', () => {
  it('stops at the failing step and runs none after it', async () => {
    const { ran, deps } = trackingDeps({
      openStorage: () => {
        ran.push('storage');
        return Promise.reject(new Error('Keychain unavailable'));
      },
    });

    await expect(runBootSequence({ deps })).rejects.toThrow('Keychain unavailable');
    expect(ran).toEqual(['config', 'database', 'storage']);
  });

  /**
   * The window `Promise.all` exists to close: the database is still in flight
   * when storage rejects. Two bare awaits would leave that rejection unobserved
   * for a tick, which Hermes reports as an unhandled rejection — a red box on
   * top of the retry.
   */
  it('reports a rejection from either half of open, whichever is still pending', async () => {
    const slowDatabase = new Promise<void>(resolve => {
      setTimeout(() => resolve(), 5);
    });
    const { deps } = trackingDeps({
      openDatabase: () => slowDatabase,
      openStorage: () => Promise.reject(new Error('Keychain unavailable')),
    });

    await expect(runBootSequence({ deps })).rejects.toThrow('Keychain unavailable');
    await expect(slowDatabase).resolves.toBeUndefined();
  });

  /**
   * A retry starts a second sequence, and each one subscribes to NetInfo. A
   * listener left behind by the failed attempt would accumulate per press.
   */
  it('unsubscribes the network listener when a later step throws', async () => {
    const unsubscribe = jest.fn();
    const { deps } = trackingDeps({
      checkNetwork: () => Promise.resolve(unsubscribe),
      restoreSession: () => Promise.reject(new Error('session gone')),
    });

    await expect(runBootSequence({ deps })).rejects.toThrow('session gone');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  /** A missing API URL is a build mistake — worth failing before touching the device. */
  it('checks config before opening anything', async () => {
    const { ran, deps } = trackingDeps({
      assertConfig: () => {
        throw new Error('API_URL is not set');
      },
    });

    await expect(runBootSequence({ deps })).rejects.toThrow('API_URL is not set');
    expect(ran).toEqual([]);
  });
});

describe('cancellation', () => {
  /**
   * The retry button and an unmount both abandon a run in flight. The sequence
   * cannot be cancelled mid-step — none of the native calls is cancellable — but
   * it must not go on to start a drain for a sequence nobody is watching.
   */
  it('stops before the next step once cancelled', async () => {
    let cancelled = false;
    const { ran, deps } = trackingDeps({
      openStorage: () => {
        ran.push('storage');
        cancelled = true;
        return Promise.resolve(undefined);
      },
    });

    const result = await runBootSequence({ deps, isCancelled: () => cancelled });

    expect(ran).toEqual(['config', 'database', 'storage']);
    expect(result.profile).toBeNull();
  });

  it('does not start sync or the cache warm for an abandoned run', async () => {
    let cancelled = false;
    const startSync = jest.fn();
    const loadCachedData = jest.fn();
    const { deps } = trackingDeps({
      restoreSession: () => {
        cancelled = true;
        return Promise.resolve();
      },
      startSync,
      loadCachedData,
    });

    await runBootSequence({ deps, isCancelled: () => cancelled });

    expect(startSync).not.toHaveBeenCalled();
    expect(loadCachedData).not.toHaveBeenCalled();
  });
});

describe('the tail', () => {
  /**
   * Sync and the cache warm are started, not awaited — a drain is as long as the
   * queue and the connection make it. Neither may fail the start.
   */
  it('still starts even when both of them throw', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { deps } = trackingDeps({
      startSync: () => {
        throw new Error('drain exploded');
      },
      loadCachedData: () => {
        throw new Error('warm exploded');
      },
    });

    await expect(runBootSequence({ deps })).resolves.toMatchObject({ profile: PROFILE });
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  /**
   * The tail must not hold navigation. A drain that never settles is the normal
   * case on a dead connection, and the queue exists precisely so that is fine.
   */
  it('resolves while the sync step is still in flight', async () => {
    let released!: () => void;
    const inFlight = new Promise<void>(resolve => {
      released = resolve;
    });
    let settled = false;

    const { deps } = trackingDeps({
      startSync: () => {
        inFlight.then(() => {
          settled = true;
        });
      },
    });

    await runBootSequence({ deps });
    expect(settled).toBe(false);

    released();
  });

  it('hands back the resolved profile', async () => {
    const { deps } = trackingDeps();
    const result = await runBootSequence({ deps });
    expect(result.profile).toBe(PROFILE);
  });

  it('disposes the network listener on request', async () => {
    const unsubscribe = jest.fn();
    const { deps } = trackingDeps({ checkNetwork: () => Promise.resolve(unsubscribe) });

    const result = await runBootSequence({ deps });
    expect(unsubscribe).not.toHaveBeenCalled();

    result.dispose();
    result.dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
