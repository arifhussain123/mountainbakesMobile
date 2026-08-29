import { create } from 'zustand';

import { PreferenceKeys, prefs } from '@/common/storage/preferences';

/**
 * Whether this device has been through the first-run panels.
 *
 * ---------------------------------------------------------------------------
 * Why a store and not a plain read
 * ---------------------------------------------------------------------------
 * The value is written exactly once and read exactly once, which sounds like a
 * `prefs.getBoolean()` at the call site. It is not, because the *reader* is
 * `RootNavigator`: finishing the panels has to swap the tree underneath them,
 * and a module-scope boolean cannot re-render anybody.
 *
 * It lives in the feature rather than in `state/` because `state/index.ts`
 * says what belongs there — session, connectivity, sync phase, preferences,
 * mirror age — and this is none of those. It is one feature's record that it
 * has run.
 *
 * ---------------------------------------------------------------------------
 * Read at module scope, like the theme
 * ---------------------------------------------------------------------------
 * Out of the **unencrypted** preferences MMKV, for the reason
 * `common/storage/preferences.ts` gives at length: the encrypted store cannot
 * answer until the Keychain has, which is one render after the first. A flag
 * that decides the first screen cannot arrive a render late — that would show
 * the panels for one frame to someone who has already dismissed them, which is
 * the single thing this flag exists to prevent.
 */
interface OnboardingState {
  seen: boolean;
  /**
   * Record that the panels are done. Idempotent, and safe to call from a place
   * that does not know whether they ever ran — see the sign-in case in
   * `RootNavigator`.
   */
  markSeen: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  // `=== true` rather than a truthiness check: the mock and the real MMKV both
  // return `undefined` for an absent key, and `undefined` is the first-run case.
  seen: prefs.getBoolean(PreferenceKeys.onboardingSeen) === true,

  markSeen: () => {
    // Guarded so the sign-in path is not writing to disk on every render pass
    // that observes an already-signed-in session.
    if (get().seen) return;
    prefs.set(PreferenceKeys.onboardingSeen, true);
    set({ seen: true });
  },
}));
