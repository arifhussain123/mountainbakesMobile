import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrdersListScreen } from '@/features/orders';
import { Routes } from '../routes';
import type { OrdersStackParamList } from '../types';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

/** "Create Order" is a bottom sheet owned by OrdersListScreen now, not a pushed route. */
export function OrdersStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.ORDERS_LIST} component={OrdersListScreen} />
    </Stack.Navigator>
  );
}
