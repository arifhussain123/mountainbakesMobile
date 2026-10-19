import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  AdminDailySaleScreen,
  AdminSettingsScreen,
  BackupScreen,
  BranchesScreen,
  BranchLocationsScreen,
  CategoriesScreen,
  CustomersScreen,
  PriceListScreen,
  ProductsScreen,
  SecurityScreen,
  UsersScreen,
} from '@/features/admin';
import { ProfileScreen } from '@/features/profile';
import { DrawerContent } from '../DrawerNavigator/DrawerContent';
import { FinanceLedgerStackNavigator } from '../FinanceLedgerStackNavigator';
import { HelpDeskStackNavigator } from '../HelpDeskStackNavigator';
import { PriceHistoryStackNavigator } from '../PriceHistoryStackNavigator';
import { ProductionEventsStackNavigator } from '../ProductionEventsStackNavigator';
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
 * sections folding (`collapsibleSections`). Special Events, Finance Ledger and
 * Support Center reuse Production's, Finance's and the branch's stacks; the
 * catalogue, branch, user and system screens are Super Admin's own read-only
 * lists (`features/admin`).
 */
export function SuperAdminDrawerNavigator() {
  const screenOptions = useDrawerScreenOptions();
  useSuperAdminNavCounts();

  return (
    <Drawer.Navigator screenOptions={screenOptions} drawerContent={(props) => <DrawerContent {...props} />}>
      <Drawer.Screen name={Routes.SUPER_ADMIN_TABS} component={SuperAdminBottomTabNavigator} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_CUSTOMERS} component={CustomersScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_DAILY_SALE} component={AdminDailySaleScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_PRODUCTS} component={ProductsScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_CATEGORIES} component={CategoriesScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_PRICE_LIST} component={PriceListScreen} />
      <Drawer.Screen name={Routes.PRICE_HISTORY_STACK} component={PriceHistoryStackNavigator} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_BRANCHES} component={BranchesScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_BRANCH_LOCATIONS} component={BranchLocationsScreen} />
      <Drawer.Screen name={Routes.PRODUCTION_EVENTS_STACK} component={ProductionEventsStackNavigator} />
      <Drawer.Screen name={Routes.FINANCE_LEDGER_STACK} component={FinanceLedgerStackNavigator} />
      <Drawer.Screen name={Routes.HELP_DESK_STACK} component={HelpDeskStackNavigator} />
      <Drawer.Screen name={Routes.RECIPIENTS_STACK} component={RecipientsStackNavigator} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_USERS} component={UsersScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_SECURITY} component={SecurityScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_BACKUP} component={BackupScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_SETTINGS} component={AdminSettingsScreen} />
      <Drawer.Screen name={Routes.PROFILE} component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
