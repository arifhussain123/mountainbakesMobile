import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ProductionBranchStockScreen,
  ProductionPreparedProductsScreen,
  ProductionStockAdjustmentScreen,
  ProductionStockOverviewScreen,
} from '@/features/production';
import { Routes } from '../routes';
import type { ProductionStockStackParamList } from '../types';

const Stack = createNativeStackNavigator<ProductionStockStackParamList>();

/** mountainbakesProduction.html screens 07/08 — the central pool and its own prepare/adjustment actions. */
export function ProductionStockStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.PRODUCTION_STOCK_OVERVIEW} component={ProductionStockOverviewScreen} />
      <Stack.Screen name={Routes.PRODUCTION_PREPARED_PRODUCTS} component={ProductionPreparedProductsScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name={Routes.PRODUCTION_STOCK_ADJUSTMENT} component={ProductionStockAdjustmentScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name={Routes.PRODUCTION_BRANCH_STOCK} component={ProductionBranchStockScreen} />
    </Stack.Navigator>
  );
}
