import { createDrawerNavigator } from '@react-navigation/drawer';
import { comingSoonPane } from '@/features/placeholder';
import { ProductionBottomTabNavigator } from '../ProductionBottomTabNavigator';
import { ProductionDiscountsStackNavigator } from '../ProductionDiscountsStackNavigator';
import { ProductionReturnsStackNavigator } from '../ProductionReturnsStackNavigator';
import { Routes } from '../routes';
import type { ProductionDrawerParamList } from '../types';
import { ProductionDrawerContent } from './ProductionDrawerContent';

const Drawer = createDrawerNavigator<ProductionDrawerParamList>();

const ProductionEventsScreen = comingSoonPane('Special Events');
const ProductionReportsScreen = comingSoonPane('Production Reports');
const ProductionHelpDeskScreen = comingSoonPane('Help Desk');

/** mountainbakesProduction.html — the `production_user` app shell. */
export function ProductionDrawerNavigator() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }} drawerContent={(props) => <ProductionDrawerContent {...props} />}>
      <Drawer.Screen name={Routes.PRODUCTION_TABS} component={ProductionBottomTabNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_RETURNS_STACK} component={ProductionReturnsStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_DISCOUNTS_STACK} component={ProductionDiscountsStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_EVENTS_STACK} component={ProductionEventsScreen} />
      <Drawer.Screen name={Routes.PRODUCTION_REPORTS_STACK} component={ProductionReportsScreen} />
      <Drawer.Screen name={Routes.PRODUCTION_HELP_DESK_STACK} component={ProductionHelpDeskScreen} />
    </Drawer.Navigator>
  );
}
