/**
 * Global state barrel.
 *
 * These six stores are app-wide by definition — session, connectivity, the
 * sync engine's phase, user preferences, which receipt printer this handset is
 * paired with, and which reads are currently being served from the mirror.
 * Feature-scoped state belongs in
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

/*
 * App-wide rather than owned by `features/printer`, because two unrelated
 * slices read it: the Printer screen sets it, and `common/till/SaleReceipt`
 * decides whether to offer a Print button from it. That is the promotion rule
 * in this project's CLAUDE.md applied to state rather than to a component.
 */
export { usePrinterStore, selectedPrinter } from './printerStore';

export { useSyncStore } from './syncStore';
export type { SyncPhase } from './syncStore';
