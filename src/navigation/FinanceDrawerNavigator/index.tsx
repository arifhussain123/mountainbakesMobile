import { createDrawerNavigator } from '@react-navigation/drawer';
import { comingSoonPane } from '@/features/placeholder';
import { FinanceAuditTrailScreen, FinanceReportsScreen, FinanceSettingsScreen } from '@/features/finance';
import { FinanceBottomTabNavigator } from '../FinanceBottomTabNavigator';
import { Routes } from '../routes';
import type { FinanceDrawerParamList } from '../types';
import { FinanceDrawerContent } from './FinanceDrawerContent';

const Drawer = createDrawerNavigator<FinanceDrawerParamList>();

const FinancePayrollScreen = comingSoonPane('Payroll');
const FinancePartnersScreen = comingSoonPane('Partner Transactions');
const FinanceCompanyTransactionDetailsScreen = comingSoonPane('Company Transaction Details');
const FinanceLedgerHeadsScreen = comingSoonPane('Ledger Heads');
const FinanceClosingScreen = comingSoonPane('Daily Closing');
const FinanceHelpDeskScreen = comingSoonPane('Finance Help Desk');

/**
 * mountainbakesFinance.html — the four finance roles' app shell
 * (finance_admin/finance_manager/accountant/finance_auditor). 23 screens are
 * scoped in `docs/mobile-finance-plan.md`. Dashboard (01), Daily Ledger (02,
 * view-only), Reports (19), Audit Trail (20) and Settings (23) are built;
 * everything else is a "coming soon" placeholder wired into real navigation so
 * every area is reachable and ready for its own slice.
 */
export function FinanceDrawerNavigator() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }} drawerContent={(props) => <FinanceDrawerContent {...props} />}>
      <Drawer.Screen name={Routes.FINANCE_TABS} component={FinanceBottomTabNavigator} />
      <Drawer.Screen name={Routes.FINANCE_PAYROLL_STACK} component={FinancePayrollScreen} />
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
