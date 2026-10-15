import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { comingSoonPane } from '@/features/placeholder';
import { Routes } from '../routes';
import type { FinanceLedgerStackParamList } from '../types';

const Stack = createNativeStackNavigator<FinanceLedgerStackParamList>();

const FinanceLedgerListScreen = comingSoonPane('Daily Ledger');

/** mountainbakesFinance.html screen 02 — next slice per docs/mobile-finance-plan.md. */
export function FinanceLedgerStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.FINANCE_LEDGER_LIST} component={FinanceLedgerListScreen} />
    </Stack.Navigator>
  );
}
