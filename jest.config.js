module.exports = {
  preset: '@react-native/jest-preset',
  // These ship untranspiled ESM and must go through Babel too — the preset's
  // default ignore pattern only allows `react-native` itself through.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      [
        '@react-native',
        'react-native',
        '@react-navigation',
        'react-native-gesture-handler',
        'react-native-reanimated',
        'react-native-worklets',
        'react-native-screens',
        'react-native-safe-area-context',
        'react-native-svg',
        'react-native-bootsplash',
        'react-native-keychain',
        '@react-native-async-storage',
        '@react-native-community',
      ].join('|') +
      ')/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
