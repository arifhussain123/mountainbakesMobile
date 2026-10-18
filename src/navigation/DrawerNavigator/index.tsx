import { createDrawerNavigator } from '@react-navigation/drawer';
import { ProfileScreen, SettingsScreen } from '@/features/profile';
import { CashStackNavigator } from '../CashStackNavigator';
import { ClosingStackNavigator } from '../ClosingStackNavigator';
import { DiscountsStackNavigator } from '../DiscountsStackNavigator';
import { EventsStackNavigator } from '../EventsStackNavigator';
import { ExpensesStackNavigator } from '../ExpensesStackNavigator';
import { HelpDeskStackNavigator } from '../HelpDeskStackNavigator';
import { ReportsStackNavigator } from '../ReportsStackNavigator';
import { BottomTabNavigator } from '../BottomTabNavigator';
import { Routes } from '../routes';
import type { DrawerParamList } from '../types';
import { withDrawerScreenCard } from '../components/withDrawerScreenCard';
import { DrawerContent } from './DrawerContent';

const Drawer = createDrawerNavigator<DrawerParamList>();

// Wrapped once, at module scope — see `withDrawerScreenCard`'s own note on
// why an inline `withDrawerScreenCard(X)` in JSX would remount every screen
// on every `DrawerNavigator` re-render instead.
const TabsWithCard = withDrawerScreenCard(BottomTabNavigator);
const DiscountsStackWithCard = withDrawerScreenCard(DiscountsStackNavigator);
const CashStackWithCard = withDrawerScreenCard(CashStackNavigator);
const ExpensesStackWithCard = withDrawerScreenCard(ExpensesStackNavigator);
const EventsStackWithCard = withDrawerScreenCard(EventsStackNavigator);
const ClosingStackWithCard = withDrawerScreenCard(ClosingStackNavigator);
const ReportsStackWithCard = withDrawerScreenCard(ReportsStackNavigator);
const HelpDeskStackWithCard = withDrawerScreenCard(HelpDeskStackNavigator);
const ProfileWithCard = withDrawerScreenCard(ProfileScreen);
const SettingsWithCard = withDrawerScreenCard(SettingsScreen);

/**
 * `drawerType: 'back'` — the menu stays fixed behind, full-bleed; the
 * SCREEN is what animates (slides/scales/tilts/blurs — see
 * `DrawerScreenCard`, applied around each screen below). `drawerStyle`
 * width is the full screen: the menu's own content constrains itself to
 * ~66% internally (see `drawerLayout.ts#MENU_CONTENT_WIDTH_RATIO`) so it's
 * never hidden under the tilted screen card, while its background (glow +
 * watermark) still fills the whole revealed area. `overlayColor:
 * 'transparent'` defers to `DrawerScreenCard`'s own blur+tint overlay
 * instead of the library's flat dim (same reasoning as the previous
 * drawer's blur pass — see git history on this file).
 */
export function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false, drawerType: 'back', drawerStyle: { width: '100%', backgroundColor: 'transparent' }, overlayColor: 'transparent' }}
      drawerContent={(props) => <DrawerContent {...props} />}>
      <Drawer.Screen name={Routes.TABS} component={TabsWithCard} />
      <Drawer.Screen name={Routes.DISCOUNTS_STACK} component={DiscountsStackWithCard} />
      <Drawer.Screen name={Routes.CASH_STACK} component={CashStackWithCard} />
      <Drawer.Screen name={Routes.EXPENSES_STACK} component={ExpensesStackWithCard} />
      <Drawer.Screen name={Routes.EVENTS_STACK} component={EventsStackWithCard} />
      <Drawer.Screen name={Routes.CLOSING_STACK} component={ClosingStackWithCard} />
      <Drawer.Screen name={Routes.REPORTS_STACK} component={ReportsStackWithCard} />
      <Drawer.Screen name={Routes.HELP_DESK_STACK} component={HelpDeskStackWithCard} />
      <Drawer.Screen name={Routes.PROFILE} component={ProfileWithCard} />
      <Drawer.Screen name={Routes.SETTINGS} component={SettingsWithCard} />
    </Drawer.Navigator>
  );
}
