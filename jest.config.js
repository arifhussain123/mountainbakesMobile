module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // See jest/lucideIconStub.js for why icons are stubbed rather than loaded.
    '^lucide-react-native/icons/.*$': '<rootDir>/jest/lucideIconStub.js',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Reanimated 4 loads worklets through `.native` entrypoints that call into a
  // native module and throw under Jest. This resolver, shipped by
  // react-native-worklets, strips the `.native` extension so the plain
  // implementation resolves instead.
  resolver: 'react-native-worklets/jest/resolver.js',
  // The default preset only whitelists react-native itself. These ship
  // untranspiled ESM/Flow and fail to parse without it.
  transformIgnorePatterns: [
    // `lucide-react-native` is listed explicitly: it ships ESM, and the
    // `react-native-.*` alternative above does not match it — the package name
    // starts with `lucide-`, not `react-native-`.
    'node_modules/(?!(?:@react-native|react-native|@react-navigation|react-native-.*|lucide-react-native|@shopify/.*|@gorhom/.*|victory-native|uuid)/)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/shared/**', '!src/**/*.d.ts'],
};
