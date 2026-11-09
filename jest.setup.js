/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true }),
  ),
}));

jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn(() => Promise.resolve()),
}));

// op-sqlite is a native module; the auth store writes the signed-in user into
// it through `shared/offline/sessionCache`. An in-memory stand-in is enough —
// the tests assert the store's behaviour, not SQL.
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    executeSync: jest.fn(() => ({ rows: [] })),
    execute: jest.fn(() => Promise.resolve({ rows: [] })),
  })),
}));

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  const LinearGradient = props =>
    React.createElement(View, props, props.children);
  return { __esModule: true, default: LinearGradient };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const make = name => {
    const Component = props => React.createElement(View, props, props.children);
    Component.displayName = name;
    return Component;
  };
  const Svg = make('Svg');
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Path: make('Path'),
    Circle: make('Circle'),
    Line: make('Line'),
    Rect: make('Rect'),
    Defs: make('Defs'),
    Ellipse: make('Ellipse'),
    RadialGradient: make('RadialGradient'),
    Stop: make('Stop'),
  };
});

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock'),
);
