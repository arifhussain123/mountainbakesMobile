import { create } from 'zustand';
import { PreferenceKeys, prefs } from '@/services/storage/preferences';
import { StorageKeys, kv } from '@/services/storage/secureStorage';
import type { ThemeMode } from '@/theme/themes';

/**
 * UI preferences.
 *
 * Persisted to the **unencrypted** preferences MMKV, which is readable at module
 * scope — see `services/storage/preferences.ts` for why that matters. The
 * initial state below is a real synchronous read, not a default that a later
 * effect corrects: by the time React renders the first frame this store already
 * holds the mode the user chose, so there is no flash of the wrong scheme.
 *
 * Server state does NOT belong here — that is TanStack Query's job. This store
 * holds only what the device itself decides.
 */

interface SettingsState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  /**
   * One-time migration of `themeMode` out of the encrypted store.
   *
   * It used to live there, which is what forced the read to be async. Anyone
   * upgrading has their choice sitting in the old location, so this moves it
   * across once storage is available. Without it, every existing user is
   * silently reset to `system` on the update.
   *
   * Call after `initStorage()` has resolved. Safe to call more than once.
   */
  hydrate: () => void;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Read before the store is created, so the very first render already has it.
 *
 * A corrupt or absent value falls back to `system` rather than throwing: a
 * preference is never worth failing a cold start over.
 */
function initialThemeMode(): ThemeMode {
  try {
    const stored = prefs.getString(PreferenceKeys.themeMode);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export const useSettingsStore = create<SettingsState>(set => ({
  themeMode: initialThemeMode(),

  setThemeMode: mode => {
    prefs.set(PreferenceKeys.themeMode, mode);
    set({ themeMode: mode });
  },

  hydrate: () => {
    // Already migrated, or set on this install: the new location wins.
    if (isThemeMode(prefs.getString(PreferenceKeys.themeMode))) return;

    try {
      const legacy = kv.getString(StorageKeys.themeMode);
      if (isThemeMode(legacy)) {
        prefs.set(PreferenceKeys.themeMode, legacy);
        set({ themeMode: legacy });
      }
    } catch {
      // Encrypted storage unavailable. The preference is not worth a boot
      // failure — `system` stands until the user picks again.
    }
  },
}));
