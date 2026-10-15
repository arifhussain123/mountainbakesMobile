import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceEmployeeDetailScreen, FinancePayrollListScreen, FinanceSalaryLedgerScreen } from '@/features/finance';
import { Routes } from '../routes';
import type { FinancePayrollStackParamList } from '../types';

const Stack = createNativeStackNavigator<FinancePayrollStackParamList>();

/** mountainbakesFinance.html screens 06–11 — Payroll, Employee (+ Resignation), Salary Ledger. */
export function FinancePayrollStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.FINANCE_PAYROLL_LIST} component={FinancePayrollListScreen} />
      <Stack.Screen name={Routes.FINANCE_EMPLOYEE_DETAIL} component={FinanceEmployeeDetailScreen} />
      <Stack.Screen name={Routes.FINANCE_SALARY_LEDGER} component={FinanceSalaryLedgerScreen} />
    </Stack.Navigator>
  );
}
