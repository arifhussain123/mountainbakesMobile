import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DiscountsListScreen } from '@/features/discounts';
import { Routes } from '../routes';
import type { DiscountsStackParamList } from '../types';

const Stack = createNativeStackNavigator<DiscountsStackParamList>();

/** "Request Discount" is a bottom sheet owned by DiscountsListScreen now, not a pushed route. */
export function DiscountsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.DISCOUNTS_LIST} component={DiscountsListScreen} />
    </Stack.Navigator>
  );
}
