import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ReturnStockListScreen, StockCheckScreen, StockScreen } from '@/features/stock';
import { Routes } from '../routes';
import type { StockStackParamList } from '../types';

const Stack = createNativeStackNavigator<StockStackParamList>();

/** Return Items (06) is a bottom sheet owned by StockScreen; Stock Check (12) is now a pushed full screen. */
export function StockStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.STOCK_OVERVIEW} component={StockScreen} />
      <Stack.Screen name={Routes.STOCK_CHECK} component={StockCheckScreen} />
      <Stack.Screen name={Routes.RETURN_STOCK_LIST} component={ReturnStockListScreen} />
    </Stack.Navigator>
  );
}
