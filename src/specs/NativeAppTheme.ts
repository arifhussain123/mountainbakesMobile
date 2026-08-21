import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * The one thing the native side needs to know about the theme.
 *
 * ---------------------------------------------------------------------------
 * Why this exists at all
 * ---------------------------------------------------------------------------
 * The boot splash is drawn by Android before a line of JavaScript has run, so
 * its background cannot be read from the app's own settings — it comes from
 * `values-night/colors.xml`, which Android resolves from the OS night setting
 * alone. Pin the app to Light on a phone in dark mode and you get a dark splash
 * handing over to a cream app: the background flips in front of the user.
 *
 * The fix is to stop letting the OS decide. This module mirrors the chosen mode
 * into Android `SharedPreferences` — a store `MainActivity` can read before
 * `onCreate` — and the activity turns it into an `AppCompatDelegate` night mode.
 * From then on `values-night` resolves against *the app's* preference, so the
 * splash background, the window background and the first React frame all agree.
 *
 * MMKV would have been the obvious place to read the mode from instead, since
 * that is where it already lives. It is not reachable: `react-native-mmkv`
 * links MMKV as a C++ prefab for its Nitro bindings, and ships no Java API for
 * `MainActivity` to call. Hence a mirror rather than a shared read.
 *
 * ---------------------------------------------------------------------------
 * It is write-only, and it takes effect on the NEXT launch
 * ---------------------------------------------------------------------------
 * JavaScript never reads back — `settingsStore` is the source of truth and this
 * is a downstream copy kept in step with it.
 *
 * Nothing calls `setDefaultNightMode` at runtime on purpose. It recreates every
 * running activity, which remounts the whole React tree and would throw away
 * unsaved form state to repaint a window background the user cannot see. The
 * JS theme switches instantly on its own; the native surfaces catch up on the
 * next cold start, which is the only time they are visible anyway.
 */
export interface Spec extends TurboModule {
  /** `'light' | 'dark' | 'system'`. Widened to `string` — codegen has no unions. */
  setThemeMode(mode: string): void;
}

/**
 * `get`, not `getEnforcing`: there is no iOS implementation (this app has never
 * been built for iOS) and no native runtime under Jest. Both should degrade to
 * "the OS decides", which is the behaviour that existed before this module — not
 * to a throw on a code path that runs during boot.
 */
export default TurboModuleRegistry.get<Spec>('AppTheme');
