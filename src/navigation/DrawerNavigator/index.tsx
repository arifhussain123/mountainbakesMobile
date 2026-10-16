import { useWindowDimensions } from 'react-native';
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
import { getDrawerWidth } from '../components/drawerLayout';
import { DrawerContent } from './DrawerContent';

const Drawer = createDrawerNavigator<DrawerParamList>();

export function DrawerNavigator() {
  // Re-evaluated on every render, so a rotation (width change) immediately
  // recomputes the clamp rather than sticking to whatever width the drawer
  // first mounted at.
  const { width } = useWindowDimensions();

  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false, drawerStyle: { width: getDrawerWidth(width) } }}
      drawerContent={(props) => <DrawerContent {...props} />}>
      <Drawer.Screen name={Routes.TABS} component={BottomTabNavigator} />
      <Drawer.Screen name={Routes.DISCOUNTS_STACK} component={DiscountsStackNavigator} />
      <Drawer.Screen name={Routes.CASH_STACK} component={CashStackNavigator} />
      <Drawer.Screen name={Routes.EXPENSES_STACK} component={ExpensesStackNavigator} />
      <Drawer.Screen name={Routes.EVENTS_STACK} component={EventsStackNavigator} />
      <Drawer.Screen name={Routes.CLOSING_STACK} component={ClosingStackNavigator} />
      <Drawer.Screen name={Routes.REPORTS_STACK} component={ReportsStackNavigator} />
      <Drawer.Screen name={Routes.HELP_DESK_STACK} component={HelpDeskStackNavigator} />
      <Drawer.Screen name={Routes.PROFILE} component={ProfileScreen} />
      <Drawer.Screen name={Routes.SETTINGS} component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
