import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceQueryViewScreen, SupportCenterScreen, SupportTicketViewScreen } from '@/features/admin';
import { Routes } from '../routes';
import type { SuperAdminSupportStackParamList } from '../types';

const Stack = createNativeStackNavigator<SuperAdminSupportStackParamList>();

/** Web `/support` — Super Admin Support Center: ops + Finance queues, then one query's read-only view. */
export function SuperAdminSupportStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.SUPER_ADMIN_SUPPORT_LIST} component={SupportCenterScreen} />
      <Stack.Screen name={Routes.SUPER_ADMIN_SUPPORT_TICKET} component={SupportTicketViewScreen} />
      <Stack.Screen name={Routes.SUPER_ADMIN_FINANCE_TICKET} component={FinanceQueryViewScreen} />
    </Stack.Navigator>
  );
}
