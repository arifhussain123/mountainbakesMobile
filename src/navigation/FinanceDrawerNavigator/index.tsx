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
import { withDrawerScreenCard } from '../components/withDrawerScreenCard';
import { useFinanceNavCounts } from './useFinanceNavCounts';

const Drawer = createDrawerNavigator<FinanceDrawerParamList>();

// Module scope, same reason as `DrawerNavigator` — see `withDrawerScreenCard`.
const TabsWithCard = withDrawerScreenCard(FinanceBottomTabNavigator);
const PayrollStackWithCard = withDrawerScreenCard(FinancePayrollStackNavigator);
const PartnersWithCard = withDrawerScreenCard(FinancePartnersScreen);
const CompanyTransactionsWithCard = withDrawerScreenCard(FinanceCompanyTransactionDetailsScreen);
const LedgerHeadsWithCard = withDrawerScreenCard(FinanceLedgerHeadsScreen);
const ClosingWithCard = withDrawerScreenCard(FinanceClosingScreen);
const ReportsWithCard = withDrawerScreenCard(FinanceReportsScreen);
const AuditTrailWithCard = withDrawerScreenCard(FinanceAuditTrailScreen);
const HelpDeskStackWithCard = withDrawerScreenCard(FinanceHelpDeskStackNavigator);
const SettingsWithCard = withDrawerScreenCard(FinanceSettingsScreen);
const ProfileWithCard = withDrawerScreenCard(ProfileScreen);

/**
 * mountainbakesFinance.html — the four finance roles' app shell
 * (finance_admin/finance_manager/accountant/finance_auditor). Same slide-back
 * drawer as the Branch and Production shells (`DrawerContent`, see
 * `DrawerNavigator` for the `drawerType: 'back'` reasoning); its menu is
 * `FINANCE_NAV_ITEMS` through the role's shell. Finance Help Desk (21–22) is
 * view/report/discuss/request-reopen only, per the owner's decision — every
 * super_admin-only admin action stays web-only.
 */
export function FinanceDrawerNavigator() {
  useFinanceNavCounts();

  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false, drawerType: 'back', drawerStyle: { width: '100%', backgroundColor: 'transparent' }, overlayColor: 'transparent' }}
      drawerContent={(props) => <DrawerContent {...props} />}>
      <Drawer.Screen name={Routes.FINANCE_TABS} component={TabsWithCard} />
      <Drawer.Screen name={Routes.FINANCE_PAYROLL_STACK} component={PayrollStackWithCard} />
      <Drawer.Screen name={Routes.FINANCE_PARTNERS_STACK} component={PartnersWithCard} />
      <Drawer.Screen name={Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK} component={CompanyTransactionsWithCard} />
      <Drawer.Screen name={Routes.FINANCE_LEDGER_HEADS_STACK} component={LedgerHeadsWithCard} />
      <Drawer.Screen name={Routes.FINANCE_CLOSING_STACK} component={ClosingWithCard} />
      <Drawer.Screen name={Routes.FINANCE_REPORTS_STACK} component={ReportsWithCard} />
      <Drawer.Screen name={Routes.FINANCE_AUDIT_TRAIL_STACK} component={AuditTrailWithCard} />
      <Drawer.Screen name={Routes.FINANCE_HELP_DESK_STACK} component={HelpDeskStackWithCard} />
      <Drawer.Screen name={Routes.FINANCE_SETTINGS_STACK} component={SettingsWithCard} />
      <Drawer.Screen name={Routes.PROFILE} component={ProfileWithCard} />
    </Drawer.Navigator>
  );
}
