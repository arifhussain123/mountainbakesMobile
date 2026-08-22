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
 * Mount *is* the sign-in event: this tree exists only for a signed-in user, so
 * the drain on mount is what covers somebody signing in the morning after a
 * shift's work was queued. It stays here even though the boot sequence now fires
 * a drain of its own (`services/boot/bootSequence.ts`, the `sync` step) — boot
 * runs once per launch, and a sign-in that happens later would otherwise move
 * nothing.
 *
 * The two do not collide: `syncStore.sync()` sets `phase: 'syncing'`
 * synchronously, so when boot has already started a drain the mount call returns
 * at the guard rather than queuing a second pass over the same rows.
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

  // Initial count, so the badge is correct before anything syncs. Boot refreshes
  // these too; this covers a remount, and the signed-out tree that boot's own
  // step deliberately skips.
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
