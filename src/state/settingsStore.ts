import { create } from 'zustand';
import NativeAppTheme from '@/specs/NativeAppTheme';
import { PreferenceKeys, prefs } from '@/common/storage/preferences';
import { StorageKeys, kv } from '@/common/storage/secureStorage';
import type { ThemeMode } from '@/common/theme/themes';
import { DEFAULT_ACCENT, isAccentKey, type AccentKey } from '@/common/theme/accents';

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
   * The chosen brand fill. Light/dark is a *scheme*; this is the accent within
   * it, and the two are independent — picking Pine does not change which scheme
   * is live, and switching to dark keeps the accent.
   *
   * Unlike `themeMode` this is NOT mirrored to the native side. The native
   * mirror exists so `values-night/` and the boot splash resolve to the scheme
   * the user picked; the splash background is a neutral wash in both schemes and
   * carries no accent, so there is nothing on the native side to keep in step.
   */
  accent: AccentKey;
  setAccent: (accent: AccentKey) => void;
  /**
   * One-time migration of `themeMode` out of the encrypted store, plus the
   * native mirror.
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
/**
 * Mirror the mode to the native side, which reads it at the next cold start to
 * decide the boot splash and window background. See `specs/NativeAppTheme.ts`.
 *
 * Failure is swallowed on purpose. The mirror is an appearance detail on a
 * launch that has not happened yet; there is no version of "the theme could not
 * be copied to SharedPreferences" worth failing a boot or a settings tap over,
 * and the module is absent by design on iOS and under Jest.
 */
function mirrorToNative(mode: ThemeMode): void {
  try {
    NativeAppTheme?.setThemeMode(mode);
  } catch {
    // Next launch uses whatever was mirrored last, or follows the OS.
  }
}

function initialAccent(): AccentKey {
  try {
    const stored = prefs.getString(PreferenceKeys.accent);
    return isAccentKey(stored) ? stored : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

function initialThemeMode(): ThemeMode {
  try {
    const stored = prefs.getString(PreferenceKeys.themeMode);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  themeMode: initialThemeMode(),
  accent: initialAccent(),

  setThemeMode: mode => {
    prefs.set(PreferenceKeys.themeMode, mode);
    set({ themeMode: mode });
    mirrorToNative(mode);
  },

  setAccent: accent => {
    prefs.set(PreferenceKeys.accent, accent);
    set({ accent });
  },

  hydrate: () => {
    // Already migrated, or set on this install: the new location wins.
    if (isThemeMode(prefs.getString(PreferenceKeys.themeMode))) {
      // Still mirror it. Anyone upgrading into this build chose their mode
      // before the native side existed, so their first launch after the update
      // is the only chance to copy it across — and without this it would be a
      // launch that splashes in the wrong scheme.
      mirrorToNative(get().themeMode);
      return;
    }

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
    mirrorToNative(get().themeMode);
  },
}));
