package com.mountainbakes.mobile

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate
import com.facebook.react.bridge.ReactApplicationContext

/**
 * Mirrors the app's theme mode into `SharedPreferences` so `MainActivity` can
 * read it before the first frame.
 *
 * The boot splash background lives in `values-night/colors.xml`, and Android
 * resolves that qualifier from the OS night setting — not from anything the app
 * has stored. Without this mirror, a user who pins Light on a phone in dark mode
 * gets a dark splash followed by a cream app, and the background visibly flips.
 *
 * `SharedPreferences` rather than the MMKV the preference already lives in:
 * `react-native-mmkv` links MMKV as a C++ prefab for its Nitro bindings and
 * exposes no Java API, so there is nothing here to read it with.
 *
 * Write-only by design — `settingsStore` on the JS side owns the value and this
 * is a copy kept in step with it. See `src/specs/NativeAppTheme.ts`.
 */
class AppThemeModule(reactContext: ReactApplicationContext) : NativeAppThemeSpec(reactContext) {

  override fun getName(): String = NAME

  override fun setThemeMode(mode: String) {
    reactApplicationContext
        .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY, mode)
        .apply()
  }

  companion object {
    const val NAME: String = "AppTheme"

    /** Deliberately not the MMKV file name — this is a mirror, not that store. */
    const val PREFS: String = "mountain-bakes-theme"
    const val KEY: String = "themeMode"

    /**
     * The stored mode as an `AppCompatDelegate` night mode.
     *
     * Anything unrecognised — absent on a fresh install, or a value written by a
     * newer JS bundle than this binary knows about — falls back to following the
     * system. That is what the app did before the mirror existed, so an unknown
     * value degrades to the old behaviour rather than forcing a scheme the user
     * never chose.
     */
    @JvmStatic
    fun nightModeFor(mode: String?): Int =
        when (mode) {
          "light" -> AppCompatDelegate.MODE_NIGHT_NO
          "dark" -> AppCompatDelegate.MODE_NIGHT_YES
          else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }

    /** Reads the mirror. Safe before `onCreate` — `SharedPreferences` needs no activity. */
    @JvmStatic
    fun storedNightMode(context: Context): Int =
        nightModeFor(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null))
  }
}
