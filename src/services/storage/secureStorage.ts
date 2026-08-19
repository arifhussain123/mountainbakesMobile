import { createMMKV, type MMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';

/**
 * Storage layer.
 *
 * Two tiers, deliberately:
 *
 * - **Keychain / Keystore** holds exactly one thing: the MMKV encryption key.
 *   Hardware-backed where the device supports it.
 * - **Encrypted MMKV** holds everything else, including the Supabase session
 *   (which carries the refresh token). MMKV is synchronous, which is what lets
 *   the Supabase storage adapter below behave sanely, and encrypting it with a
 *   Keychain-held key keeps the refresh token off plain disk.
 *
 * Passwords are never stored, in either tier.
 *
 * Creating the MMKV instance is synchronous but reading the Keychain is not.
 * The async `supabaseStorageAdapter` self-initialises, so it is safe from module
 * scope; the synchronous `kv` API cannot, and requires `initStorage()` to have
 * been awaited during bootstrap.
 */

const KEYCHAIN_SERVICE = 'com.mountainbakes.mobile.storagekey';
const MMKV_ID = 'mountain-bakes';

let storage: MMKV | null = null;
let initPromise: Promise<MMKV> | null = null;

/**
 * A 32-character key: 16 random bytes rendered as hex. 32 chars is exactly the
 * 32 bytes AES-256 wants — a 32-BYTE random value hex-encoded would be 64 chars
 * and get truncated, silently weakening the key.
 *
 * Entropy comes from react-native-get-random-values, imported at app entry.
 */
function generateEncryptionKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function loadOrCreateEncryptionKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  if (existing && existing.password) return existing.password;

  const key = generateEncryptionKey();
  await Keychain.setGenericPassword('mmkv', key, {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return key;
}

/**
 * Resolve the storage instance, initialising it on first use.
 *
 * Self-initialising rather than requiring `initStorage()` to have run first,
 * because the Supabase client is constructed at module scope and immediately
 * reads the persisted session through the adapter below — before any bootstrap
 * code gets a chance to run. Requiring an explicit init made that read throw,
 * which on a device would have looked like "signed out" for a user who was in
 * fact signed in.
 *
 * The promise is memoised, so concurrent callers share one Keychain round-trip
 * and one MMKV instance.
 */
function ensureStorage(): Promise<MMKV> {
  if (storage) return Promise.resolve(storage);
  if (!initPromise) {
    initPromise = (async () => {
      const encryptionKey = await loadOrCreateEncryptionKey();
      storage = createMMKV({ id: MMKV_ID, encryptionKey, encryptionType: 'AES-256' });
      return storage;
    })().catch(error => {
      // Let the next attempt retry rather than caching a rejected promise.
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

/**
 * Eagerly initialise encrypted storage. Idempotent. Awaited at startup so a
 * Keychain failure surfaces on the splash screen with a retry, rather than
 * later as a confusing empty-state.
 *
 * If the Keychain is unreadable the app must not fall back to unencrypted
 * storage — that would silently downgrade where the refresh token lives — so the
 * error propagates.
 */
export async function initStorage(): Promise<void> {
  await ensureStorage();
}

function requireStorage(): MMKV {
  if (!storage) {
    throw new Error('[storage] initStorage() must be awaited before storage is used.');
  }
  return storage;
}

export const kv = {
  getString(key: string): string | undefined {
    return requireStorage().getString(key);
  },
  set(key: string, value: string | number | boolean): void {
    requireStorage().set(key, value);
  },
  getBoolean(key: string): boolean | undefined {
    return requireStorage().getBoolean(key);
  },
  delete(key: string): void {
    requireStorage().remove(key);
  },
  contains(key: string): boolean {
    return requireStorage().contains(key);
  },
  /**
   * Clear cached/user-scoped values on sign-out.
   *
   * Never call this with a blanket wipe while unsynced work exists — pending
   * offline transactions live in SQLite, not here, but the last-sync markers and
   * the queue's cursor do live here and dropping them mid-flight orphans work.
   */
  clearAll(): void {
    requireStorage().clearAll();
  },
};

/**
 * Storage adapter for the Supabase JS client.
 *
 * The SDK expects an async interface; MMKV is synchronous, so these resolve
 * immediately. That is a feature — it means session restore on cold start does
 * not race the first render the way an AsyncStorage-backed adapter can.
 */
export const supabaseStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const s = await ensureStorage();
    return s.getString(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const s = await ensureStorage();
    s.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    const s = await ensureStorage();
    s.remove(key);
  },
};

/** Keys used across the app. Centralised so a rename cannot silently orphan data. */
export const StorageKeys = {
  themeMode: 'settings.themeMode',
  lastSyncAt: 'sync.lastSyncAt',
  lastIdentity: 'auth.lastIdentity',
  rememberMe: 'auth.rememberMe',
} as const;
