package com.mountainbakes.mobile

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Registers [ThermalPrinterModule]. Added by hand in `MainApplication` — app
 * modules do not autolink.
 *
 * A second package beside [AppThemePackage] rather than one carrying both: the
 * two are unrelated capabilities with different lifetimes, and a package that
 * owns everything is the file every future module has to be threaded through.
 */
class ThermalPrinterPackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == ThermalPrinterModule.NAME) ThermalPrinterModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
        ThermalPrinterModule.NAME to
            ReactModuleInfo(
                ThermalPrinterModule.NAME,
                ThermalPrinterModule.NAME,
                false, // canOverrideExistingModule
                false, // needsEagerInit
                false, // isCxxModule
                true, // isTurboModule
            ))
  }
}
