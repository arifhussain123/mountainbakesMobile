const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

// react-native's own @react-native/virtualized-lists imports a private path
// ("react-native/src/private/featureflags/ReactNativeFeatureFlags") that
// isn't listed in react-native's package.json "exports" map. Metro falls
// back to file-based resolution and resolves it fine, but logs a
// "resolver_warning" on every bundle. This is an upstream gap in RN 0.87.x's
// own exports map, not our code — silence just this one warning.
const SILENCED_WARNING = /not listed in the "exports" of .*react-native["/].*ReactNativeFeatureFlags/;
const baseReporter = defaultConfig.reporter;
defaultConfig.reporter = {
  update(event) {
    if (event?.type === 'resolver_warning' && SILENCED_WARNING.test(event.message || '')) {
      return;
    }
    baseReporter.update(event);
  },
};

const config = {};

module.exports = mergeConfig(defaultConfig, config);
