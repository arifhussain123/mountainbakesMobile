import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

/**
 * Connectivity.
 *
 * Two different questions, deliberately kept apart:
 *
 * - `isConnected` — the radio has a network.
 * - `isInternetReachable` — that network actually reaches the internet.
 *
 * A captive portal (hotel wifi, a café splash page) reports connected but not
 * reachable. Treating that as online means every sync attempt fails and burns
 * retry budget, so `isOnline` requires both.
 *
 * `isInternetReachable` is `null` while NetInfo is still probing. Null is
 * treated as "assume reachable": being briefly optimistic costs one failed
 * request, while being pessimistic would block a write the user could have made.
 */

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
  /** True only when a request has a real chance of succeeding. */
  isOnline: boolean;
  /** Set once the first NetInfo event has landed. */
  hasResolved: boolean;
}

interface NetworkStore extends NetworkState {
  /** Subscribe to NetInfo. Returns the unsubscribe function. */
  start: () => () => void;
  /** Force a fresh reachability probe, e.g. on pull-to-refresh. */
  refresh: () => Promise<void>;
}

export function deriveIsOnline(state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}): boolean {
  if (!state.isConnected) return false;
  // null = still probing; assume reachable rather than block the user.
  return state.isInternetReachable !== false;
}

function fromNetInfo(state: NetInfoState): NetworkState {
  return {
    isConnected: state.isConnected === true,
    isInternetReachable: state.isInternetReachable,
    connectionType: state.type,
    isOnline: deriveIsOnline(state),
    hasResolved: true,
  };
}

export const useNetworkStore = create<NetworkStore>(set => ({
  isConnected: true,
  isInternetReachable: null,
  connectionType: 'unknown',
  isOnline: true,
  hasResolved: false,

  start: () => NetInfo.addEventListener(state => set(fromNetInfo(state))),

  refresh: async () => {
    const state = await NetInfo.refresh();
    set(fromNetInfo(state));
  },
}));

/** Non-React read, for the sync manager and the API layer. */
export function isOnlineNow(): boolean {
  return useNetworkStore.getState().isOnline;
}
