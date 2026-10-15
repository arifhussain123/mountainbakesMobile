import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceLedgerListScreen } from '@/features/finance';
import { Routes } from '../routes';
import type { FinanceLedgerStackParamList } from '../types';

const Stack = createNativeStackNavigator<FinanceLedgerStackParamList>();

/** mountainbakesFinance.html screen 02 — Daily Ledger (view-only this slice). */
export function FinanceLedgerStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.FINANCE_LEDGER_LIST} component={FinanceLedgerListScreen} />
    </Stack.Navigator>
  );
}
