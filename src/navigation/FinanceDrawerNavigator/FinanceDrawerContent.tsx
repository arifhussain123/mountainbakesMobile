import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { FINANCE_ROLE_LABELS, type FinanceRole } from '@/api';
import type { IconName } from '@/shared/ui';
import { branchScopeLabel } from '@/shared/utils';
import { useAuthStore } from '@/state';
import { getFocusedChain } from '../DrawerNavigator/DrawerContent';
import { DrawerMenu, type DrawerMenuRow } from '../components/DrawerMenu';
import { Routes } from '../routes';

type FinanceNavigation = DrawerContentComponentProps['navigation'];

interface MenuItem {
  label: string;
  icon: IconName;
  section: string;
  /** A tab of `FINANCE_TABS`, or a drawer-level stack. */
  target: { tab: string } | { stack: string };
}

const MENU: MenuItem[] = [
  { label: 'Dashboard', icon: 'dashboard-grid', section: 'Main', target: { tab: Routes.FINANCE_DASHBOARD_TAB } },
  { label: 'Daily Ledger', icon: 'ledger', section: 'Main', target: { tab: Routes.FINANCE_LEDGER_TAB } },
  { label: 'Cash Transfers', icon: 'transfer', section: 'Main', target: { tab: Routes.FINANCE_CASH_TRANSFERS_TAB } },
  { label: 'Income & Expense', icon: 'trending-up', section: 'Main', target: { tab: Routes.FINANCE_INCOME_EXPENSE_TAB } },
  { label: 'Payroll', icon: 'wallet', section: 'Main', target: { stack: Routes.FINANCE_PAYROLL_STACK } },
  { label: 'Partner Transactions', icon: 'user', section: 'Main', target: { stack: Routes.FINANCE_PARTNERS_STACK } },
  { label: 'Company Transaction Details', icon: 'building', section: 'Main', target: { stack: Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK } },
  { label: 'Ledger Heads', icon: 'hash', section: 'Main', target: { stack: Routes.FINANCE_LEDGER_HEADS_STACK } },
  { label: 'Daily Closing', icon: 'calendar-check', section: 'Main', target: { stack: Routes.FINANCE_CLOSING_STACK } },
  { label: 'Reports', icon: 'bar-chart', section: 'Main', target: { stack: Routes.FINANCE_REPORTS_STACK } },
  { label: 'Audit Trail', icon: 'clock', section: 'Main', target: { stack: Routes.FINANCE_AUDIT_TRAIL_STACK } },
  { label: 'Help Desk', icon: 'headset', section: 'Support', target: { stack: Routes.FINANCE_HELP_DESK_STACK } },
  { label: 'Settings', icon: 'grid', section: 'Account', target: { stack: Routes.FINANCE_SETTINGS_STACK } },
];

function navigateTo(navigation: FinanceNavigation, target: MenuItem['target']) {
  navigation.closeDrawer();
  if ('tab' in target) navigation.navigate(Routes.FINANCE_TABS, { screen: target.tab });
  else navigation.navigate(target.stack);
}

function isActive(target: MenuItem['target'], chain: string[]): boolean {
  return 'tab' in target ? chain[0] === Routes.FINANCE_TABS && chain[1] === target.tab : chain[0] === target.stack;
}

/**
 * mountainbakesFinance.html — no drawer mockup frame exists for this role.
 * Its menu stays its own (the Finance shell has no `navItems` yet), but the
 * layout is the shared `DrawerMenu`, so it looks exactly like the Branch and
 * Production drawers.
 */
export function FinanceDrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const user = useAuthStore((s) => s.user);
  const chain = getFocusedChain(state);

  const rows: DrawerMenuRow[] = MENU.map((item) => ({
    key: item.label,
    label: item.label,
    icon: item.icon,
    section: item.section,
    active: isActive(item.target, chain),
    onPress: () => navigateTo(navigation, item.target),
  }));

  return (
    <DrawerMenu
      roleLabel={user?.role ? (FINANCE_ROLE_LABELS[user.role as FinanceRole] ?? 'Finance') : 'Finance'}
      contextLine={user ? `Finance · ${branchScopeLabel(user)}` : ''}
      rows={rows}
      closeDrawer={navigation.closeDrawer}
    />
  );
}
