import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BAR_CONTENT_HEIGHT } from './tabBarLayout';

/**
 * The notch tab bar renders as a `position: 'absolute'` overlay (full-bleed,
 * flush to the screen edges, its own background filling the safe-area inset
 * behind the system nav bar / home indicator) rather than a normal flex
 * sibling that reserves its own space — see `NotchTabBar.tsx`. That means a
 * tab-root screen's own scrollable content sits *underneath* the bar unless
 * it adds this exact amount of bottom padding/inset itself, so its last item
 * isn't hidden behind the bar. Use on a `FlatList`/`FlashList`/`ScrollView`'s
 * `contentContainerStyle` (`paddingBottom`), not on the screen's outer view.
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return BAR_CONTENT_HEIGHT + insets.bottom;
}
