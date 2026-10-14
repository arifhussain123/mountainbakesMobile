import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HelpDeskListScreen } from '@/features/support';
import { Routes } from '../routes';
import type { HelpDeskStackParamList } from '../types';

const Stack = createNativeStackNavigator<HelpDeskStackParamList>();

/**
 * mountainbakesProduction.html screens 14/15 — Help Desk / New Query. Reuses the
 * Branch build's `HelpDeskListScreen` as-is: `GET/POST /support` is already scoped
 * server-side per caller (`production_user` is explicitly allowed on the POST), and
 * the reference-ID prefixes it looks up (MB-/DMD-/EXP-/STK-/CT-) are the same ones
 * Production's own sales/demands/stock use — nothing here is Branch-specific.
 */
export function ProductionHelpDeskStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.HELP_DESK} component={HelpDeskListScreen} />
    </Stack.Navigator>
  );
}
