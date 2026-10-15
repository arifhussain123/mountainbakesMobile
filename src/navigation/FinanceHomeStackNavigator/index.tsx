import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceDashboardScreen } from '@/features/finance';
import { Routes } from '../routes';

const Stack = createNativeStackNavigator();

export function FinanceHomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.FINANCE_DASHBOARD} component={FinanceDashboardScreen} />
    </Stack.Navigator>
  );
}
