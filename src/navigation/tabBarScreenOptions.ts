import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { Theme } from '@/shared/theme';

/**
 * The bottom-tab chrome every tab shell (Branch/Production/Finance) shares —
 * `design UIandUX/mountainbakesBranch.html`'s own nav bar (its `tabs()` helper,
 * ~line 1289): a 62px glass pill, rounded 24px, near-black translucent fill,
 * active label/icon in the accent orange and inactive in `textFaint` (its
 * `#857B73`) — not `textSecondary`, which earlier screens had used here and
 * which reads a shade too light next to the design's own inactive tabs.
 *
 * The design's `backdrop-filter: blur(12px)` glass has no equivalent here —
 * this app carries no blur library — so it is approximated with a flatter,
 * slightly more opaque fill (`.94` vs the design's `.88`) rather than adding a
 * native dependency for one effect. Only `tabBarIcon` is left for each
 * navigator to supply, since each shell's tabs mean something different.
 */
export function tabBarScreenOptions(theme: Theme): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textFaint,
    tabBarStyle: {
      backgroundColor: 'rgba(12,13,20,0.94)',
      borderTopWidth: 1,
      borderTopColor: theme.colors.cardBorder,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: 62,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '700',
      marginTop: 2,
    },
  };
}
