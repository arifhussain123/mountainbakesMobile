package com.mountainbakes.mobile

import android.os.Bundle
import androidx.appcompat.app.AppCompatDelegate
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.zoontek.rnbootsplash.RNBootSplash

class MainActivity : ReactActivity() {

  /**
   * Installs the native splash before the first frame. The manifest sets
   * BootTheme on this activity, but without this init call the theme is simply
   * swapped away and the app shows a white flash while the JS bundle loads.
   *
   * Must run before super.onCreate().
   *
   * The night mode is applied first, and the order is not cosmetic: it decides
   * which `values-night` copy of `bootsplash_background` and `app_background`
   * Android resolves, so it has to be set before the splash theme is read.
   * Applied from the app's own stored preference rather than the OS setting —
   * pin the app to Light on a phone in dark mode and the splash would otherwise
   * come up dark and flip to cream the moment React rendered. See
   * [AppThemeModule].
   *
   * This is the only place the night mode is set. Calling
   * `setDefaultNightMode` later recreates the activity and remounts the whole
   * React tree, which is far more disruptive than a window background nobody
   * can see until the next launch.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    AppCompatDelegate.setDefaultNightMode(AppThemeModule.storedNightMode(this))
    RNBootSplash.init(this, R.style.BootTheme)
    super.onCreate(savedInstanceState)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "MountainBakesMobile"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
