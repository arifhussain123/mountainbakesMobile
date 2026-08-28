const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Directories Metro must never crawl, resolve from, or watch.
 *
 * The watching part is the one that matters on Linux. Without watchman, Metro
 * falls back to Node's `fs.watch`, which takes one inotify watch per directory,
 * and `metro-file-map` watches node_modules even though it excludes it from the
 * crawl. Unfiltered this tree wants ~38,600 watches against a default
 * `fs.inotify.max_user_watches` of 65,536 that an editor has usually already
 * eaten most of — so Metro dies at startup with:
 *
 *     Error: ENOSPC: System limit for number of file watchers reached
 *
 * `resolver.blockList` is what trims it: metro-file-map passes it through as
 * `ignorePatternForWatch`, so a blocked directory is never handed to `fs.watch`.
 * The entries below are build output and dead weight — nothing here is
 * reachable from the app's import graph, so blocking them costs nothing.
 *
 * Raising the sysctl (`fs.inotify.max_user_watches=524288`) or installing
 * watchman is the other half of the fix and is worth doing; this config is what
 * keeps the project working on a stock machine without root.
 *
 * Deliberately NOT blocked: bare `android/` and `ios/` directory names. This
 * project no longer ships an `ios/` of its own, but the rule still holds inside
 * node_modules: `react-native-screens` has real JS at
 * `src/components/gamma/stack/header/ios`, and blocking by name would make it
 * unresolvable.
 */
const blockList = [
  // Metro's own default — keep it, mergeConfig would otherwise drop it.
  /(\/__tests__\/.*)$/,

  // Orphaned pnpm store: ~10,500 directories left over from an earlier pnpm
  // install. This project installs with npm (package-lock.json) and every
  // package sits at node_modules/<name> as a real directory — nothing symlinks
  // into .pnpm, so it is pure dead weight. Safe to delete; blocked either way.
  new RegExp(`^${escapeRegExp(path.join(__dirname, 'node_modules/.pnpm'))}/.*`),

  // Gradle output, anywhere under the project — ~19,500 directories once the
  // app has been built. Most of it is not in ./android at all: every native
  // module compiles inside node_modules, and a single package can contribute
  // thousands of directories (@shopify/react-native-skia alone ships a deep
  // prefab include tree). The `.js`/`.json` files down here are AGP
  // intermediates — merged_res_blame_folder, navigation_json, aapt manifests,
  // codegen schemas — consumed by Gradle at build time and never resolved by
  // Metro. Note this matches `android/build`, not `build/android`: packages
  // like @expo/config-plugins ship real JS at the latter.
  new RegExp(`^${escapeRegExp(__dirname)}/.*/android/(build|\\.cxx|\\.gradle)/.*`),
  new RegExp(`^${escapeRegExp(path.join(__dirname, 'android'))}/(build|\\.cxx|\\.gradle)/.*`),
  // ...and per-Gradle-module output under ./android (android/app/build, etc.).
  new RegExp(`^${escapeRegExp(path.join(__dirname, 'android'))}/.*/(build|\\.cxx)/.*`),

];

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    blockList,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
