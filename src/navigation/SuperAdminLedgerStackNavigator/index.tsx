import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminDailyLedgerScreen } from '@/features/admin';
import { Routes } from '../routes';
import type { SuperAdminLedgerStackParamList } from '../types';

const Stack = createNativeStackNavigator<SuperAdminLedgerStackParamList>();

/** Super Admin — web "/finance-ledger" Daily Ledger, read-only. */
export function SuperAdminLedgerStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.SUPER_ADMIN_LEDGER_LIST} component={AdminDailyLedgerScreen} />
    </Stack.Navigator>
  );
}
