import { create } from 'zustand';
import { StorageKeys, kv } from '@/services/storage/secureStorage';
import type { ThemeMode } from '@/theme/theme';

/**
 * UI preferences. Persisted to MMKV synchronously, so the chosen theme survives a
 * cold start without a flash of the wrong scheme.
 *
 * Server state does NOT belong here — that is TanStack Query's job. This store
 * holds only what the device itself decides.
 */

interface SettingsState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  /** Read persisted values. Call after initStorage() has resolved. */
  hydrate: () => void;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export const useSettingsStore = create<SettingsState>(set => ({
  themeMode: 'system',

  setThemeMode: mode => {
    kv.set(StorageKeys.themeMode, mode);
    set({ themeMode: mode });
  },

  hydrate: () => {
    const stored = kv.getString(StorageKeys.themeMode);
    if (isThemeMode(stored)) set({ themeMode: stored });
  },
}));
