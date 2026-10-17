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
}));

jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn(() => Promise.resolve()),
}));

// The library's own documented Jest mock — `useSafeAreaInsets()`/
// `useSafeAreaFrame()` fall back to a fixed 320x640/zero-inset default when
// no `<SafeAreaProvider>` wraps the test (most component tests here don't
// bother), but still read a real `SafeAreaProvider` in the tree when one is
// present, so a test that does provide specific insets isn't short-circuited.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// react-native-reanimated v4's own packaged mock (`react-native-reanimated/mock`)
// transitively requires the real native `react-native-worklets` module even
// under Jest's "react-native" resolution condition, which crashes in this
// environment (no native bindings). A small hand-written stub — synchronous,
// no real animation — is enough for every usage in this codebase
// (useSharedValue/useAnimatedStyle/withTiming/interpolate/etc.), without
// pulling in reanimated's real native bootstrap at all.
// `@gorhom/bottom-sheet` reads a native constant at import time
// (`src/constants.ts`'s `IS_ANDROID`/`out` platform check) that crashes under
// Jest with no native modules mocked. Nothing under test actually renders a
// real bottom sheet, so a minimal forwardRef stub is enough to let anything
// that imports the `@/shared/ui` barrel (which re-exports `FormBottomSheet`)
// load in tests at all.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    BottomSheetModal: React.forwardRef((props, ref) => React.createElement(View, { ...props, ref })),
    BottomSheetScrollView: (props) => React.createElement(View, props, props.children),
    BottomSheetModalProvider: ({ children }) => children,
  };
});

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RN = require('react-native');

  function useSharedValue(initial) {
    const ref = React.useRef({ value: initial });
    return ref.current;
  }

  function useAnimatedStyle(worklet) {
    return worklet();
  }

  function useDerivedValue(worklet) {
    return { value: worklet() };
  }

  function useAnimatedScrollHandler(handlerOrObj) {
    const onScroll = typeof handlerOrObj === 'function' ? handlerOrObj : handlerOrObj.onScroll;
    return (event) => onScroll?.(event.nativeEvent);
  }

  function useReducedMotion() {
    return false;
  }

  function withTiming(toValue) {
    return toValue;
  }

  function withRepeat(toValue) {
    return toValue;
  }

  function withSpring(toValue) {
    return toValue;
  }

  function interpolate(value, input, output) {
    for (let i = 0; i < input.length - 1; i += 1) {
      if (value <= input[i + 1]) {
        const ratio = (value - input[i]) / (input[i + 1] - input[i] || 1);
        return output[i] + ratio * (output[i + 1] - output[i]);
      }
    }
    return output[output.length - 1];
  }

  function interpolateColor(value, input, output) {
    for (let i = 0; i < input.length - 1; i += 1) {
      if (value <= input[i + 1]) return output[i];
    }
    return output[output.length - 1];
  }

  const Animated = {
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
    createAnimatedComponent: (Component) => Component,
  };

  return {
    __esModule: true,
    default: Animated,
    useSharedValue,
    useAnimatedStyle,
    useDerivedValue,
    useAnimatedScrollHandler,
    useAnimatedRef: () => React.useRef(null),
    useReducedMotion,
    withTiming,
    withRepeat,
    withSpring,
    interpolate,
    interpolateColor,
    Extrapolation: { CLAMP: 'clamp' },
  };
});

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
  HapticFeedbackTypes: {},
}));
