import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SpecialEventDetailAdminScreen, SpecialEventsAdminScreen } from '@/features/admin';
import { Routes } from '../routes';
import type { SuperAdminEventsStackParamList } from '../types';

const Stack = createNativeStackNavigator<SuperAdminEventsStackParamList>();

/** Web /special-events + /special-events/[id] for Super Admin (read-only this phase). */
export function SuperAdminEventsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.SUPER_ADMIN_EVENTS_LIST} component={SpecialEventsAdminScreen} />
      <Stack.Screen name={Routes.SUPER_ADMIN_EVENT_DETAIL} component={SpecialEventDetailAdminScreen} />
    </Stack.Navigator>
  );
}
