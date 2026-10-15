import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ReturnStockListScreen, StockOverviewScreen } from '@/features/stock';
import { Routes } from '../routes';
import type { StockStackParamList } from '../types';

const Stack = createNativeStackNavigator<StockStackParamList>();

/** Stock Check (12) and Return Items (06) are bottom sheets owned by StockOverviewScreen now, not pushed routes. */
export function StockStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.STOCK_OVERVIEW} component={StockOverviewScreen} />
      <Stack.Screen name={Routes.RETURN_STOCK_LIST} component={ReturnStockListScreen} />
    </Stack.Navigator>
  );
}
