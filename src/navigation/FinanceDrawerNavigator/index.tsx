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
import { FinanceBottomTabNavigator } from '../FinanceBottomTabNavigator';
import { FinanceHelpDeskStackNavigator } from '../FinanceHelpDeskStackNavigator';
import { FinancePayrollStackNavigator } from '../FinancePayrollStackNavigator';
import { Routes } from '../routes';
import type { FinanceDrawerParamList } from '../types';
import { FinanceDrawerContent } from './FinanceDrawerContent';

const Drawer = createDrawerNavigator<FinanceDrawerParamList>();

/**
 * mountainbakesFinance.html — the four finance roles' app shell
 * (finance_admin/finance_manager/accountant/finance_auditor). All 23 screens
 * scoped in `docs/mobile-finance-plan.md` are now built. Finance Help Desk
 * (21–22) is view/report/discuss/request-reopen only, per the owner's
 * decision — every super_admin-only admin action (edit a query, amend/
 * correct/delete the underlying record, restore, recreate, assign, change
 * status, truly reopen) stays web-only.
 */
export function FinanceDrawerNavigator() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }} drawerContent={(props) => <FinanceDrawerContent {...props} />}>
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
    </Drawer.Navigator>
  );
}
