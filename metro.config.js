const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

// react-native's own @react-native/virtualized-lists imports a private path
// that isn't in react-native's package.json "exports" map, so Metro logs a
// "not listed in the exports" warning and falls back to file-based resolution.
// Resolve that one import to its file up front so the fallback never happens.
// (Filtering the warning in `reporter` doesn't work: `react-native start`
// replaces the config's reporter with its own.)
const RN_FEATURE_FLAGS = 'react-native/src/private/featureflags/ReactNativeFeatureFlags';
const RN_FEATURE_FLAGS_FILE = path.join(path.dirname(require.resolve('react-native/package.json')), 'src/private/featureflags/ReactNativeFeatureFlags');

const config = {
  resolver: {
    resolveRequest(context, moduleName, platform) {
      return context.resolveRequest(context, moduleName === RN_FEATURE_FLAGS ? RN_FEATURE_FLAGS_FILE : moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
