import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminSettingsScreen, RestrictionRulesScreen } from '@/features/admin';
import { Routes } from '../routes';
import type { SuperAdminSettingsStackParamList } from '../types';

const Stack = createNativeStackNavigator<SuperAdminSettingsStackParamList>();

/**
 * Super Admin's Settings (web /settings) and its Restriction Rules page (web
 * /settings/restriction-rules), reached from the card at the top of Settings.
 * Mounted by the Super Admin drawer at `Routes.SUPER_ADMIN_SETTINGS`.
 */
export function SuperAdminSettingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.SUPER_ADMIN_SETTINGS_HOME} component={AdminSettingsScreen} />
      <Stack.Screen name={Routes.SUPER_ADMIN_RESTRICTION_RULES} component={RestrictionRulesScreen} />
    </Stack.Navigator>
  );
}
