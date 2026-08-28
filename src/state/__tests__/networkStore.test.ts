import {
  deriveIsOnline,
  NETWORK_PROBE_CAP_MS,
  useNetworkStore,
  waitForNetwork,
} from '../networkStore';

describe('deriveIsOnline', () => {
  it('is online when connected and reachable', () => {
    expect(deriveIsOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
  });

  it('is offline with no connection', () => {
    expect(deriveIsOnline({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(deriveIsOnline({ isConnected: null, isInternetReachable: null })).toBe(false);
  });

  it('is offline behind a captive portal', () => {
    // Hotel/café wifi: associated, but nothing reaches the internet. Treating
    // this as online means every sync attempt fails and burns retry budget.
    expect(deriveIsOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('assumes reachable while still probing', () => {
    // null = NetInfo has not finished its probe. Optimism costs one failed
    // request; pessimism would block a write the user could have made.
    expect(deriveIsOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
  });
});

/**
 * Boot waits for NetInfo's first answer before restoring the session, so the
 * first reads of the run know whether they are offline rather than assuming they
 * are not. This is that wait.
 */
describe('waitForNetwork', () => {
  const initial = useNetworkStore.getState();

  beforeEach(() => {
    jest.useFakeTimers();
    useNetworkStore.setState({ ...initial, hasResolved: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves immediately when NetInfo has already answered', async () => {
    useNetworkStore.setState({ hasResolved: true });
    await expect(waitForNetwork()).resolves.toBeUndefined();
  });

  it('resolves as soon as the first event lands', async () => {
    let done = false;
    const waiting = waitForNetwork().then(() => {
      done = true;
    });

    expect(done).toBe(false);
    useNetworkStore.setState({ hasResolved: true, isConnected: false, isOnline: false });
    await waiting;

    expect(done).toBe(true);
  });

  /**
   * A radio that will not report is not a reason to refuse to start. Boot goes on
   * with the optimistic default rather than spending the rest of its budget here.
   */
  it('gives up at the cap rather than blocking the start', async () => {
    const waiting = waitForNetwork();
    jest.advanceTimersByTime(NETWORK_PROBE_CAP_MS);
    await expect(waiting).resolves.toBeUndefined();
    expect(useNetworkStore.getState().hasResolved).toBe(false);
  });

  it('does not leave a timer or a subscriber behind once it settles', async () => {
    const waiting = waitForNetwork();
    useNetworkStore.setState({ hasResolved: true });
    await waiting;

    // A live timer would fire into a settled promise; a live subscriber would
    // keep the store holding a closure for the rest of the session.
    expect(jest.getTimerCount()).toBe(0);
    useNetworkStore.setState({ hasResolved: false });
    useNetworkStore.setState({ hasResolved: true });
    expect(jest.getTimerCount()).toBe(0);
  });
});
