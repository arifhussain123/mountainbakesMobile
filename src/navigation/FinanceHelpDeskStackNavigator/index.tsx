import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceHelpDeskListScreen, FinanceTicketDetailScreen } from '@/features/finance';
import { Routes } from '../routes';
import type { FinanceHelpDeskStackParamList } from '../types';

const Stack = createNativeStackNavigator<FinanceHelpDeskStackParamList>();

/**
 * mountainbakesFinance.html screens 21–22 — Finance Help Desk / New Query.
 * View/report/discuss/request-reopen only — every super_admin-only admin
 * action stays web-only, per an explicit decision this session.
 */
export function FinanceHelpDeskStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.FINANCE_HELP_DESK_LIST} component={FinanceHelpDeskListScreen} />
      <Stack.Screen name={Routes.FINANCE_TICKET_DETAIL} component={FinanceTicketDetailScreen} />
    </Stack.Navigator>
  );
}
