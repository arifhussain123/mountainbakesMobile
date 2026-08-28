/**
 * Global state barrel.
 *
 * These five stores are app-wide by definition — session, connectivity, the
 * sync engine's phase, user preferences, and which reads are currently being
 * served from the mirror. Feature-scoped state belongs in
 * `features/<feature>/store/`, and server state belongs in react-query
 * (`@/api/hooks`) rather than in a store at all.
 */

export { useAuthStore } from './authStore';
export type { AuthStatus, MfaChallenge } from './authStore';

export { useMirrorStore, useDataAsOf } from './mirrorStore';
export type { MirrorResource } from './mirrorStore';

export {
  useNetworkStore,
  deriveIsOnline,
  isOnlineNow,
  waitForNetwork,
  NETWORK_PROBE_CAP_MS,
} from './networkStore';
export type { NetworkState } from './networkStore';

export { useSettingsStore } from './settingsStore';

export { useSyncStore } from './syncStore';
export type { SyncPhase } from './syncStore';
