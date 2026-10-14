import { View } from 'react-native';

/** Never actually shown — its tab's `tabPress` is always intercepted. See BottomTabNavigator. */
export function NoopScreen() {
  return <View />;
}
