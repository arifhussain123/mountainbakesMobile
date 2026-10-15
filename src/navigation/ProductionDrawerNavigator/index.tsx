import { createDrawerNavigator } from '@react-navigation/drawer';
import { ProductionReportsScreen } from '@/features/production';
import { ProductionBottomTabNavigator } from '../ProductionBottomTabNavigator';
import { ProductionDiscountsStackNavigator } from '../ProductionDiscountsStackNavigator';
import { ProductionEventsStackNavigator } from '../ProductionEventsStackNavigator';
import { ProductionHelpDeskStackNavigator } from '../ProductionHelpDeskStackNavigator';
import { ProductionReturnsStackNavigator } from '../ProductionReturnsStackNavigator';
import { Routes } from '../routes';
import type { ProductionDrawerParamList } from '../types';
import { ProductionDrawerContent } from './ProductionDrawerContent';

const Drawer = createDrawerNavigator<ProductionDrawerParamList>();

/** mountainbakesProduction.html — the `production_user` app shell. */
export function ProductionDrawerNavigator() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }} drawerContent={(props) => <ProductionDrawerContent {...props} />}>
      <Drawer.Screen name={Routes.PRODUCTION_TABS} component={ProductionBottomTabNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_RETURNS_STACK} component={ProductionReturnsStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_DISCOUNTS_STACK} component={ProductionDiscountsStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_EVENTS_STACK} component={ProductionEventsStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_REPORTS_STACK} component={ProductionReportsScreen} />
      <Drawer.Screen name={Routes.PRODUCTION_HELP_DESK_STACK} component={ProductionHelpDeskStackNavigator} />
    </Drawer.Navigator>
  );
}
