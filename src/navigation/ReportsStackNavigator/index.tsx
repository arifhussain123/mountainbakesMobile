import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ReportsScreen } from '@/features/reports';
import { Routes } from '../routes';
import type { ReportsStackParamList } from '../types';

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export function ReportsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.REPORTS} component={ReportsScreen} />
    </Stack.Navigator>
  );
}
