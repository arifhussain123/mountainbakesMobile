import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';

import { useSyncEngine } from '@/common/hooks/useSyncEngine';
import { useAuthStore } from '@/state/authStore';
import { useNetworkStore } from '@/state/networkStore';
import { useSyncStore } from '@/state/syncStore';

/**
 * What connects signing in to a queue draining.
 *
 * `syncManager` knows how to drain and `authStore` knows who is signed in;
 * neither knows WHEN. This hook is the whole answer, and it had no test — so
 * "an earlier session's work resumes on sign-in", which is the promise made to a
 * branch that closed the app with unsynced takings, rested on nothing.
 *
 * The three moments are deliberate, and so is the absence of a fourth: there is
 * no polling timer, because a drain that finds nothing costs a database
 * round-trip and, on a locked-down shop network, a failed request that burns
 * retry budget for no reason.
 */

const sync = jest.fn(async () => {});
const refreshCounts = jest.fn(async () => {});

/**
 * The AppState listeners registered by the hook under test.
 *
 * Spied file-wide rather than per test: React Native's Jest preset returns
 * `undefined` from `addEventListener`, so the hook's cleanup would throw on
 * unmount in every test, including the ones that never fire an event.
 */
let appStateHandlers: Array<(state: string) => void> = [];
const removeListener = jest.fn();

beforeEach(() => {
  appStateHandlers = [];
  removeListener.mockClear();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation(((_event: string, handler: (state: string) => void) => {
      appStateHandlers.push(handler);
      return { remove: removeListener };
    }) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Mount the hook and let its on-mount work settle.
 *
 * The mount effect kicks off `refreshCounts()` and, when the session allows it,
 * `sync()`. Both are async and both write to the sync store when they resolve,
 * which is a tick or more after `renderHook` returns — so a test that asserts
 * synchronously ends first and the resolution updates a hook container that no
 * longer belongs to a running test. Flushing inside `act` here keeps that work
 * attached to the test that caused it.
 */
async function renderEngine() {
  const result = await renderHook(() => useSyncEngine());
  await act(async () => {});
  return result;
}

/**
 * Flip the connection the way NetInfo would, mid-session.
 *
 * `act` for the same reason as the app-state helper: the hook subscribes to the
 * network store, so writing to it while mounted re-renders the hook container.
 * Bare, that update belongs to no act scope and React reports it against a
 * later test.
 */
async function connectionChangesTo(online: boolean) {
  await act(async () => {
    useNetworkStore.setState({ isOnline: online });
  });
}

/**
 * Fire an OS app-state transition at the hook.
 *
 * Wrapped in `act` because a foreground event is a real state transition: the
 * handler drains, which writes to the sync store and re-renders. Calling the
 * handler bare leaves that update outside any act scope, and React reports it
 * against whichever test happens to be running when it lands.
 */
async function appStateChangesTo(state: string) {
  await act(async () => {
    appStateHandlers.forEach(handler => handler(state));
  });
}

function signedIn(online = true) {
  useAuthStore.setState({ status: 'signedIn' });
  useNetworkStore.setState({ isOnline: online });
}

function signedOut(online = true) {
  useAuthStore.setState({ status: 'signedOut' });
  useNetworkStore.setState({ isOnline: online });
}

beforeEach(() => {
  jest.clearAllMocks();
  useSyncStore.setState({ sync, refreshCounts });
  useNetworkStore.setState({ isOnline: true });
  useAuthStore.setState({ status: 'signedOut' });
});

describe('sign-in', () => {
  /**
   * The case this exists for: a shift's work was queued, the app was closed, and
   * somebody signs in again the next morning. Nothing else would move it.
   */
  it('drains as soon as an online session is established', async () => {
    signedIn(true);
    await renderEngine();
    expect(sync).toHaveBeenCalled();
  });

  it('does not drain while signed out', async () => {
    signedOut(true);
    await renderEngine();
    expect(sync).not.toHaveBeenCalled();
  });

  /**
   * Draining with no connection is a guaranteed failure that consumes attempts.
   * The queue's retry budget is finite and ends with a transaction parked for a
   * person, so spending it on a known-dead request is worse than waiting.
   */
  it('does not drain while offline, even signed in', async () => {
    signedIn(false);
    await renderEngine();
    expect(sync).not.toHaveBeenCalled();
  });
});

describe('reconnect', () => {
  it('drains when the connection returns mid-session', async () => {
    signedIn(false);
    const { rerender } = await renderEngine();
    expect(sync).not.toHaveBeenCalled();

    await connectionChangesTo(true);
    await rerender({});

    expect(sync).toHaveBeenCalled();
  });

  it('does not drain when the connection drops', async () => {
    signedIn(true);
    const { rerender } = await renderEngine();
    sync.mockClear();

    await connectionChangesTo(false);
    await rerender({});

    expect(sync).not.toHaveBeenCalled();
  });
});

describe('foreground', () => {
  /**
   * A queue can go stale while backgrounded — the OS may have killed the radio,
   * or a drain may have been interrupted. Returning to the app is a moment work
   * can move again.
   */
  it('drains on returning to the foreground while signed in', async () => {
    signedIn(true);
    await renderEngine();
    sync.mockClear();

    await appStateChangesTo('active');
    expect(sync).toHaveBeenCalled();
  });

  it('ignores a foreground event while signed out', async () => {
    signedOut(true);
    await renderEngine();

    await appStateChangesTo('active');
    expect(sync).not.toHaveBeenCalled();
  });

  it('ignores background and inactive transitions', async () => {
    signedIn(true);
    await renderEngine();
    sync.mockClear();

    await appStateChangesTo('background');
    await appStateChangesTo('inactive');
    expect(sync).not.toHaveBeenCalled();
  });

  /** A listener left attached would drain against an unmounted tree. */
  it('removes its listener on unmount', async () => {
    signedIn(true);
    const { unmount } = await renderEngine();
    // The teardown is a passive effect; it has to be flushed to be observed.
    await act(async () => {
      unmount();
    });
    expect(removeListener).toHaveBeenCalled();
  });
});

describe('the badge', () => {
  /**
   * Counts are refreshed on mount, before anything syncs. A badge that only
   * appeared after a successful drain would show nothing at all to the person
   * who most needs it — someone offline with work waiting.
   */
  it('refreshes counts on mount, even signed out and offline', async () => {
    signedOut(false);
    await renderEngine();
    expect(refreshCounts).toHaveBeenCalled();
  });
});

describe('no polling', () => {
  it('schedules no timer of its own', async () => {
    jest.useFakeTimers();
    try {
      signedIn(true);
      await renderEngine();
      sync.mockClear();

      // Half an hour of wall clock with nothing else changing.
      jest.advanceTimersByTime(30 * 60 * 1000);
      expect(sync).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
