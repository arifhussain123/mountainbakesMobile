import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminOrderDetailScreen, AdminOrdersScreen } from '@/features/admin';
import { Routes } from '../routes';
import type { SuperAdminOrdersStackParamList } from '../types';

const Stack = createNativeStackNavigator<SuperAdminOrdersStackParamList>();

/** Super Admin's Orders tab — the web `/orders` page (Production Orders), read-only list + slip. */
export function SuperAdminOrdersStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.SUPER_ADMIN_ORDERS_LIST} component={AdminOrdersScreen} />
      <Stack.Screen name={Routes.SUPER_ADMIN_ORDER_DETAIL} component={AdminOrderDetailScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
