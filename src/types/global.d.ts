/**
 * Ambient declarations for polyfills installed at app entry (index.js).
 *
 * React Native's TS config does not include the DOM lib, so these globals have no
 * types even though they exist at runtime.
 */

declare global {
  /**
   * Provided by `react-native-get-random-values`, imported first in index.js.
   * Only `getRandomValues` is polyfilled — the rest of the WebCrypto surface is
   * absent, so it is deliberately not declared here.
   */
  const crypto: {
    getRandomValues<T extends ArrayBufferView>(array: T): T;
  };
}

export {};
