import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** CLAUDE.md Section 37: detect offline state for the banner. */
export function useNetworkStatus(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

  return { isOffline };
}
