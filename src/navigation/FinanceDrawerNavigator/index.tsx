import { createDrawerNavigator } from '@react-navigation/drawer';
import { comingSoonPane } from '@/features/placeholder';
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
import { FinancePayrollStackNavigator } from '../FinancePayrollStackNavigator';
import { Routes } from '../routes';
import type { FinanceDrawerParamList } from '../types';
import { FinanceDrawerContent } from './FinanceDrawerContent';

const Drawer = createDrawerNavigator<FinanceDrawerParamList>();

const FinanceHelpDeskScreen = comingSoonPane('Finance Help Desk');

/**
 * mountainbakesFinance.html — the four finance roles' app shell
 * (finance_admin/finance_manager/accountant/finance_auditor). 23 screens are
 * scoped in `docs/mobile-finance-plan.md`. Dashboard (01), Daily Ledger (02,
 * view-only), Cash Transfers (03), Income & Expense (04–05), Payroll (06–11),
 * Partner Transactions (12–14), Company Transaction Details (15), Ledger
 * Heads (16–17), Daily Closing (18), Reports (19), Audit Trail (20) and
 * Settings (23) are built; only Finance Help Desk (21–22) is still a "coming
 * soon" placeholder, per the owner's decision to keep it view/discuss-only
 * and build it last.
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
      <Drawer.Screen name={Routes.FINANCE_HELP_DESK_STACK} component={FinanceHelpDeskScreen} />
      <Drawer.Screen name={Routes.FINANCE_SETTINGS_STACK} component={FinanceSettingsScreen} />
    </Drawer.Navigator>
  );
}
