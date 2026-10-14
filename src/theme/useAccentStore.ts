import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ACCENT_OPTIONS, DEFAULT_ACCENT, type AccentOption } from './colors';

interface AccentState {
  accent: AccentOption;
  setAccent: (accent: AccentOption) => void;
}

/**
 * productionApp.md Step 1: "Accent is a prop... store the accent in a Zustand
 * settings store so it can be changed later without touching screens." No
 * screen should read `colors.ts`'s `DEFAULT_ACCENT` directly — always go
 * through `useProductionTheme()`, which reads this store.
 */
export const useAccentStore = create<AccentState>()(
  persist(
    (set) => ({
      accent: DEFAULT_ACCENT,
      setAccent: (accent) => set({ accent: ACCENT_OPTIONS.includes(accent) ? accent : DEFAULT_ACCENT }),
    }),
    { name: 'mountainbakes.production.accent', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
