import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductionDiscountDetailScreen, ProductionDiscountsListScreen } from '@/features/production';
import { Routes } from '../routes';
import type { ProductionDiscountsStackParamList } from '../types';

const Stack = createNativeStackNavigator<ProductionDiscountsStackParamList>();

/** mountainbakesProduction.html screen 11 — Discounts: Production's review board for branch claims. */
export function ProductionDiscountsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.PRODUCTION_DISCOUNTS_LIST} component={ProductionDiscountsListScreen} />
      <Stack.Screen name={Routes.PRODUCTION_DISCOUNT_DETAIL} component={ProductionDiscountDetailScreen} />
    </Stack.Navigator>
  );
}
