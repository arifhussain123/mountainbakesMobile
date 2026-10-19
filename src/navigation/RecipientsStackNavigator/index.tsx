import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DeliveryLogScreen, NotificationRecipientsScreen } from '@/features/recipients';
import { Routes } from '../routes';
import type { RecipientsStackParamList } from '../types';

const Stack = createNativeStackNavigator<RecipientsStackParamList>();

/**
 * Super Admin's closing-summary recipients and their delivery log. Mounted by
 * the Super Admin shell once super_admin has one (see `roleShells.ts`).
 */
export function RecipientsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.RECIPIENTS_LIST} component={NotificationRecipientsScreen} />
      <Stack.Screen name={Routes.RECIPIENTS_DELIVERY_LOG} component={DeliveryLogScreen} />
    </Stack.Navigator>
  );
}
