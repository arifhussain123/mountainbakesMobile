import { createDrawerNavigator } from '@react-navigation/drawer';
import { ProductionReportsScreen } from '@/features/production';
import { ProfileScreen } from '@/features/profile';
import { DrawerContent } from '../DrawerNavigator/DrawerContent';
import { ProductionBottomTabNavigator } from '../ProductionBottomTabNavigator';
import { ProductionDiscountsStackNavigator } from '../ProductionDiscountsStackNavigator';
import { ProductionEventsStackNavigator } from '../ProductionEventsStackNavigator';
import { ProductionHelpDeskStackNavigator } from '../ProductionHelpDeskStackNavigator';
import { ProductionSalesStackNavigator } from '../ProductionSalesStackNavigator';
import { ProductionWhatsAppStackNavigator } from '../ProductionWhatsAppStackNavigator';
import { Routes } from '../routes';
import type { ProductionDrawerParamList } from '../types';
import { useDrawerScreenOptions } from '../components';
import { useProductionNavCounts } from './useProductionNavCounts';

const Drawer = createDrawerNavigator<ProductionDrawerParamList>();

/**
 * mountainbakesProduction.html — the `production_user` app shell. Same
 * drawer as the Branch shell (`DrawerContent` + `useDrawerScreenOptions`);
 * what it lists comes from
 * `PRODUCTION_NAV_ITEMS` through the role's shell, so the two roles share the
 * chrome and never each other's screens. Every Production screen is registered
 * here or in `ProductionBottomTabNavigator`, and none of the Branch ones.
 */
export function ProductionDrawerNavigator() {
  useProductionNavCounts();
  const screenOptions = useDrawerScreenOptions();

  return (
    <Drawer.Navigator
      screenOptions={screenOptions}
      drawerContent={(props) => <DrawerContent {...props} />}>
      <Drawer.Screen name={Routes.PRODUCTION_TABS} component={ProductionBottomTabNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_SALES_STACK} component={ProductionSalesStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_DISCOUNTS_STACK} component={ProductionDiscountsStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_EVENTS_STACK} component={ProductionEventsStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_WHATSAPP_STACK} component={ProductionWhatsAppStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_REPORTS_STACK} component={ProductionReportsScreen} />
      <Drawer.Screen name={Routes.PRODUCTION_HELP_DESK_STACK} component={ProductionHelpDeskStackNavigator} />
      <Drawer.Screen name={Routes.PROFILE} component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
