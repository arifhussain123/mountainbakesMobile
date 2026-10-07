/* eslint-env jest */
/**
 * Jest setup — native module mocks.
 *
 * Anything backed by a TurboModule/Nitro HybridObject throws on `getEnforcing`
 * under Jest, because there is no native runtime. Libraries that ship their own
 * mock are used as-is; the rest are stubbed here with just enough behaviour for
 * logic tests to be meaningful (the MMKV stub is a real in-memory store, so code
 * that writes then reads still round-trips).
 */

require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// In-memory MMKV so storage round-trips behave like the real thing.
jest.mock('react-native-mmkv', () => {
  // Hung off globalThis so the data survives `jest.resetModules()`. Tests that
  // simulate a cold start re-require a module to watch what it reads at import
  // time; a per-factory Map would be wiped by the reset and every such test
  // would see an empty store no matter what it had just written.
  const stores = global.__mmkvStores ?? (global.__mmkvStores = new Map());
  return {
    createMMKV: ({ id }) => {
      if (!stores.has(id)) stores.set(id, new Map());
      const store = stores.get(id);
      return {
        id,
        set: (k, v) => store.set(k, v),
        getString: k => (typeof store.get(k) === 'string' ? store.get(k) : undefined),
        getBoolean: k => (typeof store.get(k) === 'boolean' ? store.get(k) : undefined),
        getNumber: k => (typeof store.get(k) === 'number' ? store.get(k) : undefined),
        contains: k => store.has(k),
        remove: k => store.delete(k),
        getAllKeys: () => Array.from(store.keys()),
        clearAll: () => store.clear(),
      };
    },
    existsMMKV: () => false,
    deleteMMKV: () => true,
  };
});

// op-sqlite is JSI-backed and has no Jest runtime. The migration runner is
// tested separately against a fake DB in src/database/__tests__/runMigrations,
// so this stub only needs to keep imports resolvable.
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    executeSync: jest.fn(() => ({ rows: [] })),
    execute: jest.fn(async () => ({ rows: [] })),
    executeBatch: jest.fn(async () => ({ rowsAffected: 0 })),
    transaction: jest.fn(async fn => fn({ execute: jest.fn(async () => ({ rows: [] })) })),
    close: jest.fn(),
    delete: jest.fn(),
  })),
  openAsync: jest.fn(),
  ANDROID_DATABASE_PATH: '/data/data/test/databases',
  IOS_LIBRARY_PATH: '/tmp',
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AfterFirstUnlockThisDeviceOnly' },
  getGenericPassword: jest.fn(async () => false),
  setGenericPassword: jest.fn(async () => true),
  resetGenericPassword: jest.fn(async () => true),
}));

// The date picker is a native view; under Jest it only needs to be renderable
// and to hand back a chosen date when a test fires `onChange`.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: props => React.createElement(View, { ...props, testID: props.testID }),
  };
});

jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn(async () => {}),
  isVisible: jest.fn(async () => false),
  useHideAnimation: jest.fn(),
}));

// react-native-config reads .env at build time; tests get fixed values so a
// developer's local .env cannot change what the suite asserts.
/**
 * The camera / photo picker. Native on both ends, so there is nothing to run:
 * each call resolves a cancel by default, which is the answer that changes no
 * state, and a suite that needs a photo or an error code sets its own with
 * `mockResolvedValueOnce`.
 */
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({ didCancel: true })),
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

/**
 * File access, as an in-memory set of paths.
 *
 * Enough of `fs` for the return-photo store — `exists`, `mkdir`, `cp`,
 * `unlink`, `stat` — backed by a Set on `global` so a test can seed a file or
 * assert one was removed (`global.__blobFiles`). Anything else on the module is
 * left out on purpose: a call to it should fail loudly rather than pretend.
 */
jest.mock('react-native-blob-util', () => {
  const files = global.__blobFiles ?? (global.__blobFiles = new Set());
  const strip = p => String(p).replace(/^file:\/\//, '');
  const fs = {
    dirs: { DocumentDir: '/data/user/0/test/files', CacheDir: '/data/user/0/test/cache' },
    exists: jest.fn(async p => files.has(strip(p))),
    mkdir: jest.fn(async p => {
      files.add(strip(p));
    }),
    cp: jest.fn(async (from, to) => {
      if (!files.has(strip(from))) throw new Error(`ENOENT: ${from}`);
      files.add(strip(to));
    }),
    unlink: jest.fn(async p => {
      files.delete(strip(p));
    }),
    stat: jest.fn(async p => {
      if (!files.has(strip(p))) throw new Error(`ENOENT: ${p}`);
      return { size: 0, path: strip(p) };
    }),
  };
  const mod = { fs, config: jest.fn(() => ({ fetch: jest.fn() })) };
  return { __esModule: true, default: mod, ...mod };
});

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    ENVIRONMENT: 'development',
    API_URL: 'http://localhost:3001',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SENTRY_DSN: '',
  },
}));

// crypto.getRandomValues is installed by a polyfill at app entry, which tests
// bypass. Deterministic-but-varying bytes are fine here.
if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = arr => {
    for (let i = 0; i < arr.length; i++) arr[i] = (i * 37 + 11) % 256;
    return arr;
  };
}

