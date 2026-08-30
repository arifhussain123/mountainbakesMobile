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
  /**
   * The chosen accent (`theme/accents.ts`). Read at module scope like the mode,
   * for the same reason: an accent applied by a later effect is a visible flash
   * of the wrong brand colour on every cold start.
   */
  accent: 'settings.accent',
  /**
   * The chosen typeface (`theme/typography.ts`). Read at module scope like the
   * mode and the accent, and for the stronger version of the same reason: a face
   * applied by a later effect does not just flash a colour, it re-measures every
   * line of text on screen.
   */
  typeface: 'settings.typeface',
  /**
   * Whether the first-run panels have been shown (`features/onboarding`).
   *
   * Here rather than in `secureStorage` for the same reason the three above
   * are: it is read to decide the very first screen, and the encrypted store
   * cannot answer until the Keychain has. It is also not a secret — the fact
   * that this phone has opened the app before is not worth a key.
   *
   * Namespaced `onboarding.` rather than `settings.` because it is not a
   * setting: nothing in Settings offers it, and there is no UI that turns it
   * back off. It is a record that something happened.
   */
  onboardingSeen: 'onboarding.seen',
  /**
   * The Bluetooth address of the receipt printer this device prints to, and the
   * name to show for it (`common/printing/printerStore.ts`).
   *
   * Here rather than in `secureStorage` on both of this file's tests. It is not
   * a secret — a MAC address of a printer on the counter is not worth a Keychain
   * round trip — and it is read at module scope for the same reason the theme
   * is: the slip's Print button has to know whether a printer exists on the
   * first frame, and a button that appears one render late is a button the
   * cashier has already decided is not there.
   *
   * Namespaced `printer.` rather than `settings.`: the Settings screen does not
   * offer it, and it is a property of this phone's pairing rather than a
   * preference about how the app looks.
   */
  printerAddress: 'printer.address',
  printerName: 'printer.name',
} as const;
