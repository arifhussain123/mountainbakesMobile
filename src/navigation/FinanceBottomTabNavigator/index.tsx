import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { comingSoonPane } from '@/features/placeholder';
import { NoopScreen } from '../BottomTabNavigator/NoopScreen';
import { FinanceHomeStackNavigator } from '../FinanceHomeStackNavigator';
import { FinanceLedgerStackNavigator } from '../FinanceLedgerStackNavigator';
import { Routes } from '../routes';
import type { FinanceBottomTabParamList } from '../types';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';

const Tab = createBottomTabNavigator<FinanceBottomTabParamList>();

const FinanceCashTransfersScreen = comingSoonPane('Cash Transfers');
const FinanceIncomeExpenseScreen = comingSoonPane('Income & Expense');

const TAB_ICON: Record<string, IconName> = {
  [Routes.FINANCE_DASHBOARD_TAB]: 'menu',
  [Routes.FINANCE_LEDGER_TAB]: 'box',
  [Routes.FINANCE_CASH_TRANSFERS_TAB]: 'check',
  [Routes.FINANCE_INCOME_EXPENSE_TAB]: 'search',
  [Routes.FINANCE_MORE_TAB]: 'menu',
};

/** The `production_user` shell's own tab shape (Dashboard/Orders/Sales/Stock/More), mirrored for Finance's own daily screens. */
export function FinanceBottomTabNavigator() {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => <Icon name={TAB_ICON[route.name] ?? 'menu'} color={color} size={size} />,
      })}>
      <Tab.Screen name={Routes.FINANCE_DASHBOARD_TAB} component={FinanceHomeStackNavigator} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={Routes.FINANCE_LEDGER_TAB} component={FinanceLedgerStackNavigator} options={{ title: 'Ledger' }} />
      <Tab.Screen name={Routes.FINANCE_CASH_TRANSFERS_TAB} component={FinanceCashTransfersScreen} options={{ title: 'Cash Transfers' }} />
      <Tab.Screen name={Routes.FINANCE_INCOME_EXPENSE_TAB} component={FinanceIncomeExpenseScreen} options={{ title: 'Income' }} />
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
