import { createMMKV } from 'react-native-mmkv';

/**
 * Non-secret UI preferences, readable **synchronously at module scope**.
 *
 * ---------------------------------------------------------------------------
 * Why this is a second store rather than a few more keys in `secureStorage`
 * ---------------------------------------------------------------------------
 * The encrypted store cannot answer before first render, by construction: its
 * MMKV instance is created with a key that lives in the Keychain/Keystore, and
 * reading the Keychain is asynchronous. So `kv` requires `initStorage()` to have
 * been awaited, which happens inside the bootstrap effect — one render *after*
 * the first.
 *
 * For the theme that is a visible defect. `themeMode` defaulted to `'system'`
 * on the first frame regardless of what the user had chosen, so a device set to
 * dark with the app set to Light rendered the dark palette until the bootstrap
 * effect resolved, then flipped. The fix is not to make the Keychain faster; it
 * is to stop putting a non-secret on the far side of it.
 *
 * **Only non-secrets belong here — this file is not encrypted.** Anything
 * carrying a token, a session, or user data stays in `secureStorage`. The test
 * is not "is it small", it is "would it matter on a stolen, unlocked device".
 */
export const prefs = createMMKV({ id: 'mountain-bakes-prefs' });

/** Centralised so a rename cannot silently orphan a stored preference. */
export const PreferenceKeys = {
  themeMode: 'settings.themeMode',
} as const;
