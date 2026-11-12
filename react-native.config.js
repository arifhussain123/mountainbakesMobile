/**
 * Bundled fonts (2026 redesign — Urbanist). `npx react-native-asset` copies
 * them into android/app/src/main/assets/fonts and links them into the iOS
 * project + Info.plist (UIAppFonts). Re-run it after adding/removing a file
 * in ./assets/fonts.
 */
module.exports = {
  assets: ['./assets/fonts'],
};
