import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DiscountDetailScreen, DiscountsListScreen } from '@/features/discounts';
import { Routes } from '../routes';
import type { DiscountsStackParamList } from '../types';

const Stack = createNativeStackNavigator<DiscountsStackParamList>();

/** "Request Discount"/"Change"/"Correct" are bottom sheets owned by their screens, not pushed routes. */
export function DiscountsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.DISCOUNTS_LIST} component={DiscountsListScreen} />
      <Stack.Screen name={Routes.DISCOUNT_DETAIL} component={DiscountDetailScreen} />
    </Stack.Navigator>
  );
}
