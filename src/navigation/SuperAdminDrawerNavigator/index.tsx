import { createDrawerNavigator } from '@react-navigation/drawer';
import { ProfileScreen } from '@/features/profile';
import { DrawerContent } from '../DrawerNavigator/DrawerContent';
import { PriceHistoryStackNavigator } from '../PriceHistoryStackNavigator';
import { RecipientsStackNavigator } from '../RecipientsStackNavigator';
import { Routes } from '../routes';
import { SuperAdminBottomTabNavigator } from '../SuperAdminBottomTabNavigator';
import type { SuperAdminDrawerParamList } from '../types';
import { useDrawerScreenOptions } from '../components';
import { useSuperAdminNavCounts } from './useSuperAdminNavCounts';

const Drawer = createDrawerNavigator<SuperAdminDrawerParamList>();

/**
 * Super Admin's app shell. Same drawer as every other role (`DrawerContent` →
 * `DrawerMenu`), with `SUPER_ADMIN_NAV_ITEMS` through the role's shell and its
 * sections folding (`collapsibleSections`). Screens not yet built open Coming
 * Soon from the drawer, so only the tabs, Price History, Recipients and
 * Profile are mounted here.
 */
export function SuperAdminDrawerNavigator() {
  const screenOptions = useDrawerScreenOptions();
  useSuperAdminNavCounts();

  return (
    <Drawer.Navigator screenOptions={screenOptions} drawerContent={(props) => <DrawerContent {...props} />}>
      <Drawer.Screen name={Routes.SUPER_ADMIN_TABS} component={SuperAdminBottomTabNavigator} />
      <Drawer.Screen name={Routes.PRICE_HISTORY_STACK} component={PriceHistoryStackNavigator} />
      <Drawer.Screen name={Routes.RECIPIENTS_STACK} component={RecipientsStackNavigator} />
      <Drawer.Screen name={Routes.PROFILE} component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
