import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HelpDeskListScreen } from '@/features/support';
import { Routes } from '../routes';
import type { HelpDeskStackParamList } from '../types';

const Stack = createNativeStackNavigator<HelpDeskStackParamList>();

/** "New Query" is a bottom sheet owned by HelpDeskListScreen now, not a pushed route. */
export function HelpDeskStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.HELP_DESK} component={HelpDeskListScreen} />
    </Stack.Navigator>
  );
}
