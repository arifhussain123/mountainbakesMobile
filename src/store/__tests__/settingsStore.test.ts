/**
 * The theme mode must be known on the FIRST render, not the second.
 *
 * It used to live in the encrypted MMKV, whose instance is created with a key
 * read out of the Keychain — an async read, so the store could only be filled
 * from inside the bootstrap effect. Until that resolved, `themeMode` was
 * `'system'` regardless of what the user had chosen, and a device in dark mode
 * with the app set to Light rendered the dark palette and then flipped.
 *
 * These tests are about that ordering guarantee, which is why they re-import the
 * module rather than calling `hydrate()`: a fresh import is the closest thing to
 * a cold start, and the assertion is on the value the store has *before anything
 * else runs*.
 */
import { PreferenceKeys, prefs } from '@/services/storage/preferences';
import { StorageKeys } from '@/services/storage/secureStorage';

// The encrypted store is stubbed so these tests exercise the preference path and
// the legacy migration without standing up a Keychain.
const mockLegacy = new Map<string, string>();
jest.mock('@/services/storage/secureStorage', () => ({
  StorageKeys: { themeMode: 'settings.themeMode' },
  kv: {
    getString: (k: string) => mockLegacy.get(k),
    set: (k: string, v: string) => mockLegacy.set(k, v),
  },
}));

type Store = typeof import('../settingsStore').useSettingsStore;

/** Re-imports the module, so the assertion lands on what it read at import time. */
function freshStore(): Store {
  jest.resetModules();
  return (require('../settingsStore') as { useSettingsStore: Store }).useSettingsStore;
}

beforeEach(() => {
  prefs.clearAll();
  mockLegacy.clear();
});

describe('themeMode on cold start', () => {
  it('defaults to system when nothing is stored', () => {
    const store = freshStore();
    expect(store.getState().themeMode).toBe('system');
  });

  it('is already correct on the first read, with no hydrate() call', () => {
    prefs.set(PreferenceKeys.themeMode, 'dark');

    const store = freshStore();

    // The point of the whole change: no effect has run, nothing was awaited.
    expect(store.getState().themeMode).toBe('dark');
  });

  it('falls back to system rather than throwing on a corrupt value', () => {
    prefs.set(PreferenceKeys.themeMode, 'chartreuse');
    const store = freshStore();
    expect(store.getState().themeMode).toBe('system');
  });
});

describe('setThemeMode', () => {
  it('persists synchronously, so the next cold start reads it back', () => {
    const store = freshStore();
    store.getState().setThemeMode('light');

    expect(prefs.getString(PreferenceKeys.themeMode)).toBe('light');
    expect(freshStore().getState().themeMode).toBe('light');
  });
});

describe('migration off the encrypted store', () => {
  /**
   * Without this, every user who had already chosen a theme is silently reset
   * to `system` by the update that moved the key.
   */
  it('moves an existing choice across on first hydrate', () => {
    mockLegacy.set(StorageKeys.themeMode, 'dark');

    const store = freshStore();
    expect(store.getState().themeMode).toBe('system'); // not yet migrated

    store.getState().hydrate();

    expect(store.getState().themeMode).toBe('dark');
    expect(prefs.getString(PreferenceKeys.themeMode)).toBe('dark');
  });

  it('never lets a stale legacy value overwrite a newer choice', () => {
    mockLegacy.set(StorageKeys.themeMode, 'dark');
    prefs.set(PreferenceKeys.themeMode, 'light');

    const store = freshStore();
    store.getState().hydrate();

    expect(store.getState().themeMode).toBe('light');
  });
});
