import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { getUnsyncedSummary } from '@/database/repositories/syncQueueRepository';
import { useAuthStore } from '@/store/authStore';

/**
 * Sign-out that protects unsynced work.
 *
 * Signing out never deletes local transactions — they survive and resume after
 * the next sign-in. But the person tapping "Sign out" cannot see that, and on a
 * shared branch phone the next person to sign in may be someone else entirely.
 * So when unsynced work exists, the count is stated plainly and confirmation is
 * required.
 *
 * The warning is about visibility, not data loss: the copy says the work is kept
 * rather than implying it is at risk, because overstating the danger would push
 * staff into refusing to sign out at all.
 */
export function useSignOut(): {
  signOut: () => Promise<void>;
  isSigningOut: boolean;
} {
  const storeSignOut = useAuthStore(s => s.signOut);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      let pendingCount = 0;
      try {
        const summary = await getUnsyncedSummary();
        pendingCount = summary.total;
      } catch {
        // The queue is unreadable (database not open yet, say). Sign out anyway
        // rather than trapping someone in a session over a diagnostic failure.
        pendingCount = 0;
      }

      if (pendingCount === 0) {
        await storeSignOut();
        return;
      }

      const noun = pendingCount === 1 ? 'transaction' : 'transactions';
      const confirmed = await new Promise<boolean>(resolve => {
        Alert.alert(
          'Sign out with unsynced work?',
          `${pendingCount} ${noun} on this device ${
            pendingCount === 1 ? 'has' : 'have'
          } not reached the server yet.\n\n` +
            'It stays saved on this device and will sync when you sign back in on this phone. ' +
            'It will not sync while someone else is signed in.',
          [
            { text: 'Stay signed in', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Sign out', style: 'destructive', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        );
      });

      if (confirmed) await storeSignOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [storeSignOut]);

  return { signOut, isSigningOut };
}
