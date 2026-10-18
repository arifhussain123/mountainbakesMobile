import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { FinanceIncomeExpenseListScreen } from '@/features/finance';
import { NoopScreen } from '../BottomTabNavigator/NoopScreen';
import { FinanceCashTransfersStackNavigator } from '../FinanceCashTransfersStackNavigator';
import { FinanceHomeStackNavigator } from '../FinanceHomeStackNavigator';
import { FinanceLedgerStackNavigator } from '../FinanceLedgerStackNavigator';
import { Routes } from '../routes';
import { NotchTabBar } from '../tabBar/NotchTabBar';
import type { FinanceBottomTabParamList } from '../types';

const Tab = createBottomTabNavigator<FinanceBottomTabParamList>();

/**
 * Finance's tabs — Dashboard, Ledger, Transfers, Reports, More — on the same
 * `NotchTabBar` as the Branch shell. Icons, labels and badges are
 * `FINANCE_TAB_ITEMS` (`tabItems.ts`); this only maps each route to its stack.
 * Like the Branch shell, the bar is an absolute overlay, so each tab-root
 * screen pads its own scroll content by `useTabBarHeight()`.
 */
export function FinanceBottomTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <NotchTabBar {...props} />}>
      <Tab.Screen name={Routes.FINANCE_DASHBOARD_TAB} component={FinanceHomeStackNavigator} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={Routes.FINANCE_LEDGER_TAB} component={FinanceLedgerStackNavigator} options={{ title: 'Ledger' }} />
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
