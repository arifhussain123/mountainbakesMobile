import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  FinanceAuditTrailScreen,
  FinanceClosingScreen,
  FinanceCompanyTransactionDetailsScreen,
  FinanceLedgerHeadsScreen,
  FinancePartnersScreen,
  FinanceReportsScreen,
  FinanceSettingsScreen,
} from '@/features/finance';
import { ProfileScreen } from '@/features/profile';
import { DrawerContent } from '../DrawerNavigator/DrawerContent';
import { FinanceBottomTabNavigator } from '../FinanceBottomTabNavigator';
import { FinanceHelpDeskStackNavigator } from '../FinanceHelpDeskStackNavigator';
import { FinancePayrollStackNavigator } from '../FinancePayrollStackNavigator';
import { Routes } from '../routes';
import type { FinanceDrawerParamList } from '../types';
import { useDrawerScreenOptions } from '../components/useDrawerScreenOptions';
import { useFinanceNavCounts } from './useFinanceNavCounts';

const Drawer = createDrawerNavigator<FinanceDrawerParamList>();

/**
 * mountainbakesFinance.html — the four finance roles' app shell
 * (finance_admin/finance_manager/accountant/finance_auditor). Same drawer as
 * the Branch and Production shells (`DrawerContent` → `DrawerMenu`); its menu
 * is `FINANCE_NAV_ITEMS` through the role's shell. Finance Help Desk (21–22) is
 * view/report/discuss/request-reopen only, per the owner's decision — every
 * super_admin-only admin action stays web-only.
 */
export function FinanceDrawerNavigator() {
  const screenOptions = useDrawerScreenOptions();
  useFinanceNavCounts();

  return (
    <Drawer.Navigator screenOptions={screenOptions} drawerContent={(props) => <DrawerContent {...props} />}>
      <Drawer.Screen name={Routes.FINANCE_TABS} component={FinanceBottomTabNavigator} />
      <Drawer.Screen name={Routes.FINANCE_PAYROLL_STACK} component={FinancePayrollStackNavigator} />
      <Drawer.Screen name={Routes.FINANCE_PARTNERS_STACK} component={FinancePartnersScreen} />
      <Drawer.Screen name={Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK} component={FinanceCompanyTransactionDetailsScreen} />
      <Drawer.Screen name={Routes.FINANCE_LEDGER_HEADS_STACK} component={FinanceLedgerHeadsScreen} />
      <Drawer.Screen name={Routes.FINANCE_CLOSING_STACK} component={FinanceClosingScreen} />
      <Drawer.Screen name={Routes.FINANCE_REPORTS_STACK} component={FinanceReportsScreen} />
      <Drawer.Screen name={Routes.FINANCE_AUDIT_TRAIL_STACK} component={FinanceAuditTrailScreen} />
      <Drawer.Screen name={Routes.FINANCE_HELP_DESK_STACK} component={FinanceHelpDeskStackNavigator} />
      <Drawer.Screen name={Routes.FINANCE_SETTINGS_STACK} component={FinanceSettingsScreen} />
      <Drawer.Screen name={Routes.PROFILE} component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
