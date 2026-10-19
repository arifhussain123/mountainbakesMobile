import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PriceHistoryScreen, ProductPriceHistoryScreen } from '@/features/catalog';
import { Routes } from '../routes';
import type { PriceHistoryStackParamList } from '../types';

const Stack = createNativeStackNavigator<PriceHistoryStackParamList>();

/**
 * Super Admin's Price History (read-only): the list, and one product's price
 * timeline. Mounted by the Super Admin shell once super_admin has one — today
 * it gets the "not built for this role" screen (see `roleShells.ts`).
 */
export function PriceHistoryStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.PRICE_HISTORY_LIST} component={PriceHistoryScreen} />
      <Stack.Screen name={Routes.PRICE_HISTORY_PRODUCT} component={ProductPriceHistoryScreen} />
    </Stack.Navigator>
  );
}
