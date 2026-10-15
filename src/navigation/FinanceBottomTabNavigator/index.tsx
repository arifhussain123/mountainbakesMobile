import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { FinanceIncomeExpenseListScreen } from '@/features/finance';
import { NoopScreen } from '../BottomTabNavigator/NoopScreen';
import { FinanceCashTransfersStackNavigator } from '../FinanceCashTransfersStackNavigator';
import { FinanceHomeStackNavigator } from '../FinanceHomeStackNavigator';
import { FinanceLedgerStackNavigator } from '../FinanceLedgerStackNavigator';
import { Routes } from '../routes';
import { tabBarScreenOptions } from '../tabBarScreenOptions';
import type { FinanceBottomTabParamList } from '../types';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';

const Tab = createBottomTabNavigator<FinanceBottomTabParamList>();

// Dashboard/Ledger/Transfers/Reports/More, matching the reference screenshot
// exactly (grid / document / swap-arrows / bar-chart / hamburger).
const TAB_ICON: Record<string, IconName> = {
  [Routes.FINANCE_DASHBOARD_TAB]: 'dashboard-grid',
  [Routes.FINANCE_LEDGER_TAB]: 'ledger',
  [Routes.FINANCE_CASH_TRANSFERS_TAB]: 'transfer',
  [Routes.FINANCE_INCOME_EXPENSE_TAB]: 'bar-chart',
  [Routes.FINANCE_MORE_TAB]: 'more',
};

/** The `production_user` shell's own tab shape (Dashboard/Orders/Sales/Stock/More), mirrored for Finance's own daily screens. */
export function FinanceBottomTabNavigator() {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBarScreenOptions(theme),
        tabBarIcon: ({ color, size }: { color: string; size: number }) => <Icon name={TAB_ICON[route.name] ?? 'dashboard-grid'} color={color} size={size} />,
      })}>
      <Tab.Screen name={Routes.FINANCE_DASHBOARD_TAB} component={FinanceHomeStackNavigator} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={Routes.FINANCE_LEDGER_TAB} component={FinanceLedgerStackNavigator} options={{ title: 'Ledger' }} />
      {/* Tab label only — matches the reference screenshot's "Transfers"/"Reports" text; the routes/screens underneath are unchanged. */}
      <Tab.Screen name={Routes.FINANCE_CASH_TRANSFERS_TAB} component={FinanceCashTransfersStackNavigator} options={{ title: 'Transfers' }} />
      <Tab.Screen name={Routes.FINANCE_INCOME_EXPENSE_TAB} component={FinanceIncomeExpenseListScreen} options={{ title: 'Reports' }} />
      <Tab.Screen
        name={Routes.FINANCE_MORE_TAB}
        component={NoopScreen}
        options={{ title: 'More' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.getParent()?.dispatch(DrawerActions.openDrawer());
          },
        })}
      />
    </Tab.Navigator>
  );
}
