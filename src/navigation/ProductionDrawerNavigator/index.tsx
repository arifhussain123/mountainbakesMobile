import { createDrawerNavigator } from '@react-navigation/drawer';
import { ProductionReportsScreen } from '@/features/production';
import { ProfileScreen } from '@/features/profile';
import { DrawerContent } from '../DrawerNavigator/DrawerContent';
import { ProductionBottomTabNavigator } from '../ProductionBottomTabNavigator';
import { ProductionDiscountsStackNavigator } from '../ProductionDiscountsStackNavigator';
import { ProductionEventsStackNavigator } from '../ProductionEventsStackNavigator';
import { ProductionHelpDeskStackNavigator } from '../ProductionHelpDeskStackNavigator';
import { ProductionSalesStackNavigator } from '../ProductionSalesStackNavigator';
import { Routes } from '../routes';
import type { ProductionDrawerParamList } from '../types';
import { withDrawerScreenCard } from '../components/withDrawerScreenCard';
import { useProductionNavCounts } from './useProductionNavCounts';

const Drawer = createDrawerNavigator<ProductionDrawerParamList>();

// Module scope, same reason as `DrawerNavigator` — see `withDrawerScreenCard`.
const TabsWithCard = withDrawerScreenCard(ProductionBottomTabNavigator);
const SalesStackWithCard = withDrawerScreenCard(ProductionSalesStackNavigator);
const DiscountsStackWithCard = withDrawerScreenCard(ProductionDiscountsStackNavigator);
const EventsStackWithCard = withDrawerScreenCard(ProductionEventsStackNavigator);
const ReportsWithCard = withDrawerScreenCard(ProductionReportsScreen);
const HelpDeskStackWithCard = withDrawerScreenCard(ProductionHelpDeskStackNavigator);
const ProfileWithCard = withDrawerScreenCard(ProfileScreen);

/**
 * mountainbakesProduction.html — the `production_user` app shell. Same
 * slide-back drawer as the Branch shell (`DrawerContent`, see `DrawerNavigator`
 * for the `drawerType: 'back'` reasoning); what it lists comes from
 * `PRODUCTION_NAV_ITEMS` through the role's shell, so the two roles share the
 * chrome and never each other's screens. Every Production screen is registered
 * here or in `ProductionBottomTabNavigator`, and none of the Branch ones.
 */
export function ProductionDrawerNavigator() {
  useProductionNavCounts();

  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false, drawerType: 'back', drawerStyle: { width: '100%', backgroundColor: 'transparent' }, overlayColor: 'transparent' }}
      drawerContent={(props) => <DrawerContent {...props} />}>
      <Drawer.Screen name={Routes.PRODUCTION_TABS} component={TabsWithCard} />
      <Drawer.Screen name={Routes.PRODUCTION_SALES_STACK} component={SalesStackWithCard} />
      <Drawer.Screen name={Routes.PRODUCTION_DISCOUNTS_STACK} component={DiscountsStackWithCard} />
      <Drawer.Screen name={Routes.PRODUCTION_EVENTS_STACK} component={EventsStackWithCard} />
      <Drawer.Screen name={Routes.PRODUCTION_REPORTS_STACK} component={ReportsWithCard} />
      <Drawer.Screen name={Routes.PRODUCTION_HELP_DESK_STACK} component={HelpDeskStackWithCard} />
      <Drawer.Screen name={Routes.PROFILE} component={ProfileWithCard} />
    </Drawer.Navigator>
  );
}
