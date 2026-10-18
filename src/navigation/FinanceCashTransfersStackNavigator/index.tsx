import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceCashTransferDetailScreen, FinanceCashTransfersListScreen } from '@/features/finance';
import { Routes } from '../routes';
import type { FinanceCashTransfersStackParamList } from '../types';

const Stack = createNativeStackNavigator<FinanceCashTransfersStackParamList>();

/** mountainbakesFinance.html screen 03 — Cash Transfers. */
export function FinanceCashTransfersStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.FINANCE_CASH_TRANSFERS_LIST} component={FinanceCashTransfersListScreen} />
      <Stack.Screen name={Routes.FINANCE_CASH_TRANSFER_DETAIL} component={FinanceCashTransferDetailScreen} />
    </Stack.Navigator>
  );
}
