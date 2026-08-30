package com.mountainbakes.mobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.common.assets.ReactFontManager
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here.
          // Both of these live in this app rather than a node module, so they
          // have nothing to autolink from.
          add(AppThemePackage())
          add(ThermalPrinterPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    registerFonts()
    loadReactNative(this)
  }

  /**
   * Register the three custom families, by the names `theme/typography.ts` asks
   * for.
   *
   * These strings are a contract with JavaScript and there is nothing that
   * checks it: `fontFamily: 'PlusJakartaSans'` in a style resolves through
   * ReactFontManager's custom-font cache only if the key registered here matches
   * it exactly. Get one wrong and nothing fails — the lookup misses the cache,
   * falls through to `Typeface.create(name, style)`, and Android quietly hands
   * back the system sans. The app renders, and only the shape of the letters
   * says anything is wrong. `scripts/check-fonts.sh` pins the pair — shell
   * rather than a Jest test for the same reason the other three checks are,
   * namely that reading files needs `fs` and this project has no `@types/node`.
   *
   * Registered here rather than shipped in `assets/fonts/` because the scale
   * needs five weights of the UI face and the asset path resolves exactly two —
   * see the comment in `res/font/plusjakartasans.xml`.
   *
   * Before `loadReactNative`, so the first frame React draws already has them.
   * Registering afterwards leaves the fonts absent for the splash and whatever
   * else mounts in that window, then swaps them in — a visible reflow on the one
   * screen the user is already waiting on.
   */
  private fun registerFonts() {
    ReactFontManager.getInstance().apply {
      addCustomFont(this@MainApplication, "PlusJakartaSans", R.font.plusjakartasans)
      addCustomFont(this@MainApplication, "PlayfairDisplay", R.font.playfairdisplay)
      addCustomFont(this@MainApplication, "IBMPlexMono", R.font.ibmplexmono)
      // The two alternate typefaces the Settings font picker offers. Each is a
      // whole mood in v6 — chosen, it serves as both the UI face and the display
      // face — so neither has a serif registered alongside it.
      addCustomFont(this@MainApplication, "SpaceGrotesk", R.font.spacegrotesk)
      addCustomFont(this@MainApplication, "LibreBaskerville", R.font.librebaskerville)
    }
  }
}
