import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminDailySaleDetailScreen, AdminDailySaleScreen } from '@/features/admin';
import { Routes } from '../routes';
import type { SuperAdminDailySaleStackParamList } from '../types';

const Stack = createNativeStackNavigator<SuperAdminDailySaleStackParamList>();

/**
 * Super Admin → Daily Sale Records (web /daily-sale-records): the all-branch
 * board, then one stored record's read-only View (Summary + History). Mounted
 * by the Super Admin drawer under `Routes.SUPER_ADMIN_DAILY_SALE`.
 */
export function SuperAdminDailySaleStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.SUPER_ADMIN_DAILY_SALE_LIST} component={AdminDailySaleScreen} />
      <Stack.Screen name={Routes.SUPER_ADMIN_DAILY_SALE_DETAIL} component={AdminDailySaleDetailScreen} />
    </Stack.Navigator>
  );
}
