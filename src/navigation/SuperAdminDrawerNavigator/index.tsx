import { createDrawerNavigator } from '@react-navigation/drawer';
import {
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
import {
  FinanceAuditTrailScreen,
  FinanceClosingScreen,
  FinanceCompanyTransactionDetailsScreen,
  FinanceIncomeExpenseListScreen,
  FinanceLedgerHeadsScreen,
  FinancePartnersScreen,
  FinanceReportsScreen,
  FinanceSettingsScreen,
} from '@/features/finance';
import { ProfileScreen } from '@/features/profile';
import { DrawerContent } from '../DrawerNavigator/DrawerContent';
import { FinanceCashTransfersStackNavigator } from '../FinanceCashTransfersStackNavigator';
import { FinancePayrollStackNavigator } from '../FinancePayrollStackNavigator';
import { PriceHistoryStackNavigator } from '../PriceHistoryStackNavigator';
import { RecipientsStackNavigator } from '../RecipientsStackNavigator';
import { Routes } from '../routes';
import { SuperAdminBottomTabNavigator } from '../SuperAdminBottomTabNavigator';
import { SuperAdminDailySaleStackNavigator } from '../SuperAdminDailySaleStackNavigator';
import { SuperAdminEventsStackNavigator } from '../SuperAdminEventsStackNavigator';
import { SuperAdminLedgerStackNavigator } from '../SuperAdminLedgerStackNavigator';
import { SuperAdminSettingsStackNavigator } from '../SuperAdminSettingsStackNavigator';
import { SuperAdminSupportStackNavigator } from '../SuperAdminSupportStackNavigator';
import type { SuperAdminDrawerParamList } from '../types';
import { useDrawerScreenOptions } from '../components';
import { useSuperAdminNavCounts } from './useSuperAdminNavCounts';

const Drawer = createDrawerNavigator<SuperAdminDrawerParamList>();

/**
 * Super Admin's app shell. Same drawer as every other role (`DrawerContent` →
 * `DrawerMenu`), with `SUPER_ADMIN_NAV_ITEMS` through the role's shell and its
 * sections folding (`collapsibleSections`). Every screen behind it is Super
 * Admin's own (`features/admin`), built to show what the web Super Admin
 * page shows — plus the web's other finance pages a super_admin may open
 * (`canAccessFinance`), which are the Finance role's own screens: they read
 * Finance Settings' "Allow Super Admin to modify" (`useFinanceCan`), so they
 * are read-only for super_admin until that toggle is on, as on the web.
 */
export function SuperAdminDrawerNavigator() {
  const screenOptions = useDrawerScreenOptions();
  useSuperAdminNavCounts();

  return (
    <Drawer.Navigator screenOptions={screenOptions} drawerContent={(props) => <DrawerContent {...props} />}>
      <Drawer.Screen name={Routes.SUPER_ADMIN_TABS} component={SuperAdminBottomTabNavigator} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_CUSTOMERS} component={CustomersScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_DAILY_SALE} component={SuperAdminDailySaleStackNavigator} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_PRODUCTS} component={ProductsScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_CATEGORIES} component={CategoriesScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_PRICE_LIST} component={PriceListScreen} />
      <Drawer.Screen name={Routes.PRICE_HISTORY_STACK} component={PriceHistoryStackNavigator} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_BRANCHES} component={BranchesScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_BRANCH_LOCATIONS} component={BranchLocationsScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_EVENTS_STACK} component={SuperAdminEventsStackNavigator} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_LEDGER_STACK} component={SuperAdminLedgerStackNavigator} />
      <Drawer.Screen name={Routes.FINANCE_CASH_TRANSFERS_STACK} component={FinanceCashTransfersStackNavigator} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_FINANCE_ENTRIES} component={FinanceIncomeExpenseListScreen} />
      <Drawer.Screen name={Routes.FINANCE_CLOSING_STACK} component={FinanceClosingScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_FINANCE_PAYROLL_STACK} component={FinancePayrollStackNavigator} />
      <Drawer.Screen name={Routes.FINANCE_PARTNERS_STACK} component={FinancePartnersScreen} />
      <Drawer.Screen name={Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK} component={FinanceCompanyTransactionDetailsScreen} />
      <Drawer.Screen name={Routes.FINANCE_LEDGER_HEADS_STACK} component={FinanceLedgerHeadsScreen} />
      <Drawer.Screen name={Routes.FINANCE_REPORTS_STACK} component={FinanceReportsScreen} />
      <Drawer.Screen name={Routes.FINANCE_AUDIT_TRAIL_STACK} component={FinanceAuditTrailScreen} />
      <Drawer.Screen name={Routes.FINANCE_SETTINGS_STACK} component={FinanceSettingsScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_SUPPORT_STACK} component={SuperAdminSupportStackNavigator} />
      <Drawer.Screen name={Routes.RECIPIENTS_STACK} component={RecipientsStackNavigator} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_USERS} component={UsersScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_SECURITY} component={SecurityScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_BACKUP} component={BackupScreen} />
      <Drawer.Screen name={Routes.SUPER_ADMIN_SETTINGS} component={SuperAdminSettingsStackNavigator} />
      <Drawer.Screen name={Routes.PROFILE} component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
