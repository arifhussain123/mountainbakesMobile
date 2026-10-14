import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ShopExpensesListScreen } from '@/features/expenses';
import { Routes } from '../routes';
import type { ExpensesStackParamList } from '../types';

const Stack = createNativeStackNavigator<ExpensesStackParamList>();

/** "New Shop Expense" is a bottom sheet owned by ShopExpensesListScreen now, not a pushed route. */
export function ExpensesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.SHOP_EXPENSES_LIST} component={ShopExpensesListScreen} />
    </Stack.Navigator>
  );
}
