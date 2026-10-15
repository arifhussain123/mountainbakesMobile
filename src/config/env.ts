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
};
