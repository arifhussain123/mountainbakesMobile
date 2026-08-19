import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSyncStore } from '@/store/syncStore';

/**
 * Drives the sync engine. Mounted once, inside the authenticated tree.
 *
 * Drains on the three moments work can actually move:
 *   - coming back online (the obvious one),
 *   - returning to the foreground (a queue may have gone stale while backgrounded),
 *   - signing in (an earlier session's work resumes).
 *
 * There is deliberately no polling timer. A drain that finds nothing costs a
 * database round-trip and, on a locked-down network, a failed request that burns
 * retry budget for no reason.
 */
export function useSyncEngine(): void {
  const isOnline = useNetworkStore(s => s.isOnline);
  const status = useAuthStore(s => s.status);
  const sync = useSyncStore(s => s.sync);
  const refreshCounts = useSyncStore(s => s.refreshCounts);

  const wasOnline = useRef(isOnline);

  // Initial count, so the badge is correct before anything syncs.
  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  // Reconnect, and sign-in.
  useEffect(() => {
    const cameOnline = isOnline && !wasOnline.current;
    wasOnline.current = isOnline;

    if (status !== 'signedIn') return;
    if (cameOnline || isOnline) sync();
  }, [isOnline, status, sync]);

  // Foreground.
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active' && useAuthStore.getState().status === 'signedIn') {
        sync();
      }
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [sync]);
}
