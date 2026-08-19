module.exports = {
  presets: ['module:@react-native/babel-preset'],
  env: {
    production: {
      // Strip console.* from release builds. A stray log can leak a customer
      // phone number or a token fragment into logcat, which is readable by any
      // app with READ_LOGS on an older device. `error` is kept so genuine
      // failures still reach a crash reporter.
      plugins: [['transform-remove-console', { exclude: ['error'] }]],
    },
  },
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: { '@': './src' },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    // react-native-worklets/plugin must stay LAST. Reanimated 4 compiles its
    // worklets through it, and any plugin listed after it sees already-rewritten
    // code and silently breaks animations.
    'react-native-worklets/plugin',
  ],
};
