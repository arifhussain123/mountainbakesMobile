import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CashTransferDetailScreen, CashTransfersScreen } from '@/features/cash';
import { Routes } from '../routes';
import type { CashStackParamList } from '../types';

const Stack = createNativeStackNavigator<CashStackParamList>();

/** "Cash Deposit" is a bottom sheet owned by CashTransfersScreen, not a pushed route. */
export function CashStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.CASH_TRANSFERS_LIST} component={CashTransfersScreen} />
      <Stack.Screen name={Routes.CASH_TRANSFER_DETAIL} component={CashTransferDetailScreen} />
    </Stack.Navigator>
  );
}
