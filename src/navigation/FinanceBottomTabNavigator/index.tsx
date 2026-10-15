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

// Same glass tab bar and "Home"/"More" icons as the Branch/Production shells
// (mountainbakesBranch.html design line ~1273); Ledger/Cash Transfers/Income
// have no equivalent there, so they keep the closest existing icons instead
// of inventing new ones the design never specifies.
const TAB_ICON: Record<string, IconName> = {
  [Routes.FINANCE_DASHBOARD_TAB]: 'home',
  [Routes.FINANCE_LEDGER_TAB]: 'file-spreadsheet',
  [Routes.FINANCE_CASH_TRANSFERS_TAB]: 'wallet',
  [Routes.FINANCE_INCOME_EXPENSE_TAB]: 'sales',
  [Routes.FINANCE_MORE_TAB]: 'more',
};

/** The `production_user` shell's own tab shape (Dashboard/Orders/Sales/Stock/More), mirrored for Finance's own daily screens. */
export function FinanceBottomTabNavigator() {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBarScreenOptions(theme),
        tabBarIcon: ({ color, size }: { color: string; size: number }) => <Icon name={TAB_ICON[route.name] ?? 'home'} color={color} size={size} />,
      })}>
      <Tab.Screen name={Routes.FINANCE_DASHBOARD_TAB} component={FinanceHomeStackNavigator} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={Routes.FINANCE_LEDGER_TAB} component={FinanceLedgerStackNavigator} options={{ title: 'Ledger' }} />
      <Tab.Screen name={Routes.FINANCE_CASH_TRANSFERS_TAB} component={FinanceCashTransfersStackNavigator} options={{ title: 'Cash Transfers' }} />
      <Tab.Screen name={Routes.FINANCE_INCOME_EXPENSE_TAB} component={FinanceIncomeExpenseListScreen} options={{ title: 'Income' }} />
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
