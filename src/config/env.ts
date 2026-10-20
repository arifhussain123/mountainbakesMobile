import googleMaps from './googleMaps.json';

/**
 * Plain env config rather than `react-native-config` — no native project changes
 * needed, and the folder-structure skill's own reference app does the same thing.
 *
 * Points at the live Railway-hosted API so the app works without a local
 * backend running. Override by editing this file per machine until a proper
 * per-build-variant config is worth adding.
 */
export const env = {
  apiBaseUrl: 'https://mountainbakes-server-production.up.railway.app/api',
  /**
   * An Android-restricted Google key (Maps SDK for Android + Places API (New)).
   * Lives in googleMaps.json because the Android build reads the same file for
   * the manifest; changing it needs a rebuild. Empty = Branch Locations falls
   * back to typed coordinates.
   */
  googleMapsApiKey: googleMaps.apiKey,
  /** The APK's signing-cert SHA-1, no colons — sent with Places calls for an Android-restricted key. */
  androidCertSha1: googleMaps.androidCertSha1.replace(/:/g, '').toUpperCase(),
};
