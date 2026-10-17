module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: { '@': './src' },
        extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.jsx', '.js', '.json'],
      },
    ],
    // zod v4 ships `export * as core from './core/index.js'` (the ES2020
    // "export namespace from" syntax) in its own untranspiled source, and
    // `@react-native/babel-preset` doesn't include this plugin — without it,
    // Metro's transform throws a SyntaxError on that file (a 500 from the dev
    // server), the JS bundle never loads, and the app sits on the native
    // bootsplash forever since nothing ever runs to call `BootSplash.hide()`.
    // Already a resolved transitive dependency (see package-lock.json); this
    // just wires it into this project's own plugin list.
    '@babel/plugin-transform-export-namespace-from',
    // Must stay last.
    'react-native-reanimated/plugin',
  ],
};
