import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductionNewSaleScreen, ProductionSalesListScreen } from '@/features/production';
import { Routes } from '../routes';
import type { ProductionSalesStackParamList } from '../types';

const Stack = createNativeStackNavigator<ProductionSalesStackParamList>();

/** mountainbakesProduction.html screens 05/06 — the counter's own sale + sale history. */
export function ProductionSalesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.PRODUCTION_SALES_LIST} component={ProductionSalesListScreen} />
      <Stack.Screen name={Routes.PRODUCTION_NEW_SALE} component={ProductionNewSaleScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
