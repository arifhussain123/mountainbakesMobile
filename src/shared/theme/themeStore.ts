import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_ACCENT, isAccentId, type AccentId } from './accents';

export type ThemeModeSetting = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeModeSetting;
  accent: AccentId;
  /**
   * False until `persist`'s AsyncStorage rehydration has run. The native
   * bootsplash is fixed dark (it can't read this store), so the JS splash
   * renders dark by default and only switches once this flips true — see
   * `ThemeProvider`. Excluded from `partialize` below, so it's never itself
   * persisted/resurrected — every fresh JS instance starts at `false`.
   */
  hydrated: boolean;
  setHydrated: () => void;
  setMode: (mode: ThemeModeSetting) => void;
  setAccent: (accent: AccentId) => void;
  /** The Appearance sheet's quick toggle — cycles Light ⇄ Dark, same as the web's moon icon. Long-press opens the full sheet for System. */
  toggleLightDark: () => void;
}

/**
 * Persisted locally only — Step 0 confirmed the web's own theme/accent choice
 * is `localStorage`-only (no server-side user-settings endpoint exists for
 * either), so there is nothing to sync after login. Same AsyncStorage +
 * zustand/persist pattern already used by `support/store/seenQueriesStore.ts`
 * and the Production app's `useAccentStore`.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      accent: DEFAULT_ACCENT,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent: isAccentId(accent) ? accent : DEFAULT_ACCENT }),
      toggleLightDark: () => {
        const current = get().mode;
        set({ mode: current === 'dark' ? 'light' : 'dark' });
      },
    }),
    {
      name: 'mountainbakes.theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode, accent: state.accent }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
