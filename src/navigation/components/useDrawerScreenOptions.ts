import { useWindowDimensions } from 'react-native';
import type { DrawerNavigationOptions } from '@react-navigation/drawer';
import { useAppTheme } from '@/shared/theme';
import { getDrawerWidth } from './drawerLayout';

/**
 * `screenOptions` shared by every role's drawer navigator (Branch, Production,
 * Finance), so the three can't drift apart. Width is `min(78%, 300)` and is
 * re-read on every render, so a rotation updates it immediately.
 */
export function useDrawerScreenOptions(): DrawerNavigationOptions {
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  return {
    headerShown: false,
    drawerType: 'front',
    drawerStyle: { width: getDrawerWidth(width), backgroundColor: theme.colors.background },
  };
}
