import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceDashboardRecordsScreen, FinanceDashboardScreen } from '@/features/finance';
import { Routes } from '../routes';
import type { FinanceHomeStackParamList } from '../types';

const Stack = createNativeStackNavigator<FinanceHomeStackParamList>();

/** Finance → Dashboard, and the source records behind any of its figures. */
export function FinanceHomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.FINANCE_DASHBOARD} component={FinanceDashboardScreen} />
      <Stack.Screen name={Routes.FINANCE_DASHBOARD_RECORDS} component={FinanceDashboardRecordsScreen} />
    </Stack.Navigator>
  );
}
