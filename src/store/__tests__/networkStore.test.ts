import { deriveIsOnline } from '../networkStore';

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
